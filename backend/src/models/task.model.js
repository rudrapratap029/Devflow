import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"]
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace reference is required"]
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator reference is required"]
    },
    status: {
      type: String,
      enum: [
        "Todo",
        "In Progress",
        "Submitted For Review",
        "Approved",
        "Completed",
        "Done"
      ],
      default: "Todo"
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },
    dueDate: {
      type: Date,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Task = mongoose.model("Task", taskSchema);

export default Task;
