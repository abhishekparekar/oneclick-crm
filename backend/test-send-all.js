const mongoose = require('mongoose');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const serviceAccount = require('./firebase-admin.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function sendTest() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const DeviceToken = mongoose.model('DeviceToken', new mongoose.Schema({}, { strict: false }));
  const Notification = mongoose.model('Notification', new mongoose.Schema({
    title: String,
    body: String,
    type: String,
    data: Object,
    userId: mongoose.Schema.Types.ObjectId,
    companyId: mongoose.Schema.Types.ObjectId,
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }, { strict: false }));

  const tokensDocs = await DeviceToken.find({ isActive: true }).lean();
  console.log(`Found ${tokensDocs.length} active device tokens`);

  const uniqueTokens = [...new Set(tokensDocs.map(t => t.fcmToken).filter(Boolean))];
  console.log(`Unique FCM Tokens: ${uniqueTokens.length}`);

  // 1. Send FCM Push Notification with custom chime sound
  const message = {
    notification: {
      title: "🔔 HRMS Unique Sound Test",
      body: "Testing HRMS alert tone! Distinctive chime is active on your device."
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'notice11',
        channelId: 'notice11-sound',
        priority: 'max',
        defaultVibrateTimings: true,
      }
    },
    data: {
      type: "TEST_NOTIFICATION",
      timestamp: String(Date.now()),
      screen: "Notifications"
    },
    tokens: uniqueTokens
  };

  if (uniqueTokens.length > 0) {
    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✓ FCM Push Sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          console.log(`Token ${idx} error:`, res.error?.code || res.error?.message);
        }
      });
    } catch (err) {
      console.error("FCM Send Error:", err);
    }
  }

  // 2. Also insert in-app notification for all users who have tokens so Web Portal also sees it
  const userIds = [...new Set(tokensDocs.map(t => t.userId).filter(Boolean))];
  for (const uid of userIds) {
    const userDoc = tokensDocs.find(t => t.userId?.toString() === uid.toString());
    await Notification.create({
      title: "🔔 HRMS Sound Test",
      body: "This is a live test notification with the unique audio chime enabled!",
      type: "SYSTEM_TEST",
      data: { test: true },
      userId: uid,
      companyId: userDoc?.companyId,
      isRead: false
    });
  }
  console.log(`✓ Inserted in-app notifications for ${userIds.length} users.`);

  process.exit(0);
}

sendTest().catch(err => {
  console.error(err);
  process.exit(1);
});
