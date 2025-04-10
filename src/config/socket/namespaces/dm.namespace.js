import { User } from "../../../models/index.js";
import { socketAuthMiddleware } from "../middleware/auth.middleware.js";

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

    // Send direct message
    socket.on("sendMessage", async ({ receiverId, message }) => {
      try {
        const receiverSocketId = dmUserSocketMap[receiverId];
        if (receiverSocketId) {
          dmNamespace.to(receiverSocketId).emit("receiveDirectMessage", {
            message,
            sender: {
              userId: socket.user._id,
              username: socket.user.username,
              avatar: socket.user.avatar
            }
          });
        }
      } catch (error) {
        console.error("Error sending direct message:", error);
        socket.emit("error", { message: "Failed to send direct message" });
      }
    });

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

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected from DM namespace: ${socket.user.username}`);
      delete dmUserSocketMap[socket.user._id];
    });
  });

  return dmUserSocketMap;
} 