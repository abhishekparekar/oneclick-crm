const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

const fs = require("fs");

// Initialize Firebase Admin
try {
  let serviceAccount = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (_) {}
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const fullPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(fullPath)) {
      serviceAccount = require(fullPath);
    }
  }

  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } catch (_) {}
  }

  if (!serviceAccount) {
    try {
      const b64 = require("../config/firebaseAccountBase64");
      if (b64) {
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }
    } catch (_) {}
  }

  if (!serviceAccount) {
    const defaultPaths = [
      path.resolve(process.cwd(), "firebase-admin.json"),
      path.resolve(__dirname, "../../firebase-admin.json"),
    ];
    for (const p of defaultPaths) {
      if (fs.existsSync(p)) {
        try {
          serviceAccount = require(p);
          break;
        } catch (_) {}
      }
    }
  }

  if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "conpany-1dffc.firebasestorage.app",
    });
    console.log("✓ Firebase Admin initialized successfully for project:", serviceAccount.project_id);
  } else if (!admin.apps.length) {
    console.warn("FIREBASE_SERVICE_ACCOUNT config is missing. Push notifications will NOT work.");
  }
} catch (error) {
  console.error("Error initializing Firebase Admin:", error.message);
}

/**
 * Send a push notification using Firebase Cloud Messaging
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 * @returns {Promise<object>} - FCM response
 */
const recentPushCache = new Map(); // cacheKey -> timestamp

const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!admin.apps.length) {
    console.warn("Firebase Admin not initialized. Skipping push notification.");
    return null;
  }

  const rawTokens = [...new Set((Array.isArray(tokens) ? tokens : [tokens]).filter(Boolean))];
  if (rawTokens.length === 0) {
    return null;
  }

  const now = Date.now();
  const cleanTitle = (title || '').trim();
  const cleanBody = (body || '').trim();

  // Deduplicate against duplicate delivery to the same token within 5 seconds
  const uniqueTokens = [];
  for (const t of rawTokens) {
    const cacheKey = `${t}_${cleanTitle}_${cleanBody}`;
    const lastSent = recentPushCache.get(cacheKey);
    if (lastSent && now - lastSent < 5000) {
      console.log(`[FCM] Debouncing duplicate push notification to token ${t.slice(0, 15)}... within 5s`);
      continue;
    }
    recentPushCache.set(cacheKey, now);
    uniqueTokens.push(t);
  }

  // Periodic cleanup of cache
  if (recentPushCache.size > 2000) {
    for (const [key, time] of recentPushCache.entries()) {
      if (now - time > 15000) recentPushCache.delete(key);
    }
  }

  if (uniqueTokens.length === 0) {
    return null;
  }

  // FCM data payload only accepts string values, so we stringify complex objects if needed
  // However, it's better to keep it flat. Let's ensure data is an object with string values.
  const stringifiedData = {};
  if (data) {
    for (const key in data) {
      if (typeof data[key] === 'object') {
        stringifiedData[key] = JSON.stringify(data[key]);
      } else {
        stringifiedData[key] = String(data[key]);
      }
    }
  }

  const notifId = String(data?.notificationId || `hrms_${Date.now()}_${Math.floor(Math.random() * 100000)}`);

  const message = {
    notification: {
      title,
      body,
    },
    android: {
      priority: 'high',
      notification: {
        title,
        body,
        sound: 'mixkit_bell_notification_933',
        channelId: 'oneclick_alerts_v8',
        priority: 'high',
        defaultVibrateTimings: true,
        icon: 'ic_notification',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'mixkit_bell_notification_933.wav',
          badge: 1,
        },
      },
    },
    data: {
      ...stringifiedData,
      title: String(title || ''),
      body: String(body || ''),
      notificationId: notifId,
    },
    tokens: uniqueTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    if (response.failureCount > 0) {
      const staleTokens = [];
      const otherErrors = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code || resp.error?.errorInfo?.code;
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-registration-token'
          ) {
            staleTokens.push(uniqueTokens[idx]);
          } else {
            otherErrors.push({ token: uniqueTokens[idx], error: resp.error?.message || resp.error });
          }
        }
      });

      if (staleTokens.length > 0) {
        console.warn(`[FCM] Automatically deactivating ${staleTokens.length} stale/unregistered token(s) from database.`);
        try {
          const DeviceToken = require("../models/DeviceToken");
          await DeviceToken.updateMany(
            { fcmToken: { $in: staleTokens } },
            { isActive: false }
          );
        } catch (cleanupErr) {
          console.error("[FCM] Failed to deactivate stale device tokens:", cleanupErr.message);
        }
      }

      if (otherErrors.length > 0) {
        console.error(`[FCM] ${otherErrors.length} notification send error(s):`, otherErrors);
      }
    }
    return response;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return null;
  }
};

const uploadFileToFirebase = async (fileBuffer, originalName, folder = "attachments") => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin not initialized.");
  }

  const bucket = admin.storage().bucket();
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const ext = originalName.split('.').pop();
  const fileName = `${folder}/${uniqueSuffix}.${ext}`;
  const file = bucket.file(fileName);

  await file.save(fileBuffer, {
    metadata: { contentType: "auto" },
    public: true,
  });

  return file.publicUrl();
};

module.exports = {
  sendPushNotification,
  uploadFileToFirebase,
};
