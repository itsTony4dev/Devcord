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

    // Join all channels in a workspace
    socket.on("joinWorkspace", async ({ workspaceId }) => {
      if (!workspaceId) {
        return socket.emit("error", { message: "Workspace ID is required" });
      }
      
      try {
        console.log(`User ${socket.user.username} joining all channels in workspace ${workspaceId}`);
        
        // Get all channels in the workspace
        const channels = await Channel.find({ workspaceId });
        
        if (!channels || channels.length === 0) {
          console.log(`No channels found for workspace ${workspaceId}`);
          return socket.emit("workspaceChannels", { 
            workspaceId, 
            channels: [],
            message: "No channels found for this workspace" 
          });
        }
        
        console.log(`Found ${channels.length} channels in workspace ${workspaceId}`);
        
        // Split channels into public and private
        const publicChannels = channels.filter(channel => !channel.isPrivate);
        const privateChannels = channels.filter(channel => 
          channel.isPrivate && 
          (
            channel.createdBy.toString() === socket.user._id.toString() ||
            channel.allowedUsers.some(id => id.toString() === socket.user._id.toString())
          )
        );
        
        // Join all accessible channels
        const joinedChannels = [];
        
        // Join public channels
        for (const channel of publicChannels) {
          const channelId = channel._id.toString();
          socket.join(channelId);
          
          // Track user in channel
          if (!channelUsers[channelId]) {
            channelUsers[channelId] = [];
          }
          
          if (!channelUsers[channelId].includes(socket.user._id)) {
            channelUsers[channelId].push(socket.user._id);
          }
          
          joinedChannels.push(channelId);
        }
        
        // Join private channels with access
        for (const channel of privateChannels) {
          const channelId = channel._id.toString();
          socket.join(channelId);
          
          // Track user in channel
          if (!channelUsers[channelId]) {
            channelUsers[channelId] = [];
          }
          
          if (!channelUsers[channelId].includes(socket.user._id)) {
            channelUsers[channelId].push(socket.user._id);
          }
          
          joinedChannels.push(channelId);
        }
        
        console.log(`User ${socket.user.username} joined ${joinedChannels.length} channels in workspace ${workspaceId}`);
        
        // Send confirmation with joined channels
        socket.emit("workspaceChannelsJoined", {
          workspaceId,
          joinedChannels
        });
        
      } catch (error) {
        console.error(`Error joining workspace channels for ${workspaceId}:`, error);
        socket.emit("error", { message: "Failed to join workspace channels" });
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

    // Handle message reactions
    socket.on("addReaction", async ({ messageId, channelId, reaction }) => {
      try {
        const message = await Message.findById(messageId);
        
        if (!message) {
          return socket.emit("error", { message: "Message not found" });
        }
        
        // Get channel for access control
        const channel = await Channel.findById(message.channelId);
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
        
        // Initialize reactions array if it doesn't exist
        if (!message.reactions) {
          message.reactions = [];
        }
        
        // Check if user already reacted with this emoji
        const existingReactionIndex = message.reactions.findIndex(r => 
          r.userId.toString() === socket.user._id.toString() && 
          r.reaction === reaction
        );
        
        if (existingReactionIndex !== -1) {
          // Remove the reaction if it already exists (toggle behavior)
          message.reactions.splice(existingReactionIndex, 1);
        } else {
          // Add the new reaction
          message.reactions.push({
            userId: socket.user._id,
            reaction,
            username: socket.user.username
          });
        }
        
        // Save the updated message
        await message.save();
        
        // Prepare reaction data
        const reactionData = {
          messageId: message._id,
          channelId: message.channelId,
          reactions: message.reactions,
          user: {
            userId: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar
          }
        };
        
        // Broadcast to everyone in the channel including sender
        io.of("/channels").to(message.channelId.toString()).emit("messageReaction", reactionData);
        
      } catch (error) {
        console.error("Error handling reaction:", error);
        socket.emit("error", { message: "Failed to process reaction" });
      }
    });
    
    // Handle message deletion
    socket.on("deleteMessage", async ({ messageId, channelId }) => {
      try {
        const message = await Message.findById(messageId);
        
        if (!message) {
          return socket.emit("error", { message: "Message not found" });
        }
        
        // Security: Only message creator can delete it
        if (message.userId.toString() !== socket.user._id.toString()) {
          return socket.emit("error", { message: "You can only delete your own messages" });
        }
        
        // Delete the message
        await Message.findByIdAndDelete(messageId);
        
        // Prepare deletion data
        const deletionData = {
          messageId,
          channelId: message.channelId,
          userId: socket.user._id,
        };
        
        // Broadcast to everyone in the channel including sender
        io.of("/channels").to(message.channelId.toString()).emit("messageDeleted", deletionData);
        
        // Confirm to sender
        socket.emit("messageDeletionConfirmed", { success: true, messageId });
        
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", { message: "Failed to delete message" });
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