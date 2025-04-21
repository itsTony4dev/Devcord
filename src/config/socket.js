import "dotenv/config";
import { Server } from "socket.io";
import http from "http";
import express from "express";
import { initializeDMNamespace } from "./socket/namespaces/dm.namespace.js";
import { initializeChannelsNamespace } from "./socket/namespaces/channels.namespace.js";
import { initializeFriendsNamespace } from "./socket/namespaces/friends.namespace.js";
import cookieParser from 'cookie-parser';
import { socketAuthMiddleware } from "./socket/middleware/auth.middleware.js";

const app = express();
const server = http.createServer(app);

// Add cookie parser middleware
app.use(cookieParser());

// Configure Socket.IO with more detailed logging
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  },
  pingTimeout: 60000, // Increase ping timeout for better connection stability
  connectTimeout: 30000, // Increase connection timeout
});

io.use(socketAuthMiddleware)
// Debug socket connections
io.engine.on("connection_error", (err) => {
  console.error("Socket.IO connection error:", err.req.url, err.code, err.message, err.context);
});

// Initialize all namespaces
console.log("Initializing Socket.IO namespaces...");
const dmUserSocketMap = initializeDMNamespace(io);
const channelUsers = initializeChannelsNamespace(io);
const friendsUserSocketMap = initializeFriendsNamespace(io);

// Log maps periodically to check for user connections
setInterval(() => {
  console.log("Current socket connection maps:");
  console.log("- DM connections:", Object.keys(dmUserSocketMap).length);
  console.log("- Channel connections:", Object.keys(channelUsers).length);
  console.log("- Friend connections:", Object.keys(friendsUserSocketMap).length);
}, 10000);

// Store user's workspace - {userId: workspaceId}
const userWorkspaceMap = {};

// Attach socket maps to io instance for access in controllers
io.userSocketMap = dmUserSocketMap;
io.channelUsers = channelUsers;
io.userWorkspaceMap = userWorkspaceMap;

// Helper functions for controllers
export function getReceiverSocketId(userId) {
  const socketId = dmUserSocketMap[userId];
  console.log(`Looking up socket ID for user ${userId}: ${socketId || 'not found'}`);
  return socketId;
}

export function getChannelUsers(channelId) {
  return channelUsers[channelId] || [];
}

export { 
  io, 
  server, 
  app, 
  dmUserSocketMap, 
  channelUsers, 
  friendsUserSocketMap,
  userWorkspaceMap 
};
