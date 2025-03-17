import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { User } from "../../models/index.js";
import cloudinary from "../../utils/cloudinary/cloudinary.js";

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error in getProfile controller:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const user = await User.findById(id).select(
      "-password -isBlocked -blockUntil -blockCount"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error in getUserById controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, username, skills } = req.query;

    const query = {};

    if (username) {
      query.username = { $regex: username, $options: "i" };
    }

    if (skills) {
      query.skills = { $in: skills.split(",").map((skill) => skill.trim()) };
    }

    const users = await User.find(query)
      .select("username avatar skills bio isVerified")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalUsers: count,
    });
  } catch (error) {
    console.error("Error in getUsers controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { username, github, linkedin, bio, skills } = req.body;

    const existingUser = await User.findById(req.user.id);
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (skills !== undefined) {
      if (
        !Array.isArray(skills) ||
        !skills.every((skill) => typeof skill === "string")
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Skills must be an array of strings",
          });
      }
    }

    const updateFields = {
      ...(username !== undefined && {
        username: username.trim().toLowerCase(),
      }),
      ...(bio !== undefined && { bio: bio.trim() }),
      ...(skills !== undefined && { skills }),
      socialLinks: {
        ...(existingUser.socialLinks || {}),
        ...(github !== undefined && { github: github.trim() }),
        ...(linkedin !== undefined && { linkedin: linkedin.trim() }),
      },
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error in updateProfile controller:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error in updatePassword controller:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};


// export const updateSkills = async (req, res) => {
//   try {
//     const { skills } = req.body;

//     if (!Array.isArray(skills)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid Request" });
//     }

//     const user = await User.findByIdAndUpdate(
//       req.user.id,
//       { $set: { skills } },
//       { new: true, runValidators: true }
//     ).select("-password");

//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     res.status(200).json({ success: true, user });
//   } catch (error) {
//     console.error("Error in updateSkills controller:", error);

//     if (error.name === "ValidationError") {
//       return res.status(400).json({ success: false, message: error.message });
//     }

//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

export const searchUsers = async (req, res) => {
  try {
    const { q, type = "username" } = req.query;

    if (!q) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required" });
    }

    let query = {};

    if (type === "username") {
      query.username = { $regex: q, $options: "i" };
    } else if (type === "skills") {
      query.skills = { $in: [new RegExp(q, "i")] };
    }

    const users = await User.find(query)
      .select("username avatar skills bio")
      .limit(10);

    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error in searchUsers controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    // Check if user exists
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Get current user
    const currentUser = await User.findById(req.user.id);

    // Check if the user is already blocked
    const isBlocked =
      currentUser.blockedUsers &&
      currentUser.blockedUsers.some((userId) => userId.toString() === id);

    if (isBlocked) {
      // Unblock user
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { blockedUsers: id },
      });

      res
        .status(200)
        .json({ success: true, message: "User unblocked successfully" });
    } else {
      // Block user
      // If blockedUsers doesn't exist, create it
      if (!currentUser.blockedUsers) {
        await User.findByIdAndUpdate(req.user.id, {
          $set: { blockedUsers: [id] },
        });
      } else {
        await User.findByIdAndUpdate(req.user.id, {
          $addToSet: { blockedUsers: id },
        });
      }

      res
        .status(200)
        .json({ success: true, message: "User blocked successfully" });
    }
  } catch (error) {
    console.error("Error in toggleBlockUser controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("blockedUsers", "username avatar")
      .select("blockedUsers");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res
      .status(200)
      .json({ success: true, blockedUsers: user.blockedUsers || [] });
  } catch (error) {
    console.error("Error in getBlockedUsers controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res
        .status(400)
        .json({ success: false, message: "Avatar URL is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(avatar)

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { avatar: uploadResponse.secure_url } },
      { new: true }
    ).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error in updateAvatar controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // TODO: Add logic to delete user's related data (messages, workspaces, etc.)

    await User.findByIdAndDelete(req.user.id);

    res
      .status(200)
      .json({ success: true, message: "User account deleted successfully" });
  } catch (error) {
    console.error("Error in deleteAccount controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getUserActivity = async (req, res) => {
  try {
    // This would typically involve querying multiple collections
    // to get the user's recent messages, threads, etc.
    // For now, we'll return a placeholder

    res.status(200).json({
      success: true,
      message: "Activity tracking not implemented yet",
      // TODO: Implement activity tracking
    });
  } catch (error) {
    console.error("Error in getUserActivity controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
