import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username cannot exceed 20 characters"],
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9_]+$/.test(v);
        },
        message: "Username can only contain letters, numbers, and underscores",
      },
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
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
      },
    ],
    socialLinks: {
      github: {
        type: String,
        validate: {
          validator: function (value) {
            return /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/.test(
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
            return /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+(\/)?$/.test(
              value
            );
          },
          message: "Invalid LinkedIn URL.",
        },
      },
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockUntil: {
      type: Date,
      default: null,
    },
    blockCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

//Middleware to cascade delete user's stuff (Channels,Friends, etc.) when user is deleted

const User = mongoose.model("User", userSchema);

export default User;
