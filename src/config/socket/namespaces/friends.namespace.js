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

    // When user disconnects, remove their socket mapping
    socket.on("disconnect", () => {
      delete friendsUserSocketMap[socket.user._id];
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
  });

  return friendsUserSocketMap;
} 