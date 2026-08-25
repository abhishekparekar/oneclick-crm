const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
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
                "lead_note"
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
    },
    {
        timestamps: true,
    }
);

const DeviceToken = require("./DeviceToken");
const { sendPushNotification } = require("../services/firebaseService");

notificationSchema.pre("save", function (next) {
    this._wasNew = this.isNew;
    next();
});

notificationSchema.post("save", async function (doc) {
    try {
        // Robust check for new document insertion
        const isNewDoc = this._wasNew || this.$wasNew || this.wasNew || doc._wasNew || doc.$wasNew || doc.wasNew ||
                         (doc.createdAt && doc.updatedAt && Math.abs(doc.createdAt.getTime() - doc.updatedAt.getTime()) < 1500);
        if (isNewDoc) {
            // 1. Emit Socket.io event for instant in-app notification update
            try {
                const socketHelper = require("../socket");
                const io = socketHelper.getIO();
                if (io && doc.userId) {
                    const uIdStr = doc.userId.toString();
                    io.to(uIdStr).emit("notification:received", doc);
                    io.to(uIdStr).emit("new_notification", doc);
                    io.emit(`notification:${uIdStr}`, doc);
                }
            } catch (sockErr) {
                // Socket not initialized or not connected yet
            }

            // 2. Send FCM Mobile Push Notification
            const deviceTokens = await DeviceToken.find({ userId: doc.userId, isActive: true });
            if (deviceTokens.length > 0) {
                const tokens = deviceTokens.map((dt) => dt.fcmToken).filter(Boolean);
                if (tokens.length > 0) {
                    sendPushNotification(tokens, doc.title, doc.body, {
                        type: doc.type || "system",
                        ...(doc.data || {}),
                    }).catch(err => console.error("Background FCM Error:", err));
                }
            }
        }
    } catch (error) {
        console.error("Error in Notification post-save hook:", error);
    }
});

notificationSchema.index({ companyId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
