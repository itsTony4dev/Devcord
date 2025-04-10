import { Channel, User, UserWorkspace } from "../../../models/index.js";
import { socketAuthMiddleware } from "../middleware/auth.middleware.js";

export function initializeChannelsNamespace(io) {
  const channelsNamespace = io.of("/channels");
  
  // Store users in channels
  const channelUsers = {};

  // Use shared authentication middleware
  channelsNamespace.use(socketAuthMiddleware);

  channelsNamespace.on("connection", async (socket) => {
    console.log(`User connected to channels namespace: ${socket.user.username}`);

    try {
      // Get user's workspace
      const userWorkspace = await UserWorkspace.findOne({ userId: socket.user._id });
      if (userWorkspace) {
        const workspaceId = userWorkspace.workspaceId.toString();
        
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
          if (!channelUsers[channel._id].includes(socket.user._id)) {
            channelUsers[channel._id].push(socket.user._id);
          }
        });
        
        // Send user's channel list
        socket.emit("userChannels", {
          publicChannels: publicChannels.map(ch => ch._id),
          privateChannels: channels
            .filter(ch => ch.isPrivate && 
              (ch.createdBy.toString() === socket.user._id.toString() || 
               ch.allowedUsers.some(id => id.toString() === socket.user._id.toString())))
            .map(ch => ch._id)
        });
      }
    } catch (error) {
      console.error("Error initializing workspace channels:", error);
      socket.emit("error", { message: "Failed to initialize workspace channels" });
    }

    // Join channel
    socket.on("joinChannel", async ({ channelId }) => {
      try {
        const channel = await Channel.findById(channelId);
        
        if (!channel) {
          return socket.emit("error", { message: "Channel not found" });
        }

        // For private channels, verify access
        if (channel.isPrivate) {
          const hasAccess = channel.createdBy.toString() === socket.user._id.toString() ||
            channel.allowedUsers.some(id => id.toString() === socket.user._id.toString());
          
          if (!hasAccess) {
            return socket.emit("error", { message: "Access denied to private channel" });
          }
        }

        // Join socket room
        socket.join(channelId);
        
        // Track user in channel
        if (!channelUsers[channelId]) {
          channelUsers[channelId] = [];
        }
        
        if (!channelUsers[channelId].includes(socket.user._id)) {
          channelUsers[channelId].push(socket.user._id);
        }

        // Notify channel about new user
        socket.to(channelId).emit("userJoinedChannel", {
          channelId,
          user: {
            userId: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar
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
        channelUsers[channelId] = channelUsers[channelId].filter(id => id !== socket.user._id);
        
        // Clean up empty channels
        if (channelUsers[channelId].length === 0) {
          delete channelUsers[channelId];
        }
      }
      
      // Notify channel
      socket.to(channelId).emit("userLeftChannel", {
        channelId,
        userId: socket.user._id
      });
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
          const hasAccess = channel.createdBy.toString() === socket.user._id.toString() ||
            channel.allowedUsers.some(id => id.toString() === socket.user._id.toString());
          
          if (!hasAccess) {
            return socket.emit("error", { message: "Access denied to private channel" });
          }
        }
        
        // Prepare message data
        const messageData = {
          channelId,
          message,
          sender: {
            userId: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          timestamp: timestamp || new Date().toISOString()
        };
        
        // Broadcast to channel
        channelsNamespace.to(channelId).emit("receiveMessage", messageData);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicator in channel
    socket.on("typing", async ({ channelId, isTyping }) => {
      try {
        const channel = await Channel.findById(channelId);
        
        if (!channel) {
          return socket.emit("error", { message: "Channel not found" });
        }
        
        // For private channels, verify access
        if (channel.isPrivate) {
          const hasAccess = channel.createdBy.toString() === socket.user._id.toString() ||
            channel.allowedUsers.some(id => id.toString() === socket.user._id.toString());
          
          if (!hasAccess) {
            return socket.emit("error", { message: "Access denied to private channel" });
          }
        }
        
        socket.to(channelId).emit("userTyping", {
          channelId,
          userId: socket.user._id,
          username: socket.user.username,
          isTyping
        });
      } catch (error) {
        console.error("Error sending typing indicator:", error);
        socket.emit("error", { message: "Failed to send typing indicator" });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected from channels namespace: ${socket.user.username}`);
      
      // Remove from all channels
      Object.keys(channelUsers).forEach(channelId => {
        if (channelUsers[channelId].includes(socket.user._id)) {
          channelUsers[channelId] = channelUsers[channelId].filter(id => id !== socket.user._id);
          
          // Clean up empty channels
          if (channelUsers[channelId].length === 0) {
            delete channelUsers[channelId];
          }
        }
      });
    });
  });

  return channelUsers;
} 