const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
        },
        message: {
            type: String,
            required: [true, "Message is required"],
            trim: true,
        },
        targetType: {
            type: String,
            required: true,
        },
        targetCompanies: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Company",
            },
        ],
        targetRoles: [
            {
                type: String,
            },
        ],
        targetUsers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        channels: [
            {
                type: String,
                enum: ["in_app", "push_notification", "email"],
            }
        ],
        scheduledAt: {
            type: Date,
        },
        type: { type: String, enum: ['info', 'warning', 'success', 'urgent'], default: 'info' },
        status: {
            type: String,
            enum: ["draft", "scheduled", "published", "cancelled"],
            default: "draft",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Announcement = mongoose.model("Announcement", announcementSchema);

module.exports = Announcement;
