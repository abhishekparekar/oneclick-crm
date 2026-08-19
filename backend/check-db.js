const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const DeviceTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fcmToken: String,
  deviceType: String,
  isActive: Boolean
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  body: String,
  isRead: Boolean
}, { timestamps: true });

const TaskSchema = new mongoose.Schema({
  title: String,
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }]
}, { timestamps: true });

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    
    const db = mongoose.connection;
    const tokens = await db.collection('devicetokens').find().toArray();
    console.log("--- DEVICE TOKENS ---");
    console.log(`Total active tokens: ${tokens.length}`);
    if (tokens.length > 0) {
      console.log(`Most recent token user: ${tokens[tokens.length-1].userId}`);
      console.log(`Most recent token value: ${tokens[tokens.length-1].fcmToken}`);
      console.log(`Most recent token updatedAt: ${tokens[tokens.length-1].updatedAt}`);
    }

    const tasks = await db.collection('tasks').find().sort({createdAt: -1}).limit(1).toArray();
    console.log("\n--- MOST RECENT TASK ---");
    if (tasks.length > 0) {
      console.log(`Title: ${tasks[0].title}`);
      console.log(`Assignees: ${JSON.stringify(tasks[0].assignees)}`);
      console.log(`Created At: ${tasks[0].createdAt}`);
    }

    const notifs = await db.collection('notifications').find().sort({createdAt: -1}).limit(1).toArray();
    console.log("\n--- MOST RECENT NOTIFICATION ---");
    if (notifs.length > 0) {
      console.log(`Title: ${notifs[0].title}`);
      console.log(`User ID: ${notifs[0].userId}`);
      console.log(`Created At: ${notifs[0].createdAt}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDb();
