const Notification = require("../models/Notification");

// GET /api/notifications/my
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { type } = req.query;

    const filter = {
      userId,
      companyId: req.companyId,
    };

    if (type) {
      filter.type = type;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId,
      companyId: req.companyId,
      isRead: false,
    });

    res.json({
      success: true,
      unreadCount,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/:id/read
const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
        companyId: req.companyId,
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, message: "Notification marked as read", notification });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/read-all
const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        userId: req.user._id,
        companyId: req.companyId,
        isRead: false,
      },
      { isRead: true }
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
