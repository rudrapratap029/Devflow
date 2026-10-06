import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"]
    },
    password: {
      type: String,
      required: [true, "Password is required"]
    },
    role: {
      type: String,
      enum: ["admin", "company", "developer", "manager"],
      default: "developer"
    },
    avatar: {
      type: String,
      default: ""
    },
    profilePicture: {
      type: String,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    },
    skills: [
      {
        type: String,
        trim: true
      }
    ],
    bio: {
      type: String,
      default: "",
      trim: true,
      maxLength: [500, "Bio cannot exceed 500 characters"]
    },
    companyName: {
      type: String,
      trim: true,
      default: ""
    },
    companyWebsite: {
      type: String,
      trim: true,
      default: ""
    },
    companyDescription: {
      type: String,
      trim: true,
      default: ""
    },
    industry: {
      type: String,
      trim: true,
      default: ""
    },
    companyLogo: {
      type: String,
      default: ""
    },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Approved"
    },
    location: {
      type: String,
      trim: true,
      default: ""
    },
    companySize: {
      type: String,
      trim: true,
      default: ""
    },
    foundedYear: {
      type: String,
      trim: true,
      default: ""
    },
    hiringStatus: {
      type: String,
      trim: true,
      default: "Actively Hiring"
    },
    github: {
      type: String,
      trim: true,
      default: ""
    },
    linkedin: {
      type: String,
      trim: true,
      default: ""
    },
    portfolio: {
      type: String,
      trim: true,
      default: ""
    },
    refreshToken: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving to database
userSchema.pre("save", async function () {
  // Only hash password if it has been modified or is new
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password in database
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
