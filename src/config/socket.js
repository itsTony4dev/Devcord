import "dotenv/config";
import { Server } from "socket.io";
import http from "http";
import express from "express";
import { initializeDMNamespace } from "./socket/namespaces/dm.namespace.js";
import { initializeChannelsNamespace } from "./socket/namespaces/channels.namespace.js";
import { initializeFriendsNamespace } from "./socket/namespaces/friends.namespace.js";
import cookieParser from 'cookie-parser';

const app = express();
const server = http.createServer(app);

// Add cookie parser middleware
app.use(cookieParser());

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

// Initialize all namespaces
const dmUserSocketMap = initializeDMNamespace(io);
const channelUsers = initializeChannelsNamespace(io);
const friendsUserSocketMap = initializeFriendsNamespace(io);

// Store user's workspace - {userId: workspaceId}
const userWorkspaceMap = {};

// Attach socket maps to io instance for access in controllers
io.userSocketMap = dmUserSocketMap;
io.channelUsers = channelUsers;
io.userWorkspaceMap = userWorkspaceMap;

// Helper functions for controllers
export function getReceiverSocketId(userId) {
  return dmUserSocketMap[userId];
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
