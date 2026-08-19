const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

// Initialize Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Better for Vercel: Parse JSON string directly from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "conpany-1dffc.firebasestorage.app",
    });
    console.log("Firebase Admin initialized successfully from JSON string.");
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Fallback: load from local file path relative to cwd
    const fullPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    const serviceAccount = require(fullPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "conpany-1dffc.firebasestorage.app",
    });
    console.log("Firebase Admin initialized successfully from file path.");
  } else {
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
const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!admin.apps.length) {
    console.warn("Firebase Admin not initialized. Skipping push notification.");
    return null;
  }

  if (!tokens || tokens.length === 0) {
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

  const message = {
    notification: {
      title,
      body,
    },
    android: {
      notification: {
        sound: 'notice11',
        channelId: 'notice11-sound'
      }
    },
    data: stringifiedData,
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error("FCM Send Error for token:", tokens[idx], resp.error);
        }
      });
      console.log("Tokens failed:", failedTokens);
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
