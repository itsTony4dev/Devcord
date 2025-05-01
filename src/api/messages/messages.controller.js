import { Message } from "../../models/index.js";
import cloudinary from "../../utils/cloudinary/cloudinary.js";
import { Channel, User } from "../../models/index.js";

/**
 * Send a message to a channel
 * Handles both public and private channels
 */
export const sendMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { message, image } = req.body;
    const userId = req.user.id;

    if (!message && !image) {
      return res.status(400).json({
        success: false,
        message: "Cannot send empty message",
      });
    }

    // Find the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    // Process image if provided
    let imageUrl = null;
    if (image) {
      try {
        const uploadResult = await cloudinary.uploader.upload(image);
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        // Continue without image if upload fails
      }
    }

    // For private channels, verify access
    if (channel.isPrivate) {
      const hasAccess =
        channel.createdBy.toString() === userId.toString() ||
        channel.allowedUsers.some((id) => id.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission in this private channel",
        });
      }
    }

    // Get sender info
    const sender = await User.findById(userId).select("username avatar");
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender not found",
      });
    }

    // Create message in database
    const newMessage = new Message({
      channelId,
      userId,
      content: message,
      image: imageUrl,
      workspaceId: channel.workspaceId, // Ensure workspaceId is stored with the message
    });
    await newMessage.save();

    // Prepare message data for socket emission
    const messageData = {
      _id: newMessage._id,
      channelId,
      messageId: newMessage._id,
      workspaceId: channel.workspaceId,
      content: message,
      message, // Include both content and message for compatibility
      image: imageUrl,
      sender: {
        userId,
        username: sender.username,
        avatar: sender.avatar,
      },
      senderId: userId,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Get the socket instance
    const io = req.app.get("io");

    // For private channels, send only to allowed users
    if (channel.isPrivate) {
      const allowedUserIds = [
        channel.createdBy.toString(),
        ...channel.allowedUsers.map((id) => id.toString()),
      ];

      // Send to all online allowed users
      allowedUserIds.forEach((allowedUserId) => {
        const receiverSocketId = io.userSocketMap?.[allowedUserId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", messageData);
        }
      });
    } else {
      // For public channels, broadcast to all users in the channel namespace
      const channelsNamespace = io.of("/channels");
      channelsNamespace.to(channelId).emit("receiveMessage", messageData);
    }

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: messageData,
    });
  } catch (error) {
    console.error("Error in sendMessage controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

/**
 * Get messages for a channel
 */
export const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Find the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    // For private channels, verify access
    if (channel.isPrivate) {
      const hasAccess =
        channel.createdBy.toString() === userId.toString() ||
        channel.allowedUsers.some((id) => id.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message:
            "You don't have permission to view messages in this private channel",
        });
      }
    }

    // Get messages with pagination
    const rawMessages = await Message.find({ channelId })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("userId", "username avatar");

    // Format messages to match socket format
    const messages = rawMessages.map(msg => ({
      _id: msg._id,
      channelId: msg.channelId,
      workspaceId: msg.workspaceId || channel.workspaceId,
      content: msg.content,
      message: msg.content, // Include both for compatibility
      image: msg.image,
      createdAt: msg.createdAt,
      timestamp: msg.createdAt,
      senderId: msg.userId._id,
      userId: msg.userId._id,
      sender: {
        userId: msg.userId._id,
        username: msg.userId.username,
        avatar: msg.userId.avatar
      },
      // Set isSentByMe flag
      isSentByMe: msg.userId._id.toString() === userId.toString()
    }));

    // Get total count for pagination
    const total = await Message.countDocuments({ channelId });

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error in getChannelMessages controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get messages",
    });
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Check if user is the sender
    if (message.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages",
      });
    }

    // Delete the message
    await message.deleteOne();

    // Get the socket instance
    const io = req.app.get("io");

    // Notify channel about deleted message
    io.to(message.channelId.toString()).emit("messageDeleted", {
      channelId: message.channelId,
      messageId: message._id,
    });

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteMessage controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
};

/**
 * Edit a message
 */
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Check if user is the sender
    if (message.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own messages",
      });
    }

    // Update the message
    message.content = content;
    await message.save();

    // Get the socket instance
    const io = req.app.get("io");

    // Find the channel
    const channel = await Channel.findById(message.channelId);

    // Prepare message data for socket emission
    const messageData = {
      channelId: message.channelId,
      messageId: message._id,
      content,
      updatedAt: message.updatedAt,
    };

    // For private channels, send only to allowed users
    if (channel.isPrivate) {
      const allowedUserIds = [
        channel.createdBy.toString(),
        ...channel.allowedUsers.map((id) => id.toString()),
      ];

      // Send to all online allowed users
      allowedUserIds.forEach((allowedUserId) => {
        const receiverSocketId = io.userSocketMap?.[allowedUserId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageEdited", messageData);
        }
      });
    } else {
      // For public channels, broadcast to all users in the channel
      io.to(message.channelId.toString()).emit("messageEdited", messageData);
    }

    res.status(200).json({
      success: true,
      message: "Message updated successfully",
      data: messageData,
    });
  } catch (error) {
    console.error("Error in editMessage controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update message",
    });
  }
};

