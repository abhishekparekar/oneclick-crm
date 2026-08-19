const TaskStatus = require("../models/TaskStatus");

// GET /api/company/task-statuses
exports.getTaskStatuses = async (req, res) => {
  try {
    const statuses = await TaskStatus.find({ companyId: req.companyId }).sort({ order: 1 });
    res.json({ success: true, statuses });
  } catch (error) {
    console.error("Error fetching task statuses:", error);
    res.status(500).json({ success: false, message: "Failed to fetch task statuses" });
  }
};

const DEFAULT_STATUSES = [
  { statusKey: "pending", label: "Pending", color: "#64748b", backgroundColor: "#f1f5f9", order: 1, isActive: true },
  { statusKey: "in_process", label: "In Process", color: "#2563eb", backgroundColor: "#eff6ff", order: 2, isActive: true },
  { statusKey: "overdue", label: "Overdue", color: "#ef4444", backgroundColor: "#fef2f2", order: 3, isActive: true },
  { statusKey: "complete", label: "Completed", color: "#16a34a", backgroundColor: "#dcfce7", order: 4, isActive: true },
  { statusKey: "late_complete", label: "Late Completed", color: "#16a34a", backgroundColor: "#dcfce7", order: 5, isActive: true },
  { statusKey: "re_pending", label: "Re-Pending", color: "#64748b", backgroundColor: "#f1f5f9", order: 6, isActive: true },
  { statusKey: "re_in_process", label: "Re-In Process", color: "#2563eb", backgroundColor: "#eff6ff", order: 7, isActive: true }
];

// GET /api/tasks/statuses (Public for company users)
exports.getActiveTaskStatuses = async (req, res) => {
  try {
    let statuses = await TaskStatus.find({ companyId: req.companyId, isActive: true }).sort({ order: 1 });
    if (!statuses || statuses.length === 0) {
      // Seed default statuses in the background so they persist
      const seedData = DEFAULT_STATUSES.map(s => ({
        ...s,
        companyId: req.companyId,
        isDefault: true,
        isEditable: false,
        isDeletable: false
      }));
      TaskStatus.insertMany(seedData).catch(err => console.error("Error seeding default statuses:", err));
      
      statuses = seedData;
    }
    res.json({ success: true, statuses });
  } catch (error) {
    console.error("Error fetching active task statuses:", error);
    res.status(500).json({ success: false, message: "Failed to fetch active task statuses" });
  }
};

// POST /api/company/task-statuses
exports.createTaskStatus = async (req, res) => {
  try {
    const { statusKey, label, color, backgroundColor, icon, order } = req.body;

    if (!statusKey || !label) {
      return res.status(400).json({ success: false, message: "Status key and label are required" });
    }

    const existing = await TaskStatus.findOne({ companyId: req.companyId, statusKey });
    if (existing) {
      return res.status(400).json({ success: false, message: "Status key already exists" });
    }

    const newStatus = await TaskStatus.create({
      companyId: req.companyId,
      statusKey,
      label,
      color: color || "#1e293b",
      backgroundColor: backgroundColor || "#f1f5f9",
      icon: icon || "ellipse-outline",
      type: "workflow",
      order: order || 0,
      isDefault: false,
      isEditable: true,
      isDeletable: true,
      isActive: true,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Error creating task status:", error);
    res.status(500).json({ success: false, message: "Failed to create task status" });
  }
};

// PUT /api/company/task-statuses/:id
exports.updateTaskStatus = async (req, res) => {
  try {
    const { label, color, backgroundColor, icon, isActive } = req.body;
    const statusId = req.params.id;

    const status = await TaskStatus.findOne({ _id: statusId, companyId: req.companyId });
    if (!status) {
      return res.status(404).json({ success: false, message: "Status not found" });
    }

    if (!status.isEditable) {
      return res.status(403).json({ success: false, message: "This status cannot be edited" });
    }

    if (label) status.label = label;
    if (color) status.color = color;
    if (backgroundColor) status.backgroundColor = backgroundColor;
    if (icon) status.icon = icon;
    if (typeof isActive !== "undefined") status.isActive = isActive;

    await status.save();
    res.json({ success: true, status });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ success: false, message: "Failed to update task status" });
  }
};

// PATCH /api/company/task-statuses/reorder
exports.reorderTaskStatuses = async (req, res) => {
  try {
    const { orderedIds } = req.body; // Array of status IDs in new order
    
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    for (let i = 0; i < orderedIds.length; i++) {
      await TaskStatus.updateOne(
        { _id: orderedIds[i], companyId: req.companyId },
        { $set: { order: i } }
      );
    }

    res.json({ success: true, message: "Statuses reordered successfully" });
  } catch (error) {
    console.error("Error reordering statuses:", error);
    res.status(500).json({ success: false, message: "Failed to reorder task statuses" });
  }
};

// DELETE /api/company/task-statuses/:id
exports.deleteTaskStatus = async (req, res) => {
  try {
    const statusId = req.params.id;
    const status = await TaskStatus.findOne({ _id: statusId, companyId: req.companyId });

    if (!status) {
      return res.status(404).json({ success: false, message: "Status not found" });
    }

    if (!status.isDeletable) {
      return res.status(403).json({ success: false, message: "This status cannot be deleted" });
    }

    // Check if any tasks use this status
    const Task = require("../models/Task");
    const taskCount = await Task.countDocuments({ companyId: req.companyId, statusId });
    if (taskCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete status. ${taskCount} task(s) are currently using it.` });
    }

    await status.deleteOne();
    res.json({ success: true, message: "Status deleted successfully" });
  } catch (error) {
    console.error("Error deleting task status:", error);
    res.status(500).json({ success: false, message: "Failed to delete task status" });
  }
};
