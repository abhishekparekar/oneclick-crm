require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const Company = require("../src/models/Company");
const TaskStatus = require("../src/models/TaskStatus");
const Task = require("../src/models/Task");

const DEFAULT_STATUSES = [
  {
    statusKey: "all",
    label: "All",
    type: "system",
    isDefault: true,
    isEditable: false,
    isDeletable: false,
    order: 0,
    color: "#64748b",
    backgroundColor: "#f1f5f9",
  },
  {
    statusKey: "pending",
    label: "Pending",
    type: "workflow",
    isDefault: true,
    isEditable: true,
    isDeletable: true,
    order: 1,
    color: "#eab308",
    backgroundColor: "#fef08a",
  },
  {
    statusKey: "in_process",
    label: "In Process",
    type: "workflow",
    isDefault: true,
    isEditable: true,
    isDeletable: true,
    order: 2,
    color: "#3b82f6",
    backgroundColor: "#bfdbfe",
  },
  {
    statusKey: "complete",
    label: "Complete",
    type: "workflow",
    isDefault: true,
    isEditable: true,
    isDeletable: true,
    order: 3,
    color: "#22c55e",
    backgroundColor: "#bbf7d0",
  },
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected for seeding");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

const mapOldStatus = (oldStatus) => {
  if (!oldStatus) return "pending";
  const st = oldStatus.toLowerCase();
  if (st === "todo" || st === "pending" || st === "backlog" || st === "planning") return "pending";
  if (st === "in-progress" || st === "inprogress" || st === "in_process" || st === "testing") return "in_process";
  if (st === "done" || st === "complete" || st === "completed") return "complete";
  if (st === "review") return "review";
  return "pending";
};

const seedTaskStatuses = async () => {
  await connectDB();

  try {
    const companies = await Company.find();
    console.log(`Found ${companies.length} companies to process.`);

    for (const company of companies) {
      console.log(`Processing company: ${company.companyName} (${company._id})`);

      // Create default statuses if they don't exist
      const statusMap = {};
      
      for (const defStatus of DEFAULT_STATUSES) {
        let statusDoc = await TaskStatus.findOne({ companyId: company._id, statusKey: defStatus.statusKey });
        
        if (!statusDoc) {
          statusDoc = await TaskStatus.create({
            companyId: company._id,
            ...defStatus,
          });
          console.log(`  Created default status: ${defStatus.label}`);
        }
        statusMap[defStatus.statusKey] = statusDoc;
      }

      // Check if "review" needs to be created dynamically if old tasks use it
      let reviewStatus = await TaskStatus.findOne({ companyId: company._id, statusKey: "review" });

      // Migrate existing tasks
      const tasks = await Task.find({ companyId: company._id });
      console.log(`  Found ${tasks.length} tasks to migrate.`);

      let migratedCount = 0;
      for (const task of tasks) {
        // Map old status
        const oldStatusString = task.status || "todo";
        const mappedKey = mapOldStatus(oldStatusString);

        let targetStatusDoc = statusMap[mappedKey];

        // If it was 'review' and not mapped to default, create a Review status
        if (mappedKey === "review") {
          if (!reviewStatus) {
            reviewStatus = await TaskStatus.create({
              companyId: company._id,
              statusKey: "review",
              label: "Review",
              type: "workflow",
              isDefault: false,
              isEditable: true,
              isDeletable: true,
              order: 2.5, // Between in_process and complete
              color: "#f97316",
              backgroundColor: "#ffedd5",
            });
            console.log(`  Created dynamic 'Review' status for existing tasks.`);
          }
          targetStatusDoc = reviewStatus;
        }

        if (targetStatusDoc) {
          task.status = targetStatusDoc.statusKey; // Set old string field to new key just in case
          task.statusId = targetStatusDoc._id;
          task.statusKey = targetStatusDoc.statusKey;
          task.statusLabelSnapshot = targetStatusDoc.label;
          task.statusColorSnapshot = targetStatusDoc.color;
          task.statusOrderSnapshot = targetStatusDoc.order;
          
          await task.save();
          migratedCount++;
        }
      }
      console.log(`  Migrated ${migratedCount} tasks successfully.`);
    }

    console.log("Seeding and migration completed successfully.");
  } catch (error) {
    console.error("Error during seeding:", error);
  } finally {
    process.exit(0);
  }
};

seedTaskStatuses();
