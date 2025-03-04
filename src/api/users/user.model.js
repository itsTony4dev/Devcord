import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      message: "Invalid email format."
    },
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: function(value) {
        return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/.test(value);
      },
      message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: ""
  },
  skills: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  bio: {
    type: String,
    default: ""
  },
  socialLinks: {
    github: {
      type: String,
      validate: {
        validator: function(value) {
          return /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+$/.test(value);
        },
        message: "Invalid GitHub URL."
      }
    },
    linkedin: {
      type: String,
      validate: {
        validator: function(value) {
          return /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+$/.test(value);
        },
        message: "Invalid LinkedIn URL."
      }
    },
  },
  lastLogin: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: ["user", "admin", "superadmin", "member"],
    default: "user"
  },
}, { timestamps: true });


const User = mongoose.model("User", userSchema);

export default User;
