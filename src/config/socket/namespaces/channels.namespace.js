import { Channel, User, UserWorkspace, Message } from "../../../models/index.js";
import { socketAuthMiddleware } from "../middleware/auth.middleware.js";
import cloudinary from "../../../utils/cloudinary/cloudinary.js";

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

    // Send message to channel - UPDATED
    socket.on("sendMessage", async ({ channelId, workspaceId, message, image, timestamp }) => {
      if (!message && !image) return;
      
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
        
        // Process image if provided
        let imageUrl = null;
        if (image) {
          try {
            const uploadResult = await cloudinary.uploader.upload(image);
            imageUrl = uploadResult.secure_url;
          } catch (uploadError) {
            console.error("Image upload error:", uploadError);
            // Continue without image if upload fails
          }
        }
        
        // Save message to database
        const newMessage = new Message({
          channelId,
          userId: socket.user._id,
          content: message,
          image: imageUrl,
          workspaceId: workspaceId || channel.workspaceId,
        });
        
        await newMessage.save();
        
        // Prepare message data with consistent format
        const messageData = {
          _id: newMessage._id,
          channelId,
          workspaceId: workspaceId || channel.workspaceId,
          content: message,
          message, // Include both content and message for compatibility
          image: imageUrl,
          sender: {
            userId: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          senderId: socket.user._id, // Include explicit senderId for easier access
          userId: socket.user._id, // Include userId for compatibility
          timestamp: timestamp || new Date().toISOString(),
          createdAt: timestamp || new Date().toISOString()
        };
        
        // Broadcast ONLY to the specific channel room
        socket.to(channelId).emit("receiveMessage", messageData);
        
        // Also send back to sender with acknowledgment
        socket.emit("messageSent", { 
          success: true, 
          messageId: newMessage._id,
          message: messageData 
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicator in channel - disabled for this implementation
    // socket.on("typing", async ({ channelId, isTyping }) => { ... });

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