import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"]
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"]
    },
    type: {
      type: String,
      enum: [
        "TASK_ASSIGNED",
        "COMMENT_ADDED",
        "TASK_STATUS_CHANGED",
        "TASK_SUBMITTED_FOR_REVIEW",
        "TASK_APPROVED",
        "TASK_COMPLETED",
        "NEW_PROJECT_AVAILABLE",
        "PROJECT_SUBMITTED",
        "PROJECT_REVIEWED",
        "COMPANY_VERIFIED"
      ],
      required: [true, "Notification type is required"]
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
