import "dotenv/config";
import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import { Channel, User, UserWorkspace } from "../models/index.js";
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

// Store user's workspace - {userId: workspaceId}
const userWorkspaceMap = {};

// Attach socket maps to io instance for access in controllers
io.userSocketMap = userSocketMap;
io.channelUsers = channelUsers;
io.userWorkspaceMap = userWorkspaceMap;

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
io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);
  
  const userId = socket.userId;
  
  try {
    // Store user's socket ID
    if (userId) {
      userSocketMap[userId] = socket.id;
      
      // Get user's workspace
      const userWorkspace = await UserWorkspace.findOne({ userId });
      if (userWorkspace) {
        const workspaceId = userWorkspace.workspaceId.toString();
        userWorkspaceMap[userId] = workspaceId;
        
        // Join workspace room automatically
        socket.join(workspaceId);
        
        // Get all channels in workspace
        const channels = await Channel.find({ workspaceId });
        
        // Join public channels automatically
        const publicChannels = channels.filter(channel => !channel.isPrivate);
        publicChannels.forEach(channel => {
          socket.join(channel._id.toString());
          if (!channelUsers[channel._id]) {
            channelUsers[channel._id] = [];
          }
          if (!channelUsers[channel._id].includes(userId)) {
            channelUsers[channel._id].push(userId);
          }
        });
        
        // Send user's channel list
        socket.emit("userChannels", {
          publicChannels: publicChannels.map(ch => ch._id),
          privateChannels: channels
            .filter(ch => ch.isPrivate && 
              (ch.createdBy.toString() === userId || 
               ch.allowedUsers.some(id => id.toString() === userId)))
            .map(ch => ch._id)
        });
      }
      
      // Broadcast online users
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
      
      // Send welcome message
      socket.emit("welcome", {
        message: `Welcome ${socket.username}!`,
        userId
      });
    }
  } catch (error) {
    console.error("Error in connection handler:", error);
    socket.emit("error", { message: "Failed to initialize connection" });
  }
  
  // Join private channel
  socket.on("joinPrivateChannel", async ({ channelId }) => {
    try {
      const channel = await Channel.findById(channelId);
      
      if (!channel) {
        return socket.emit("error", { message: "Channel not found" });
      }
      
      if (!channel.isPrivate) {
        return socket.emit("error", { message: "This is not a private channel" });
      }
      
      // Check if user has access
      const hasAccess = channel.createdBy.toString() === userId ||
        channel.allowedUsers.some(id => id.toString() === userId);
      
      if (!hasAccess) {
        return socket.emit("error", { message: "Access denied to private channel" });
      }
      
      // Join socket room
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
      
      console.log(`User ${userId} joined private channel ${channelId}`);
    } catch (error) {
      console.error("Error joining private channel:", error);
      socket.emit("error", { message: "Failed to join private channel" });
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
  socket.on("sendMessage", async ({ channelId, message, timestamp }) => {
    if (!message.trim()) return;
    
    try {
      const channel = await Channel.findById(channelId);
      
      if (!channel) {
        return socket.emit("error", { message: "Channel not found" });
      }
      
      // For private channels, verify access
      if (channel.isPrivate) {
        const hasAccess = channel.createdBy.toString() === userId ||
          channel.allowedUsers.some(id => id.toString() === userId);
        
        if (!hasAccess) {
          return socket.emit("error", { message: "Access denied to private channel" });
        }
      }
      
      // Get sender info
      const sender = await User.findById(userId).select("username avatar");
      
      // Prepare message data
      const messageData = {
        channelId,
        message,
        sender: {
          userId,
          username: sender?.username || socket.username,
          avatar: sender?.avatar
        },
        timestamp: timestamp || new Date().toISOString()
      };
      
      // For private channels, send only to allowed users
      if (channel.isPrivate) {
        const allowedUserIds = [
          channel.createdBy.toString(),
          ...channel.allowedUsers.map(id => id.toString())
        ];
        
        // Send to all online allowed users
        allowedUserIds.forEach(allowedUserId => {
          const receiverSocketId = userSocketMap[allowedUserId];
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("receiveMessage", messageData);
          }
        });
      } else {
        // For public channels, broadcast to all users in the channel
        socket.to(channelId).emit("receiveMessage", messageData);
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });
  
  // Send typing indicator
  socket.on("typing", async ({ channelId, isTyping }) => {
    try {
      const channel = await Channel.findById(channelId);
      
      if (!channel) {
        return socket.emit("error", { message: "Channel not found" });
      }
      
      // For private channels, verify access
      if (channel.isPrivate) {
        const hasAccess = channel.createdBy.toString() === userId ||
          channel.allowedUsers.some(id => id.toString() === userId);
        
        if (!hasAccess) {
          return socket.emit("error", { message: "Access denied to private channel" });
        }
      }
      
      socket.to(channelId).emit("userTyping", {
        channelId,
        userId,
        username: socket.username,
        isTyping
      });
    } catch (error) {
      console.error("Error sending typing indicator:", error);
      socket.emit("error", { message: "Failed to send typing indicator" });
    }
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
    delete userWorkspaceMap[userId];
    
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

export { io, app, server, userSocketMap, channelUsers, userWorkspaceMap };
