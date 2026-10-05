import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace reference is required"]
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Project owner is required"]
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    status: {
      type: String,
      enum: ["Active", "Completed"],
      default: "Active"
    },
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
    requiredSkills: [
      {
        type: String,
        trim: true
      }
    ],
    experienceLevel: {
      type: String,
      enum: ["Entry Level", "Intermediate", "Senior", "Expert", "Any"],
      default: "Intermediate"
    },
    deadline: {
      type: String,
      trim: true,
      default: ""
    },
    submissionStatus: {
      type: String,
      enum: ["Not Submitted", "Submitted", "Under Review", "Approved", "Changes Requested"],
      default: "Not Submitted"
    },
    submissionNotes: {
      type: String,
      trim: true,
      default: ""
    },
    submissionFiles: [
      {
        name: { type: String, default: "" },
        url: { type: String, default: "" },
        fileType: { type: String, default: "" },
        size: { type: Number, default: 0 }
      }
    ],
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    developerResponses: [
      {
        developer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        status: {
          type: String,
          enum: ["Pending", "Accepted", "Rejected", "In Progress", "Submitted", "Completed"],
          default: "Pending"
        },
        responseNotes: {
          type: String,
          default: ""
        },
        respondedAt: {
          type: Date,
          default: Date.now
        },
        submission: {
          githubUrl: { type: String, default: "" },
          liveUrl: { type: String, default: "" },
          description: { type: String, default: "" },
          files: [
            {
              name: { type: String, default: "" },
              url: { type: String, default: "" },
              fileType: { type: String, default: "" },
              size: { type: Number, default: 0 }
            }
          ],
          submittedAt: { type: Date, default: null }
        }
      }
    ],
    aiReview: {
      overallScore: { type: mongoose.Schema.Types.Mixed, default: null },
      codeQuality: { type: String, default: "" },
      requirementCoverage: { type: mongoose.Schema.Types.Mixed, default: null },
      missingFeatures: [{ type: String }],
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      suggestions: [{ type: String }],
      improvementAreas: [{ type: String }],
      recommendation: { type: String, default: "" },
      analyzedAt: { type: Date, default: null }
    }
  },
  {
    timestamps: true
  }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
