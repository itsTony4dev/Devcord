import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      validate: {
        validator: function (value) {
          return /^[a-zA-Z0-9_]+$/.test(value);
        },
        message:
          "Username must contain only letters, numbers, and underscores.",
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (value) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Invalid email format.",
      },
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 128,
      validate: {
        validator: function (value) {
          return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/.test(
            value
          );
        },
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    skills: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    bio: {
      type: String,
      default: "",
    },
    socialLinks: {
      github: {
        type: String,
        validate: {
          validator: function (value) {
            return /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+$/.test(
              value
            );
          },
          message: "Invalid GitHub URL.",
        },
      },
      linkedin: {
        type: String,
        validate: {
          validator: function (value) {
            return /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+$/.test(
              value
            );
          },
          message: "Invalid LinkedIn URL.",
        },
      },
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    workspaces: [
      {
        workspace_id: {
          type: Schema.Types.ObjectId,
          ref: "Workspace",
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        joined_at: {
          type: Date,
          default: Date.now,
        },
        is_favorite: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
