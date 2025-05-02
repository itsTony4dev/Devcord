import { socketAuthMiddleware } from "../middleware/auth.middleware.js";
import { DirectMessage } from "../../../models/index.js";

export function initializeDMNamespace(io) {
  const dmNamespace = io.of("/dm");
  
  // Store online users for DM
  const dmUserSocketMap = {};

  // Use shared authentication middleware
  dmNamespace.use(socketAuthMiddleware);

  dmNamespace.on("connection", (socket) => {
    console.log(`User connected to DM namespace: ${socket.user.username}`);
    
    // Store user's socket ID
    dmUserSocketMap[socket.user.id] = socket.id;

    // Typing indicator
    socket.on("typing", ({ receiverId, isTyping }) => {
      try {
        const receiverSocketId = dmUserSocketMap[receiverId];
        if (receiverSocketId) {
          dmNamespace.to(receiverSocketId).emit("typingIndicator", {
            senderId: socket.user._id,
            isTyping,
            sender: {
              username: socket.user.username,
              avatar: socket.user.avatar
            }
          });
        }
      } catch (error) {
        console.error("Error in typing event handler:", error);
        socket.emit("error", { message: "Failed to send typing indicator" });
      }
    });

    // Mark messages as read
    socket.on("markAsRead", async ({ senderId }) => {
      try {
        const senderSocketId = dmUserSocketMap[senderId];
        if (senderSocketId) {
          dmNamespace.to(senderSocketId).emit("messagesRead", {
            senderId,
            receiverId: socket.user._id,
            readAt: new Date()
          });
        }
      } catch (error) {
        console.error("Error in markAsRead event handler:", error);
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    });

    // Handle direct message deletion via socket
    socket.on("deleteMessage", async ({ messageId }) => {
      try {
        // Find the message
        const message = await DirectMessage.findById(messageId);
        
        if (!message) {
          return socket.emit("error", { message: "Message not found" });
        }
        
        // Security: Only message creator can delete it
        if (message.senderId.toString() !== socket.user._id.toString()) {
          return socket.emit("error", { message: "You can only delete your own messages" });
        }
        
        // Soft delete the message
        message.isDeleted = true;
        await message.save();
        
        // Prepare deletion data
        const deletionData = {
          messageId: message._id,
          senderId: message.senderId,
          receiverId: message.receiverId
        };
        
        // Notify the sender (current user)
        socket.emit("directMessageDeleted", deletionData);
        
        // Notify the receiver
        const receiverSocketId = dmUserSocketMap[message.receiverId.toString()];
        if (receiverSocketId) {
          dmNamespace.to(receiverSocketId).emit("directMessageDeleted", deletionData);
        }
        
        // Send confirmation
        socket.emit("messageDeletionConfirmed", { success: true, messageId });
      } catch (error) {
        console.error("Error deleting direct message:", error);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected from DM namespace: ${socket.user.username}`);
      delete dmUserSocketMap[socket.user._id];
    });
  });

  return dmUserSocketMap;
} 