/**
 * React to a message
 */
export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: "Emoji is required",
      });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Check if user has access to the channel
    const channel = await Channel.findById(message.channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    // For private channels, verify access
    if (channel.isPrivate) {
      const hasAccess =
        channel.createdBy.toString() === userId.toString() ||
        channel.allowedUsers.some((id) => id.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message:
            "You don't have permission to react to messages in this private channel",
        });
      }
    }

    // Check if the reaction already exists
    const existingReactionIndex = message.reactions.findIndex(
      (reaction) => reaction.emoji === emoji
    );

    if (existingReactionIndex !== -1) {
      // Check if user already reacted with this emoji
      const userIndex = message.reactions[
        existingReactionIndex
      ].users.findIndex((id) => id.toString() === userId.toString());

      if (userIndex !== -1) {
        // User already reacted, so remove their reaction
        message.reactions[existingReactionIndex].users.pull(userId);

        // If no users left for this reaction, remove the reaction
        if (message.reactions[existingReactionIndex].users.length === 0) {
          message.reactions.splice(existingReactionIndex, 1);
        }
      } else {
        // Add user to existing reaction
        message.reactions[existingReactionIndex].users.push(userId);
      }
    } else {
      // Create new reaction
      message.reactions.push({
        emoji,
        users: [userId],
      });
    }

    await message.save();

    // Get the socket instance
    const io = req.app.get("io");

    // Prepare reaction data for socket emission
    const reactionData = {
      channelId: message.channelId,
      messageId: message._id,
      reactions: message.reactions,
    };

    // For private channels, send only to allowed users
    if (channel.isPrivate) {
      const allowedUserIds = [
        channel.createdBy.toString(),
        ...channel.allowedUsers.map((id) => id.toString()),
      ];

      // Send to all online allowed users
      allowedUserIds.forEach((allowedUserId) => {
        const receiverSocketId = io.userSocketMap?.[allowedUserId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageReaction", reactionData);
        }
      });
    } else {
      // For public channels, broadcast to all users in the channel
      io.to(message.channelId.toString()).emit("messageReaction", reactionData);
    }

    res.status(200).json({
      success: true,
      message: "Reaction updated successfully",
      data: reactionData,
    });
  } catch (error) {
    console.error("Error in reactToMessage controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update reaction",
    });
  }
};

/**
 * Pin a message in a channel
 */
export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Find the channel
    const channel = await Channel.findById(message.channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    // Check if user has permission to pin (channel owner or admin)
    const isOwner = channel.createdBy.toString() === userId.toString();

    // Check if user is admin (you may want to adjust this based on your admin check logic)
    const isAdmin =
      channel.admins &&
      channel.admins.some(
        (adminId) => adminId.toString() === userId.toString()
      );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only channel owner and admins can pin messages",
      });
    }

    // Toggle pin status
    message.isPinned = !message.isPinned;
    await message.save();

    // Get the socket instance
    const io = req.app.get("io");

    // Prepare pin data for socket emission
    const pinData = {
      channelId: message.channelId,
      messageId: message._id,
      isPinned: message.isPinned,
    };

    // For private channels, send only to allowed users
    if (channel.isPrivate) {
      const allowedUserIds = [
        channel.createdBy.toString(),
        ...channel.allowedUsers.map((id) => id.toString()),
      ];

      // Send to all online allowed users
      allowedUserIds.forEach((allowedUserId) => {
        const receiverSocketId = io.userSocketMap?.[allowedUserId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messagePin", pinData);
        }
      });
    } else {
      // For public channels, broadcast to all users in the channel
      io.to(message.channelId.toString()).emit("messagePin", pinData);
    }

    res.status(200).json({
      success: true,
      message: message.isPinned
        ? "Message pinned successfully"
        : "Message unpinned successfully",
      data: pinData,
    });
  } catch (error) {
    console.error("Error in pinMessage controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update pin status",
    });
  }
};

/**
 * Search messages by content
 */
export const searchMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { query, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Find the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    // For private channels, verify access
    if (channel.isPrivate) {
      const hasAccess =
        channel.createdBy.toString() === userId.toString() ||
        channel.allowedUsers.some((id) => id.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message:
            "You don't have permission to search messages in this private channel",
        });
      }
    }

    // Search messages with text index
    const messages = await Message.find({
      channelId,
      $text: { $search: query },
    })
      .sort({ score: { $meta: "textScore" } })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("userId", "username avatar");

    // Get total count for pagination
    const total = await Message.countDocuments({
      channelId,
      $text: { $search: query },
    });

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error in searchMessages controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search messages",
    });
  }
};
