import { Channel, User, UserWorkspace, Message } from "../../../models/index.js";
import { socketAuthMiddleware } from "../middleware/auth.middleware.js";
import cloudinary from "../../../utils/cloudinary/cloudinary.js";

export function initializeChannelsNamespace(io) {
  const channelsNamespace = io.of("/channels");
  
  // Store users in channels - Map channelId to array of userIds
  const channelUsers = {};
  // Track user socket associations - Map userId to socketId
  const userSocketMap = {};

  // Use shared authentication middleware
  channelsNamespace.use(socketAuthMiddleware);

  channelsNamespace.on("connection", async (socket) => {
    console.log(`User connected to channels namespace: ${socket.user.username} (${socket.user._id}) [Socket ID: ${socket.id}]`);
    
    // Track this user's socket
    userSocketMap[socket.user._id] = socket.id;
    
    // When a user disconnects, remove their socket mapping
    socket.on("disconnect", () => {
      console.log(`User disconnected from channels namespace: ${socket.user.username} (${socket.user._id})`);
      
      // Remove user from all channels they were in
      Object.keys(channelUsers).forEach(channelId => {
        if (channelUsers[channelId] && channelUsers[channelId].includes(socket.user._id)) {
          channelUsers[channelId] = channelUsers[channelId].filter(id => id !== socket.user._id);
          
          // Notify channel about user leaving
          socket.to(channelId).emit("userLeftChannel", {
            channelId,
            userId: socket.user._id
          });
        }
      });
      
      // Remove from socket map
      delete userSocketMap[socket.user._id];
    });

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
        
        // Join private channels user has access to
        const privateChannels = channels.filter(channel => 
          channel.isPrivate && 
          (channel.createdBy.toString() === socket.user._id.toString() || 
           channel.allowedUsers.some(id => id.toString() === socket.user._id.toString()))
        );
        
        privateChannels.forEach(channel => {
          const channelId = channel._id.toString();
          socket.join(channelId);
          if (!channelUsers[channelId]) {
            channelUsers[channelId] = [];
          }
          if (!channelUsers[channelId].includes(socket.user._id)) {
            channelUsers[channelId].push(socket.user._id);
          }
        });
        
        // Send user's channel list
        socket.emit("userChannels", {
          publicChannels: publicChannels.map(ch => ch._id),
          privateChannels: privateChannels.map(ch => ch._id)
        });
      }
    } catch (error) {
      console.error("Error initializing workspace channels:", error);
      socket.emit("error", { message: "Failed to initialize workspace channels" });
    }

    // Handle user presence events
    socket.on("userPresence", ({ channelId, status }) => {
      if (!channelId) return;
      
      console.log(`User ${socket.user.username} (${socket.user._id}) presence update: ${status} in channel ${channelId}`);
      
      // Broadcast user presence to channel
      socket.to(channelId).emit("userPresenceUpdate", {
        channelId,
        userId: socket.user._id,
        username: socket.user.username,
        status
      });
    });

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
        
        console.log(`User ${socket.user.username} (${socket.user._id}) [Socket ID: ${socket.id}] joined channel ${channelId}`);
        console.log(`Current users in channel ${channelId}:`, channelUsers[channelId]);
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

    // Send message to channel 
    socket.on("sendMessage", async ({ channelId, workspaceId, message, image, timestamp, isCode, language }) => {
      if (!message && !image) return;
      
      try {
        const channel = await Channel.findById(channelId);
        
        if (!channel) {
          return socket.emit("error", { message: "Channel not found" });
        }
        
        // For private channels, verify access
        const isChannelPrivate = channel.isPrivate;
        const isChannelOwner = channel.createdBy.toString() === socket.user._id.toString();
        const isChannelMember = channel.allowedUsers.some(id => id.toString() === socket.user._id.toString());
        const hasAccess = isChannelOwner || isChannelMember;
        
        if (isChannelPrivate && !hasAccess) {
          return socket.emit("error", { message: "Access denied to private channel" });
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
          isCode: isCode || false,
          lang: language || null
        });
        
        await newMessage.save();
        
        // Prepare message data with consistent format
        const messageData = {
          _id: newMessage._id,
          channelId,
          workspaceId: workspaceId || channel.workspaceId,
          content: message,
          message,
          image: imageUrl,
          sender: {
            userId: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          senderId: socket.user._id,
          userId: socket.user._id,
          timestamp: timestamp || new Date().toISOString(),
          createdAt: timestamp || new Date().toISOString(),
          channelName: channel.name,
          isCode: isCode || false,
          language: language || null
        };
        
        // Log information about the message being sent
        console.log(`User ${socket.user.username} (${socket.user._id}) sent message to channel ${channelId} (private: ${isChannelPrivate})`);
        
        if (isChannelPrivate) {
          // Special handling for private channels
          if (isChannelOwner) {
            // Owner sending to members
            console.log(`Channel owner sending to ${channel.allowedUsers.length} members`);
            
            // Ensure each allowed user gets the message
            for (const userId of channel.allowedUsers) {
              const recipientId = userId.toString();
              const recipientSocketId = userSocketMap[recipientId];
              
              if (recipientSocketId) {
                console.log(`Direct message to member ${recipientId} via socket ${recipientSocketId}`);
                channelsNamespace.to(recipientSocketId).emit("receiveMessage", messageData);
              }
            }
          } else if (isChannelMember) {
            // Member sending to owner
            const ownerId = channel.createdBy.toString();
            const ownerSocketId = userSocketMap[ownerId];
            
            if (ownerSocketId) {
              console.log(`Member sending to owner ${ownerId} via socket ${ownerSocketId}`);
              channelsNamespace.to(ownerSocketId).emit("receiveMessage", messageData);
            }
            
            // Also send to other members in the channel
            for (const userId of channel.allowedUsers) {
              const memberId = userId.toString();
              // Skip sender
              if (memberId === socket.user._id.toString()) continue;
              
              const memberSocketId = userSocketMap[memberId];
              if (memberSocketId) {
                console.log(`Member sending to other member ${memberId} via socket ${memberSocketId}`);
                channelsNamespace.to(memberSocketId).emit("receiveMessage", messageData);
              }
            }
          }
        } else {
          // Public channel - broadcast to room (all joined members)
          socket.to(channelId).emit("receiveMessage", messageData);
        }
        
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
        console.log(`Processing reaction "${reaction}" for message ${messageId} from user ${socket.user.username}`);
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
        
        // Prevent users from reacting to their own messages
        if (message.userId.toString() === socket.user._id.toString()) {
          return socket.emit("error", { message: "You cannot react to your own message" });
        }
        
        // Initialize reactions array if it doesn't exist
        if (!message.reactions) {
          message.reactions = [];
        }
        
        const currentUserId = socket.user._id.toString();
        
        // First, find and remove any existing reactions from this user (one user, one reaction policy)
        let removedExistingReaction = false;
        let wasRemovingSameEmoji = false;
        
        console.log(`Checking if user ${currentUserId} has existing reactions`);
        
        for (let i = message.reactions.length - 1; i >= 0; i--) {
          const r = message.reactions[i];
          if (!r.users) continue;
          
          // Check if user has already reacted with any emoji
          const userIndexInReaction = r.users.findIndex(userId => 
            userId && userId.toString && userId.toString() === currentUserId
          );
          
          if (userIndexInReaction !== -1) {
            console.log(`Found existing reaction: ${r.emoji} for user ${currentUserId}`);
            
            // Check if removing the same emoji they clicked on
            if (r.emoji === reaction) {
              wasRemovingSameEmoji = true;
              console.log(`User is removing the same emoji: ${reaction}`);
            }
            
            // Remove user from this reaction
            r.users.splice(userIndexInReaction, 1);
            removedExistingReaction = true;
            
            // Remove the entire reaction if no users left
            if (r.users.length === 0) {
              console.log(`Removing reaction ${r.emoji} entirely as no users left`);
              message.reactions.splice(i, 1);
            }
          }
        }
        
        // If the user clicked on the same emoji they already reacted with, just remove it (toggle off)
        // Otherwise, add the new reaction
        if (!wasRemovingSameEmoji) {
          console.log(`Adding/changing reaction to: ${reaction}`);
          // User is adding a new reaction or changing to a different one
          const existingReactionIndex = message.reactions.findIndex(r => r.emoji === reaction);
          
          if (existingReactionIndex !== -1) {
            // Add user to existing reaction
            console.log(`Adding user to existing ${reaction} reaction`);
            message.reactions[existingReactionIndex].users.push(socket.user._id);
          } else {
            // Create new reaction
            console.log(`Creating new reaction: ${reaction}`);
            message.reactions.push({
              emoji: reaction,
              users: [socket.user._id]
            });
          }
        } else {
          console.log(`User toggled off their ${reaction} reaction - not adding a new one`);
        }
        
        // Save the updated message
        const updatedMessage = await message.save();
        
        console.log(`Updated message reactions:`, updatedMessage.reactions);
        
        // Populate user details
        await updatedMessage.populate('reactions.users', 'username avatar');
        
        // Format reactions for the frontend
        const formattedReactions = updatedMessage.reactions.map(reaction => ({
          emoji: reaction.emoji,
          users: reaction.users.map(user => ({
            _id: user._id || user,
            username: user.username || 'Unknown',
            avatar: user.avatar
          })),
          count: reaction.users.length
        }));
        
        // Prepare reaction data
        const reactionData = {
          messageId: updatedMessage._id,
          channelId: updatedMessage.channelId,
          reactions: formattedReactions,
          user: {
            userId: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar
          }
        };
        
        console.log(`Broadcasting reaction update for message ${updatedMessage._id} with ${formattedReactions.length} reactions`);
        
        // Broadcast to everyone in the channel including sender
        io.of("/channels").to(updatedMessage.channelId.toString()).emit("messageReaction", reactionData);
        
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
        
        // Get channel information to handle private channels properly
        const channel = await Channel.findById(message.channelId);
        if (!channel) {
          return socket.emit("error", { message: "Channel not found" });
        }
        
        // Delete the message
        await Message.findByIdAndDelete(messageId);
        
        // Prepare deletion data
        const deletionData = {
          messageId,
          channelId: message.channelId,
          userId: socket.user._id,
        };
        
        if (channel.isPrivate) {
          // For private channels, send deletion events individually
          const isChannelOwner = channel.createdBy.toString() === socket.user._id.toString();
          
          if (isChannelOwner) {
            // Owner deleting - notify all members
            for (const userId of channel.allowedUsers) {
              const recipientId = userId.toString();
              const recipientSocketId = userSocketMap[recipientId];
              
              if (recipientSocketId) {
                channelsNamespace.to(recipientSocketId).emit("messageDeleted", deletionData);
              }
            }
          } else {
            // Member deleting - notify owner and other members
            const ownerId = channel.createdBy.toString();
            const ownerSocketId = userSocketMap[ownerId];
            
            if (ownerSocketId) {
              channelsNamespace.to(ownerSocketId).emit("messageDeleted", deletionData);
            }
            
            // Also notify other members
            for (const userId of channel.allowedUsers) {
              const memberId = userId.toString();
              // Skip sender
              if (memberId === socket.user._id.toString()) continue;
              
              const memberSocketId = userSocketMap[memberId];
              if (memberSocketId) {
                channelsNamespace.to(memberSocketId).emit("messageDeleted", deletionData);
              }
            }
          }
        } else {
          // For public channels, broadcast to the room
          socket.to(message.channelId.toString()).emit("messageDeleted", deletionData);
        }
        
        // Send the deletion event to the sender as well using messageDeleted instead of messageDeletionConfirmed
        // This ensures the same event handler is used for all clients including the sender
        socket.emit("messageDeleted", deletionData);
        
        // Also send a separate success confirmation if needed
        socket.emit("messageDeletionConfirmed", { success: true, messageId });
        
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    // Typing indicator in channel - disabled for this implementation
    // socket.on("typing", async ({ channelId, isTyping }) => { ... });
  });

  return channelUsers;
} 