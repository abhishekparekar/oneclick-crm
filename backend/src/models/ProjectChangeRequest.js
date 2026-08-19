const mongoose = require("mongoose");

const projectChangeRequestSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String, 
      required: true 
    },
    requestedBy: { 
      type: String, 
      required: true 
    },
    priority: { 
      type: String, 
      enum: ["low", "medium", "high"], 
      default: "medium" 
    },
    impactLevel: { 
      type: String, 
      enum: ["low", "medium", "high"], 
      default: "medium" 
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "in-progress", "completed"],
      default: "pending"
    }
  },
  { 
    timestamps: true 
  }
);

const ProjectChangeRequest = mongoose.model("ProjectChangeRequest", projectChangeRequestSchema);

module.exports = ProjectChangeRequest;
