const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: false,
            default: null,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, "Notification title is required"],
            trim: true,
        },
        body: {
            type: String,
            required: [true, "Notification body is required"],
            trim: true,
        },
        type: {
            type: String,
            enum: [
                "attendance",
                "leave",
                "payroll",
                "task",
                "task_update",
                "task_template",
                "announcement",
                "project",
                "system",
                "request",
                "lead",
                "lead_assigned",
                "lead_status",
                "lead_follow_up",
                "lead_created",
                "lead_note",
                "subscription",
                "subscription_expiry",
                "subscription_renewed"
            ],
            default: "system",
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        idempotencyKey: {
            type: String,
            index: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
);

notificationSchema.index({ companyId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

const DeviceToken = require("./DeviceToken");
const { sendPushNotification } = require("../services/firebaseService");

/**
 * Universal Deduplicated Notification Creation Engine
 * Guarantees exactly ONE notification per user per event.
 */
notificationSchema.statics.createDeduplicated = async function ({
    companyId,
    userId,
    title,
    body,
    type = "system",
    data = {},
    idempotencyKey = null,
    dedupWindowSeconds = 30,
}) {
    if (!userId) return null;
    const cleanUserId = (userId._id || userId).toString();
    const cleanTitle = (title || "").trim();
    const cleanBody = (body || "").trim();

    // 1. If explicit idempotencyKey provided, check for existing document
    if (idempotencyKey) {
        const existing = await this.findOne({ idempotencyKey }).lean();
        if (existing) {
            return existing;
        }
    }

    // 2. Debounce window check for identical recipient + type + title + target entity
    const targetEntityId = String(
        data?.taskId || data?.leadId || data?.attendanceId || data?.templateId || data?.id || ""
    );
    const cutoffTime = new Date(Date.now() - dedupWindowSeconds * 1000);

    const dupQuery = {
        userId: cleanUserId,
        type,
        title: cleanTitle,
        createdAt: { $gte: cutoffTime }
    };

    if (targetEntityId) {
        dupQuery.$or = [
            { "data.taskId": targetEntityId },
            { "data.leadId": targetEntityId },
            { "data.attendanceId": targetEntityId },
            { "data.templateId": targetEntityId },
            { "data.id": targetEntityId }
        ];
    }

    const recentDuplicate = await this.findOne(dupQuery).lean();
    if (recentDuplicate) {
        return recentDuplicate;
    }

    // 3. Fallback auto idempotency key if not explicitly given (scoped to debounce window)
    const timeWindow = Math.floor(Date.now() / (dedupWindowSeconds * 1000));
    const autoKey = targetEntityId ? `${type}_${targetEntityId}_${cleanUserId}_${timeWindow}` : undefined;
    const finalIdempotencyKey = idempotencyKey || autoKey;

    if (finalIdempotencyKey) {
        const existingWithKey = await this.findOne({ idempotencyKey: finalIdempotencyKey }).lean();
        if (existingWithKey) {
            return existingWithKey;
        }
    }

    return await this.create({
        companyId: companyId || null,
        userId: cleanUserId,
        title: cleanTitle,
        body: cleanBody,
        type,
        data,
        idempotencyKey: finalIdempotencyKey || undefined
    });
};

notificationSchema.pre("save", function () {
    this._wasNew = this.isNew;
});

notificationSchema.post("save", async function (doc) {
    try {
        // Robust check for new document insertion
        const isNewDoc =
            this._wasNew ||
            this.$wasNew ||
            this.wasNew ||
            doc._wasNew ||
            doc.$wasNew ||
            doc.wasNew ||
            (doc.createdAt &&
                doc.updatedAt &&
                Math.abs(doc.createdAt.getTime() - doc.updatedAt.getTime()) < 1500);

        if (isNewDoc) {
            // 1. Emit Socket.io event strictly to recipient's room
            try {
                const socketHelper = require("../socket");
                const io = socketHelper.getIO();
                if (io && doc.userId) {
                    const uIdStr = doc.userId.toString();
                    io.to(uIdStr).emit("new_notification", doc);
                    io.to(uIdStr).emit("notification:received", doc);
                }
            } catch (sockErr) {
                // Socket not initialized or not connected yet
            }

            // 2. Send FCM Mobile Push Notification (Tokens strictly deduplicated)
            const recipientIdStr = (doc.userId || "").toString();
            const candidateIds = new Set();
            if (recipientIdStr) candidateIds.add(recipientIdStr);

            try {
                const User = require("./User");
                const Employee = require("./Employee");
                const u = await User.findById(doc.userId).select("_id").lean();
                if (u) {
                    candidateIds.add(u._id.toString());
                    const emp = await Employee.findOne({ userId: u._id }).select("_id").lean();
                    if (emp) candidateIds.add(emp._id.toString());
                } else {
                    const emp = await Employee.findById(doc.userId).select("userId").lean();
                    if (emp) {
                        candidateIds.add(emp._id.toString());
                        if (emp.userId) candidateIds.add((emp.userId._id || emp.userId).toString());
                    }
                }
            } catch (_) {}

            const candidateList = [...candidateIds];

            // Strictly query active tokens that belong to this intended recipient user or employee
            const deviceTokens = await DeviceToken.find({
                $or: [
                    { userId: { $in: candidateList } },
                    { employeeId: { $in: candidateList } }
                ],
                isActive: true
            }).sort({ updatedAt: -1 }).lean();

            // Strict deduplication: exactly 1 copy per physical device token
            const seenTokens = new Set();
            const uniqueTokens = [];
            for (const dt of deviceTokens) {
                if (!dt.fcmToken) continue;
                const tokenStr = dt.fcmToken.trim();
                if (!seenTokens.has(tokenStr)) {
                    seenTokens.add(tokenStr);
                    uniqueTokens.push(tokenStr);
                }
            }

            if (uniqueTokens.length > 0) {
                console.log(`[FCM Push] Dispatching "${doc.title}" to ${uniqueTokens.length} active device(s) for user/employee ${recipientIdStr}`);
                sendPushNotification(uniqueTokens, doc.title, doc.body, {
                    type: doc.type || "system",
                    ...(doc.data || {}),
                    notificationId: doc._id.toString(),
                }).catch(err => console.error("Background FCM Error:", err));
            } else {
                console.log(`[FCM Push] No active device tokens found for recipient ${recipientIdStr}`);
            }
        }
    } catch (error) {
        console.error("Error in Notification post-save hook:", error);
    }
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
