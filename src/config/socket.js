import "dotenv/config";
import { Server } from "socket.io";
import http from "http";
import express from "express";
import { initializeDMNamespace } from "./socket/namespaces/dm.namespace.js";
import { initializeChannelsNamespace } from "./socket/namespaces/channels.namespace.js";
import { initializeFriendsNamespace } from "./socket/namespaces/friends.namespace.js";
import cookieParser from "cookie-parser";
import { socketAuthMiddleware } from "./socket/middleware/auth.middleware.js";

const app = express();
const server = http.createServer(app);

// Add cookie parser middleware
app.use(cookieParser());

// Configure Socket.IO with more detailed logging
const allowedOrigins = process.env.FRONTEND_URL.split(",");
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  pingTimeout: 60000, // Increase ping timeout for better connection stability
  connectTimeout: 30000, // Increase connection timeout
});

io.use(socketAuthMiddleware);
// Debug socket connections
io.engine.on("connection_error", (err) => {
  console.error(
    "Socket.IO connection error:",
    err.req.url,
    err.code,
    err.message,
    err.context
  );
});

const dmUserSocketMap = initializeDMNamespace(io);
const channelUsers = initializeChannelsNamespace(io);
const friendsUserSocketMap = initializeFriendsNamespace(io);

// Store user's workspace - {userId: workspaceId}
const userWorkspaceMap = {};

// Attach socket maps to io instance for access in controllers
io.userSocketMap = dmUserSocketMap;
io.channelUsers = channelUsers;
io.friendsUserSocketMap = friendsUserSocketMap;
io.userWorkspaceMap = userWorkspaceMap;

// Helper functions for controllers
export function getReceiverSocketId(userId) {
  const socketId = dmUserSocketMap[userId];
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
  userWorkspaceMap,
};
