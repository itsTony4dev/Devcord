import { Message } from "../../models/index.js";
import cloudinary from "../../utils/cloudinary/cloudinary.js";
import { io , getReceiverSocketId } from "../../config/socket.js";
import { Channel, User } from "../../models/index.js";

export const getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const messages = await Message.find({ channelId });
    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("Error in getMessages controller:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Send a message to a channel
 * Handles both public and private channels
 */
export const sendMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    // Find the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found"
      });
    }

    // For private channels, verify access
    if (channel.isPrivate) {
      const hasAccess = channel.createdBy.toString() === userId.toString() ||
        channel.allowedUsers.some(id => id.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission in this private channel"
        });
      }
    }

    // Get sender info
    const sender = await User.findById(userId).select("username avatar");
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender not found"
      });
    }

    // Create message in database
    const newMessage = new Message({
      channelId,
      userId,
      content: message
    });
    await newMessage.save();

    // Prepare message data for socket emission
    const messageData = {
      channelId,
      messageId: newMessage._id,
      message,
      sender: {
        userId,
        username: sender.username,
        avatar: sender.avatar
      }
    };

    // Get the socket instance
    const io = req.app.get('io');
    console.log("Socket instance:", io);

    // For private channels, send only to allowed users
    if (channel.isPrivate) {
      const allowedUserIds = [
        channel.createdBy.toString(),
        ...channel.allowedUsers.map(id => id.toString())
      ];

      // Send to all online allowed users
      allowedUserIds.forEach(allowedUserId => {
        const receiverSocketId = io.userSocketMap?.[allowedUserId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", messageData);
        }
      });
    } else {
      // For public channels, broadcast to all users in the channel
      io.to(channelId).emit("receiveMessage", messageData);
    }

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: messageData
    });

  } catch (error) {
    console.error("Error in sendMessage controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message"
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
        message: "Channel not found"
      });
    }

    // For private channels, verify access
    if (channel.isPrivate) {
      const hasAccess = channel.createdBy.toString() === userId.toString() ||
        channel.allowedUsers.some(id => id.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to view messages in this private channel"
        });
      }
    }

    // Get messages with pagination
    const messages = await Message.find({ channelId })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('senderId', 'username avatar');

    // Get total count for pagination
    const total = await Message.countDocuments({ channelId });

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error("Error in getChannelMessages controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get messages"
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
        message: "Message not found"
      });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages"
      });
    }

    // Delete the message
    await message.deleteOne();

    // Get the socket instance
    const io = req.app.get('io');

    // Notify channel about deleted message
    io.to(message.channelId.toString()).emit("messageDeleted", {
      channelId: message.channelId,
      messageId: message._id
    });

    res.status(200).json({
      success: true,
      message: "Message deleted successfully"
    });

  } catch (error) {
    console.error("Error in deleteMessage controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message"
    });
  }
};
