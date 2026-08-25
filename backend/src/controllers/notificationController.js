const { validationResult } = require("express-validator");
const Notification = require("../models/Notification");
const Company = require("../models/Company");
const DeviceToken = require("../models/DeviceToken");
const { sendPushNotification } = require("../services/firebaseService");

const createNotification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { title, body, type, data, userId, companyId: bodyCompanyId } = req.body;

    const companyId =
      req.user.role === "SuperAdmin"
        ? bodyCompanyId || req.user.companyId
        : req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "CompanyId is required",
      });
    }

    if (
      req.user.role !== "SuperAdmin" &&
      bodyCompanyId &&
      bodyCompanyId !== req.user.companyId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Cannot create notifications for another company",
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const notification = await Notification.create({
      title,
      body,
      type,
      data: data || {},
      userId,
      companyId,
    });

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    next(error);
  }
};

const getMyNotifications = async (req, res, next) => {
  try {
    const userIds = [req.user._id];
    if (req.user.employeeId) userIds.push(req.user.employeeId);

    const notifications = await Notification.find({ userId: { $in: userIds } })
      .sort({ createdAt: -1 })
      .lean();

    const unreadCount = notifications.filter((item) => !item.isRead).length;
    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const userIds = [req.user._id.toString()];
    if (req.user.employeeId) userIds.push(req.user.employeeId.toString());

    if (
      req.user.role !== "SuperAdmin" &&
      !userIds.includes(notification.userId.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this notification",
      });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const userIds = [req.user._id];
    if (req.user.employeeId) userIds.push(req.user.employeeId);

    const result = await Notification.updateMany(
      { userId: { $in: userIds }, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      message: "Notifications marked as read",
      updatedCount: result.modifiedCount || result.nModified || 0,
    });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const userIds = [req.user._id.toString()];
    if (req.user.employeeId) userIds.push(req.user.employeeId.toString());

    if (
      req.user.role !== "SuperAdmin" &&
      !userIds.includes(notification.userId.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this notification",
      });
    }

    await notification.deleteOne();
    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const saveDeviceToken = async (req, res, next) => {
  try {
    const { fcmToken, platform, deviceId } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    // Check if token exists
    let deviceToken = await DeviceToken.findOne({ fcmToken });

    if (deviceToken) {
      // Update existing token
      deviceToken.userId = req.user._id;
      deviceToken.companyId = req.user.companyId;
      deviceToken.isActive = true;
      if (req.user.employeeId) {
        deviceToken.employeeId = req.user.employeeId;
      }
      deviceToken.platform = platform || deviceToken.platform;
      if (deviceId) deviceToken.deviceId = deviceId;
      await deviceToken.save();
    } else {
      // Create new token
      deviceToken = await DeviceToken.create({
        userId: req.user._id,
        companyId: req.user.companyId,
        employeeId: req.user.employeeId,
        fcmToken,
        platform: platform || "unknown",
        deviceId: deviceId || null,
      });
    }

    res.json({
      success: true,
      message: "Device token saved successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  saveDeviceToken,
};
