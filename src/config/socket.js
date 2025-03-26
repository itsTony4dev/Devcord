import "dotenv/config";
import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import { Channel, User } from "../models/index.js";
import cookieParser from 'cookie-parser';

const app = express();
const server = http.createServer(app);

// Add cookie parser middleware
app.use(cookieParser());

const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL],
    credentials: true
  },
  pingTimeout: 60000, // Close connection after 60s of inactivity
});

// Store online users - {userId: socketId}
const userSocketMap = {}; 

// Store users in channels - {channelId: [userId1, userId2, ...]}
const channelUsers = {};

// Get receiver socket ID for direct messages
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Get all users in a channel
export function getChannelUsers(channelId) {
  return channelUsers[channelId] || [];
}

// Middleware to authenticate socket connections
io.use(async (socket, next) => {
  try {
    // Get token from cookie
    const token = socket.handshake.headers.cookie?.split('jwt=')[1]?.split(';')[0];
    
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded) {
      return next(new Error("Authentication error: Invalid token"));
    }
    
    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.username = decoded.username || "Anonymous";
    
    next();
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    next(new Error("Authentication error"));
  }
});

// Socket connection handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  const userId = socket.userId;
  
  // Store user's socket ID
  if (userId) {
    userSocketMap[userId] = socket.id;
    // Broadcast online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    
    // Send welcome message
    socket.emit("welcome", {
      message: `Welcome ${socket.username}!`,
      userId
    });
  }
  
  // Join channel
  socket.on("joinChannel", async ({ channelId }) => {
    try {
      // Validate channel existence and access
      const channel = await Channel.findById(channelId);
      
      if (!channel) {
        return socket.emit("error", { message: "Channel not found" });
      }
      
      // Check if private channel & verify access
      if (channel.isPrivate) {
        const hasAccess = channel.createdBy.toString() === userId ||
          channel.allowedUsers.some(id => id.toString() === userId);
        
        if (!hasAccess) {
          return socket.emit("error", { message: "Access denied to private channel" });
        }
      }
      
      // Join socket room for this channel
      socket.join(channelId);
      
      // Track user in channel
      if (!channelUsers[channelId]) {
        channelUsers[channelId] = [];
      }
      
      if (!channelUsers[channelId].includes(userId)) {
        channelUsers[channelId].push(userId);
      }
      
      // Get user info
      const user = await User.findById(userId).select("username avatar");
      
      // Notify channel about new user
      socket.to(channelId).emit("userJoinedChannel", {
        channelId,
        user: {
          userId,
          username: user?.username || socket.username,
          avatar: user?.avatar
        }
      });
      
      // Send list of users in channel
      const channelUserIds = channelUsers[channelId];
      const channelUsersList = await User.find({ _id: { $in: channelUserIds } })
        .select("_id username avatar");
      
      socket.emit("channelUsers", {
        channelId,
        users: channelUsersList
      });
      
      console.log(`User ${userId} joined channel ${channelId}`);
    } catch (error) {
      console.error("Error joining channel:", error);
      socket.emit("error", { message: "Failed to join channel" });
    }
  });
  
  // Leave channel
  socket.on("leaveChannel", ({ channelId }) => {
    socket.leave(channelId);
    
    // Remove user from channel tracking
    if (channelUsers[channelId]) {
      channelUsers[channelId] = channelUsers[channelId].filter(id => id !== userId);
      
      // Clean up empty channels
      if (channelUsers[channelId].length === 0) {
        delete channelUsers[channelId];
      }
    }
    
    // Notify channel
    socket.to(channelId).emit("userLeftChannel", {
      channelId,
      userId
    });
    
    console.log(`User ${userId} left channel ${channelId}`);
  });
  
  // Send message to channel
  socket.on("sendMessage", ({ channelId, message, timestamp }) => {
    if (!message.trim()) return;
    
    // Broadcast to everyone in the channel except sender
    socket.to(channelId).emit("receiveMessage", {
      channelId,
      message,
      sender: {
        userId,
        username: socket.username
      },
      timestamp: timestamp || new Date().toISOString()
    });
  });
  
  // Send typing indicator
  socket.on("typing", ({ channelId, isTyping }) => {
    socket.to(channelId).emit("userTyping", {
      channelId,
      userId,
      username: socket.username,
      isTyping
    });
  });
  
  // Direct message
  socket.on("sendDirectMessage", ({ receiverId, message, timestamp }) => {
    const receiverSocketId = userSocketMap[receiverId];
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveDirectMessage", {
        message,
        sender: {
          userId,
          username: socket.username
        },
        timestamp: timestamp || new Date().toISOString()
      });
    }
  });
  
  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    // Remove from online users
    delete userSocketMap[userId];
    
    // Remove from all channels
    Object.keys(channelUsers).forEach(channelId => {
      if (channelUsers[channelId].includes(userId)) {
        channelUsers[channelId] = channelUsers[channelId].filter(id => id !== userId);
        
        // Notify channel members
        io.to(channelId).emit("userLeftChannel", {
          channelId,
          userId
        });
        
        // Clean up empty channels
        if (channelUsers[channelId].length === 0) {
          delete channelUsers[channelId];
        }
      }
    });
    
    // Broadcast updated online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
  
  // Error handling
  socket.on("error", (error) => {
    console.error("Socket error:", error);
    socket.emit("error", { message: "An unexpected error occurred" });
  });
});

export { io, app, server };
