import { DirectMessage, Friends, User } from "../../models/index.js";
import cloudinary from "../../utils/cloudinary/cloudinary.js";

/**
 * Send a direct message to a friend
 */
export const sendDirectMessage = async (req, res) => {
  
  try {
    const { receiverId } = req.params;
    const { content, isCode, language, image } = req.body;
    const senderId = req.user._id;

    if (!content && !image) {
      return res.status(400).json({
        success: false,
        message: "Cannot send empty message",
      });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    // Check if users are friends
    const areFriends = await Friends.findOne({
      $or: [
        { userId: senderId, friendId: receiverId, status: "accepted" },
        { userId: receiverId, friendId: senderId, status: "accepted" },
      ],
    });

    if (!areFriends) {
      return res.status(403).json({
        success: false,
        message: "You can only send messages to friends",
      });
    }

    // Check if either user has blocked the other
    const isBlocked = await Friends.findOne({
      $or: [
        { userId: senderId, friendId: receiverId, status: "blocked" },
        { userId: receiverId, friendId: senderId, status: "blocked" },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Cannot send message due to blocking",
      });
    }

    let imageUrl = null;
    if (image) {
      imageUrl = await cloudinary.uploader.upload(image);
      imageUrl = imageUrl.secure_url;
    }
console.log("5aye jouxxx l2asle",imageUrl);

    // Create new direct message
    const newMessage = new DirectMessage({
      senderId,
      receiverId,
      content,
      image: imageUrl,
      isCode: isCode || false,
      language: language || null,
    });

    await newMessage.save();

    // Get sender info
    const sender = await User.findById(senderId).select("username avatar");

    // Prepare message data for socket emission
    const messageData = {
      messageId: newMessage._id,
      senderId,
      receiverId,
      content,
      image: imageUrl,
      isCode: newMessage.isCode,
      language: newMessage.language,
      createdAt: newMessage.createdAt,
      sender: {
        username: sender.username,
        avatar: sender.avatar,
      },
    };

    // Get the socket instance
    const io = req.app.get("io");

    // Get receiver's socket ID
    const receiverSocketId = io.userSocketMap?.[receiverId];

    // Send to receiver if online
    if (receiverSocketId) {
      io.of("/dm").to(receiverSocketId).emit("receiveDirectMessage", messageData);
    }
console.log("5aye touxxx l2asle",messageData);

    res.status(201).json({
      success: true,
      message: "Direct message sent successfully",
      data: messageData,
    });
  } catch (error) {
    console.error("Error in sendDirectMessage controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send direct message",
    });
  }
};

/**
 * Get conversation history between two users
 */
export const getConversation = async (req, res) => {
  try {
    const { friendId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    const userId = req.user._id;

    // Check if friend exists
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({
        success: false,
        message: "Friend not found",
      });
    }

    // Check if users are friends
    const areFriends = await Friends.findOne({
      $or: [
        { userId, friendId, status: "accepted" },
        { userId: friendId, friendId: userId, status: "accepted" },
      ],
    });

    if (!areFriends) {
      return res.status(403).json({
        success: false,
        message: "You can only view conversations with friends",
      });
    }

    // Get conversation with pagination
    const conversation = await DirectMessage.findConversation(
      userId,
      friendId,
      parseInt(limit),
      before
    );

    // Mark messages as read
    await DirectMessage.markAsRead(userId, friendId);

    // Get total count for pagination
    const total = await DirectMessage.countDocuments({
      $or: [
        { senderId: userId, receiverId: friendId, isDeleted: false },
        { senderId: friendId, receiverId: userId, isDeleted: false },
      ],
    });

    // Notify sender that messages have been read
    const io = req.app.get("io");
    const friendSocketId = io.userSocketMap?.[friendId];

    if (friendSocketId) {
      io.to(friendSocketId).emit("messagesRead", {
        senderId: friendId,
        receiverId: userId,
        readAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        conversation,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error in getConversation controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve conversation",
    });
  }
};

/**
 * Delete a direct message
 */
export const deleteDirectMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the message
    const message = await DirectMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages",
      });
    }

    // Soft delete the message
    message.isDeleted = true;
    await message.save();

    // Get the socket instance
    const io = req.app.get("io");

    // Notify the receiver about deleted message
    const receiverSocketId = io.userSocketMap?.[message.receiverId.toString()];
    if (receiverSocketId) {
      io.of("/dm").to(receiverSocketId).emit("directMessageDeleted", {
        messageId: message._id,
        senderId: message.senderId,
        receiverId: message.receiverId,
      });
    }

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteDirectMessage controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
};

