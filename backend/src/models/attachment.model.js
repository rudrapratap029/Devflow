import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task reference is required"]
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader reference is required"]
    },
    originalName: {
      type: String,
      required: [true, "Original file name is required"],
      trim: true
    },
    fileName: {
      type: String,
      required: [true, "Stored file name is required"],
      trim: true
    },
    filePath: {
      type: String,
      required: [true, "File path is required"],
      trim: true
    },
    fileType: {
      type: String,
      required: [true, "File type is required"],
      trim: true
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"]
    }
  },
  {
    timestamps: true
  }
);

const Attachment = mongoose.model("Attachment", attachmentSchema);

export default Attachment;
