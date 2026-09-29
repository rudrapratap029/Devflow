import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Workspace owner is required"]
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;
