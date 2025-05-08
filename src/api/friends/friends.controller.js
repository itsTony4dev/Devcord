import { DirectMessage, Friends, User } from "../../models/index.js";

/**
 * Send a friend request to another user
 */
export const sendFriendRequest = async (req, res) => {
  try {
    const { userId: friendId } = req.params;
    const userId = req.user.id;

    // Check if friend exists
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if friend request already exists
    const existingRequest = await Friends.findOne({
      $or: [
        { userId, friendId, status: { $in: ["pending", "accepted"] } },
        {
          userId: friendId,
          friendId: userId,
          status: { $in: ["pending", "accepted"] },
        },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message:
          existingRequest.status === "pending"
            ? "Friend request already sent"
            : "Users are already friends",
      });
    }

    // Check if user is blocked
    const isBlocked = await Friends.findOne({
      $or: [
        { userId, friendId, status: "blocked" },
        { userId: friendId, friendId: userId, status: "blocked" },
      ],
    });

    if (isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Cannot send friend request",
      });
    }

    // Create friend request
    const friendRequest = new Friends({
      userId,
      friendId,
      status: "pending",
    });

    await friendRequest.save();

    // Get sender info for the real-time notification
    const sender = await User.findById(userId).select("username avatar");

    // Send real-time notification using Socket.IO
    const io = req.app.get("io");
    
    // Use the friends namespace instead of default namespace
    const friendsNamespace = io.of("/friends");
    const friendsSocketMap = io.friendsUserSocketMap || {};
    const receiverSocketId = friendsSocketMap[friendId];

    if (receiverSocketId) {
      friendsNamespace.to(receiverSocketId).emit("newFriendRequest", {
        requestId: friendRequest._id,
        sender: {
          userId: userId,
          username: sender.username,
          avatar: sender.avatar
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      message: "Friend request sent successfully",
      data: friendRequest,
    });
  } catch (error) {
    console.error("Error in sendFriendRequest:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all friend requests for the current user
 */
export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await Friends.find({
      friendId: userId,
      status: "pending",
    }).populate("userId", "username avatar");

    res.status(200).json({
      success: true,
      data: requests.map((request) => ({
        requestId: request._id,
        user: {
          id: request.userId._id,
          username: request.userId.username,
          avatar: request.userId.avatar,
        },
        createdAt: request.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error in getFriendRequests:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all pending friend requests sent by the current user
 */
export const getSentFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const sentRequests = await Friends.find({
      userId: userId,
      status: "pending",
    }).populate("friendId", "username avatar");

    res.status(200).json({
      success: true,
      data: sentRequests.map((request) => ({
        requestId: request._id,
        user: {
          id: request.friendId._id,
          username: request.friendId.username,
          avatar: request.friendId.avatar,
        },
        createdAt: request.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error in getSentFriendRequests:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await Friends.findOne({
      _id: requestId,
      friendId: userId,
      status: "pending",
    }).populate("userId", "username avatar");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found",
      });
    }

    request.status = "accepted";
    await request.save();

    // Get user info for the real-time notification
    const user = await User.findById(userId).select("username avatar");

    // Send real-time notification using Socket.IO
    const io = req.app.get("io");
    const senderSocketId = io.userSocketMap[request.userId._id];

    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestAccepted", {
        requestId: request._id,
        user: {
          id: userId,
          username: user.username,
          avatar: user.avatar,
        },
        acceptedAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Friend request accepted",
      data: request,
    });
  } catch (error) {
    console.error("Error in acceptFriendRequest:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Decline a friend request
 */
export const declineFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await Friends.findOne({
      _id: requestId,
      friendId: userId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found",
      });
    }

    // Store the sender ID before deleting
    const senderId = request.userId;

    // Delete the request
    await Friends.findByIdAndDelete(requestId);

    // Send real-time notification using Socket.IO
    const io = req.app.get("io");
    const senderSocketId = io.userSocketMap[senderId];

    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestDeclined", {
        requestId,
        declinedAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Friend request declined",
    });
  } catch (error) {
    console.error("Error in declineFriendRequest:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get list of friends for the current user
 */
export const getFriendsList = async (req, res) => {
  try {
    const userId = req.user.id;
    const friends = await Friends.findFriends(userId);

    res.status(200).json({
      success: true,
      data: friends,
    });
  } catch (error) {
    console.error("Error in getFriendsList:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Remove a friend
 */
export const removeFriend = async (req, res) => {
  try {
    const { userId: friendId } = req.params;
    const userId = req.user.id;

    // Check if friend relationship exists
    const friendship = await Friends.findOne({
      $or: [
        { userId, friendId, status: "accepted" },
        { userId: friendId, friendId: userId, status: "accepted" },
      ],
    });

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friend relationship not found",
      });
    }

    // Delete the friendship
    await Friends.findByIdAndDelete(friendship._id);

    // Get user info for the real-time notification
    const user = await User.findById(userId).select("username avatar");

    // Send real-time notification using Socket.IO
    const io = req.app.get("io");
    
    // Get socket ID from friends namespace
    const friendsNamespace = io.of("/friends");
    
    // Access the socket map correctly - it's stored in the 'io' object
    // Make sure we have a fallback if it doesn't exist
    const userSocketMap = io.userSocketMap || {};
    const friendSocketId = userSocketMap[friendId];

    if (friendSocketId) {
      // Use regular io to emit the event (compatible with existing client code)
      io.to(friendSocketId).emit("friendRemoved", {
        userId,
        username: user.username,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: "Friend removed successfully",
    });
  } catch (error) {
    console.error("Error in removeFriend:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Block a user
 */
export const blockUser = async (req, res) => {
  try {
    const { userId: blockedId } = req.params;
    const userId = req.user.id;

    // Remove any existing friendship or requests
    await Friends.deleteMany({
      $or: [
        { userId, friendId: blockedId },
        { userId: blockedId, friendId: userId },
      ],
    });

    // Create blocked relationship
    const blocked = new Friends({
      userId,
      friendId: blockedId,
      status: "blocked",
    });

    await blocked.save();

    res.status(200).json({
      success: true,
      message: "User blocked successfully",
    });
  } catch (error) {
    console.error("Error in blockUser:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Unblock a user
 */
export const unblockUser = async (req, res) => {
  try {
    const { userId: blockedId } = req.params;
    const userId = req.user.id;

    const blocked = await Friends.findOneAndDelete({
      userId,
      friendId: blockedId,
      status: "blocked",
    });

    if (!blocked) {
      return res.status(404).json({
        success: false,
        message: "Blocked user not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User unblocked successfully",
    });
  } catch (error) {
    console.error("Error in unblockUser:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get list of blocked users
 */
export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    const blockedUsers = await Friends.find({
      userId,
      status: "blocked",
    }).populate("friendId", "username avatar");

    res.status(200).json({
      success: true,
      data: blockedUsers.map((block) => ({
        id: block.friendId._id,
        username: block.friendId.username,
        avatar: block.friendId.avatar,
        blockedAt: block.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error in getBlockedUsers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
