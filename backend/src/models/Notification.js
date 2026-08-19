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
                "company_request",
                "lead",
                "lead_assigned",
                "lead_status"
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

notificationSchema.post("save", async function (doc) {
    try {
        // Only send notification if it's newly created (handling Mongoose post-save hook state)
        const isNewDoc = this.$wasNew || this.wasNew || doc.$wasNew || doc.wasNew || 
                         (doc.createdAt && doc.updatedAt && doc.createdAt.getTime() === doc.updatedAt.getTime());
        if (isNewDoc) {
            const deviceTokens = await DeviceToken.find({ userId: doc.userId, isActive: true });
            if (deviceTokens.length > 0) {
                const tokens = deviceTokens.map((dt) => dt.fcmToken);
                // Fire and forget the push notification so it doesn't block the API response
                sendPushNotification(tokens, doc.title, doc.body, {
                    type: doc.type || "system",
                    ...(doc.data || {}),
                }).catch(err => console.error("Background FCM Error:", err));
            }
        }
    } catch (error) {
        console.error("Error in Notification post-save hook:", error);
    }
});

notificationSchema.index({ companyId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
