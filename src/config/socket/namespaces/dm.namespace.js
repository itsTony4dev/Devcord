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
    // socket.on("sendMessage", async ({ receiverId, message }, callback) => {
    //   try {
    //     console.log(`Socket message event received from ${socket.user.username} to ${receiverId}:`, message);
        
    //     // Validate input
    //     if (!receiverId) {
    //       console.error("Missing receiverId in sendMessage event");
    //       if (callback) callback({ success: false, error: "Missing receiver ID" });
    //       return;
    //     }
        
    //     if (!message || typeof message !== 'string') {
    //       console.error("Invalid message in sendMessage event");
    //       if (callback) callback({ success: false, error: "Invalid message" });
    //       return;
    //     }
        
    //     // Try to find receiver's socket ID
    //     const receiverSocketId = dmUserSocketMap[receiverId];
    //     if (receiverSocketId) {
    //       console.log(`Found receiver's socket: ${receiverId} -> ${receiverSocketId}`);
          
    //       // Prepare message data
    //       const messageData = {
    //         message,
    //         sender: {
    //           userId: socket.user._id,
    //           username: socket.user.username,
    //           avatar: socket.user.avatar
    //         },
    //         timestamp: new Date()
    //       };
          
    //       // Emit to receiver
    //       // dmNamespace.to(receiverSocketId).emit("receiveDirectMessage", messageData);
    //       console.log(`Message emitted to receiver ${receiverId}`);
          
    //       // Send acknowledgment
    //       if (callback) callback({ success: true, message: "Message sent successfully" });
    //     } else {
    //       console.log(`Receiver socket not found for user ${receiverId}`);
    //       // Still return success as the user may be offline but the message is saved in DB
    //       if (callback) callback({ success: true, message: "Message sent but user is offline" });
    //     }
    //   } catch (error) {
    //     console.error("Error sending direct message:", error);
    //     // Send error to client
    //     socket.emit("error", { message: "Failed to send direct message" });
    //     // Send acknowledgment with error
    //     if (callback) callback({ success: false, error: error.message });
    //   }
    // });

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