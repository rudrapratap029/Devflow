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
    },
    // Developer Work Submission Details
    submissionFiles: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        fileType: { type: String, default: "" },
        size: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    githubUrl: {
      type: String,
      trim: true,
      default: ""
    },
    liveUrl: {
      type: String,
      trim: true,
      default: ""
    },
    developerNotes: {
      type: String,
      trim: true,
      default: ""
    },
    reviewStatus: {
      type: String,
      enum: ["Pending", "Under Review", "Approved", "Changes Requested"],
      default: "Pending"
    },
    aiReviewResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    submissionHistory: [
      {
        submissionFiles: [
          {
            name: { type: String },
            url: { type: String },
            fileType: { type: String },
            size: { type: Number },
            uploadedAt: { type: Date, default: Date.now }
          }
        ],
        githubUrl: { type: String, default: "" },
        liveUrl: { type: String, default: "" },
        developerNotes: { type: String, default: "" },
        submittedAt: { type: Date, default: Date.now },
        aiReviewResult: { type: mongoose.Schema.Types.Mixed, default: null }
      }
    ]
  },
  {
    timestamps: true
  }
);

const Task = mongoose.model("Task", taskSchema);

export default Task;
