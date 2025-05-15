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

    // Block user event
    socket.on("blockUser", ({ blockedId }) => {
      console.log(`User ${socket.user.username} (${socket.user._id}) blocked user ${blockedId}`);
      
      // This event is primarily for logging purposes
      // The actual blocking logic happens in the controller
      // and real-time notifications are sent there
    });

    // Unblock user event
    socket.on("unblockUser", ({ unblockedId }) => {
      console.log(`User ${socket.user.username} (${socket.user._id}) unblocked user ${unblockedId}`);
      
      // This event is primarily for logging purposes
      // The actual unblocking logic happens in the controller
      // and real-time notifications are sent there
    });
  });

  return friendsUserSocketMap;
} 