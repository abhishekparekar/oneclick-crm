const admin = require("firebase-admin");
const serviceAccount = require("./firebase-admin.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function testPush() {
  const token = "d8jvRSFzQk2xxPKAjUYcIR:APA91bHaldmYM7_EhGkqzfNarWPAi14zg7ubuOhI_cRce3WKJCw7OVoRWA2TSoR3RfCkOC5NlzxB_3Pk6Nvk2lDe-JsXvNkVqg0tRkf7JDuCqd3KHOlZuJU";
  
  const message = {
    notification: {
      title: "Test Notification",
      body: "If you hear a sound, push notifications are working perfectly!"
    },
    android: {
      notification: {
        sound: 'notice11',
        channelId: 'notice11-sound'
      }
    },
    tokens: [token]
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("Success count:", response.successCount);
    console.log("Failure count:", response.failureCount);
    if (response.failureCount > 0) {
      console.log("Errors:", response.responses.map(r => r.error).filter(Boolean));
    }
  } catch (err) {
    console.error("Fatal Error:", err);
  }
}

testPush();