/**
 * Get unread messages count for a user
 */
export const getUnreadMessagesCount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all unread messages
    const unreadMessages = await DirectMessage.findUnreadMessages(userId);

    // Group by sender
    const unreadCounts = {};
    unreadMessages.forEach((message) => {
      const senderId = message.senderId._id.toString();
      if (!unreadCounts[senderId]) {
        unreadCounts[senderId] = {
          count: 0,
          sender: {
            id: senderId,
            username: message.senderId.username,
            avatar: message.senderId.avatar,
          },
        };
      }
      unreadCounts[senderId].count++;
    });

    res.status(200).json({
      success: true,
      data: Object.values(unreadCounts),
    });
  } catch (error) {
    console.error("Error in getUnreadMessagesCount controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unread messages count",
    });
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const receiverId = req.user._id;

    // Mark all messages from sender as read
    const result = await DirectMessage.markAsRead(receiverId, senderId);

    // Notify sender that messages have been read
    const io = req.app.get("io");
    const senderSocketId = io.userSocketMap?.[senderId];

    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", {
        senderId,
        receiverId,
        readAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
      data: {
        updated: result.nModified || 0,
      },
    });
  } catch (error) {
    console.error("Error in markMessagesAsRead controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
    });
  }
};

/**
 * Send typing indicator
 * This is just an indicator for real-time notification,
 * no need to store in the database
 */
export const sendTypingIndicator = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const { isTyping } = req.body;
    const senderId = req.user._id;

    // Check if users are friends
    const areFriends = await Friends.findOne({
      $or: [
        { userId: senderId, friendId: receiverId, status: "accepted" },
        { userId: receiverId, friendId: senderId, status: "accepted" },
      ],
    });

    if (!areFriends) {
      return res.status(403).json({
        success: false,
        message: "Invalid friend relationship",
      });
    }

    // Get sender info
    const sender = await User.findById(senderId).select("username avatar");

    // Get the socket instance
    const io = req.app.get("io");

    // Get receiver's socket ID
    const receiverSocketId = io.userSocketMap?.[receiverId];

    // Send typing indicator to receiver if online
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typingIndicator", {
        senderId,
        isTyping,
        sender: {
          username: sender.username,
          avatar: sender.avatar,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Typing indicator sent",
    });
  } catch (error) {
    console.error("Error in sendTypingIndicator controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send typing indicator",
    });
  }
};

/**
 * Search messages in a conversation
 */
export const searchMessages = async (req, res) => {
  try {
    const { friendId } = req.params;
    const { query, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    // Check if users are friends
    const areFriends = await Friends.findOne({
      $or: [
        { userId, friendId, status: "accepted" },
        { userId: friendId, friendId: userId, status: "accepted" },
      ],
    });

    if (!areFriends) {
      return res.status(403).json({
        success: false,
        message: "You can only search messages with friends",
      });
    }

    // Create search query
    const searchQuery = {
      $or: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
      content: { $regex: query, $options: "i" },
    };

    // Get total count for pagination
    const total = await DirectMessage.countDocuments(searchQuery);

    // Get paginated results
    const messages = await DirectMessage.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("senderId", "username avatar")
      .populate("receiverId", "username avatar");

    // Format the response
    const formattedMessages = messages.map((message) => ({
      messageId: message._id,
      senderId: message.senderId._id,
      receiverId: message.receiverId._id,
      content: message.content,
      isCode: message.isCode,
      language: message.language,
      createdAt: message.createdAt,
      sender: {
        username: message.senderId.username,
        avatar: message.senderId.avatar,
      },
      receiver: {
        username: message.receiverId.username,
        avatar: message.receiverId.avatar,
      },
    }));

    res.status(200).json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error in searchMessages controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search messages",
      error: error.message,
    });
  }
};
