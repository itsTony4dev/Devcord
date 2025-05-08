import { User } from "../../../models/index.js";
import { socketAuthMiddleware } from "../middleware/auth.middleware.js";

export function initializeFriendsNamespace(io) {
  const friendsNamespace = io.of("/friends");
  
  // Store online users for friends
  const friendsUserSocketMap = {};

  // Use shared authentication middleware
  friendsNamespace.use(socketAuthMiddleware);

  friendsNamespace.on("connection", (socket) => {
    console.log(`User connected to friends namespace: ${socket.user.username}`);
    
    // Store user's socket ID
    friendsUserSocketMap[socket.user._id] = socket.id;

    // Friend request
    socket.on("friendRequest", async ({ receiverId }) => {
      try {
        const receiverSocketId = friendsUserSocketMap[receiverId];
        if (receiverSocketId) {
          friendsNamespace.to(receiverSocketId).emit("newFriendRequest", {
            sender: {
              userId: socket.user._id,
              username: socket.user.username,
              avatar: socket.user.avatar
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Error sending friend request:", error);
        socket.emit("error", { message: "Failed to send friend request" });
      }
    });

    // Accept friend request
    socket.on("acceptFriendRequest", async ({ senderId }) => {
      try {
        const senderSocketId = friendsUserSocketMap[senderId];
        if (senderSocketId) {
          friendsNamespace.to(senderSocketId).emit("friendRequestAccepted", {
            receiver: {
              userId: socket.user._id,
              username: socket.user.username,
              avatar: socket.user.avatar
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Error accepting friend request:", error);
        socket.emit("error", { message: "Failed to accept friend request" });
      }
    });

    // Reject friend request
    socket.on("rejectFriendRequest", async ({ senderId }) => {
      try {
        const senderSocketId = friendsUserSocketMap[senderId];
        if (senderSocketId) {
          friendsNamespace.to(senderSocketId).emit("friendRequestRejected", {
            receiver: {
              userId: socket.user._id,
              username: socket.user.username
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Error rejecting friend request:", error);
        socket.emit("error", { message: "Failed to reject friend request" });
      }
    });

    // Remove friend
    socket.on("removeFriend", async ({ friendId }) => {
      try {
        const friendSocketId = friendsUserSocketMap[friendId];
        if (friendSocketId) {
          friendsNamespace.to(friendSocketId).emit("friendRemoved", {
            userId: socket.user._id,
            username: socket.user.username,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Error removing friend:", error);
        socket.emit("error", { message: "Failed to remove friend" });
      }
    });

    // Online status
    socket.on("onlineStatus", ({ isOnline }) => {
      // Notify all friends about online status change
      socket.broadcast.emit("friendStatusChanged", {
        userId: socket.user._id,
        username: socket.user.username,
        isOnline,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected from friends namespace: ${socket.user.username}`);
      delete friendsUserSocketMap[socket.user._id];
      
      // Notify all friends about offline status
      socket.broadcast.emit("friendStatusChanged", {
        userId: socket.user._id,
        username: socket.user.username,
        isOnline: false,
        timestamp: new Date().toISOString()
      });
    });
  });

  return friendsUserSocketMap;
} 