import { Channel, UserWorkspace } from "../../models/index.js";

export const createChannel = async (req, res) => {
  try {
    const { channelName, isPrivate, allowedUsers } = req.body;
    const { workspaceId } = req.params;
    const { _id: userId } = req.user;

    const channel = new Channel({
      channelName,
      isPrivate,
      allowedUsers,
      workspaceId,
      createdBy: userId,
    });
    await channel.save();

    // Get the socket instance for real-time notifications
    const io = req.app.get("io");
    
    if (io) {
      // Enhanced channel creation notification
      try {
        // Get all members of the workspace to notify them
        const workspaceMembers = await UserWorkspace.find({ workspaceId });
        
        // Prepare consistent channel data for all notifications
        const channelData = {
          _id: channel._id,
          id: channel._id,
          channelId: channel._id,
          channelName: channel.channelName,
          isPrivate: channel.isPrivate,
          workspaceId: channel.workspaceId,
          createdBy: channel.createdBy,
          allowedUsers: channel.allowedUsers
        };
        
        // For each workspace member, send a channelCreated event
        for (const membership of workspaceMembers) {
          // Get the member's socket ID if they're online
          const memberSocketId = io.userSocketMap?.[membership.userId.toString()];
          
          // If private channel, only notify the creator and allowed users
          if (isPrivate) {
            const isCreator = membership.userId.toString() === userId.toString();
            const isAllowed = Array.isArray(allowedUsers) && 
                              allowedUsers.some(id => id.toString() === membership.userId.toString());
            
            // Skip members without access to this private channel
            if (!isCreator && !isAllowed) continue;
          }
          
          // If member is online, send the event directly to their socket
          if (memberSocketId) {
            io.of("/channels").to(memberSocketId).emit("channelCreated", channelData);
            console.log(`Sent channelCreated event to user ${membership.userId} (socket: ${memberSocketId})`);
          }
        }
        
        console.log(`Notified all relevant members about new ${isPrivate ? 'private' : 'public'} channel: ${channel.channelName}`);
      } catch (socketError) {
        // Just log socket errors but don't block the channel creation response
        console.error("Error sending channel creation notifications:", socketError);
      }
    }

    res.status(201).json({
      success: true,
      message: "Channel created successfully",
      channel,
    });
  } catch (error) {
    console.error("Error in createChannel controller:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getWorkspaceChannels = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { _id: userId } = req.user;

    const channels = await Channel.findWorkspaceChannels(workspaceId, userId);
    res.status(200).json({ success: true, channels });
  } catch (error) {
    console.error("Error in getWorkspaceChannels controller:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getChannelById = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res
        .status(404)
        .json({ success: false, message: "Channel not found" });
    }
    res.status(200).json({ success: true, channel });
  } catch (error) {
    console.error("Error in getChannelById controller:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const result = await Channel.findByIdAndDelete(channelId);

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Channel not found" });
    }

    res.status(200).json({ success: true, message: "Channel deleted" });
  } catch (error) {
    console.error("Error in deleteChannel controller:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Middleware to check if a user has access to a channel
 * Used for private channels to restrict access to only allowed users
 */
export const checkChannelAccess = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    // Find the channel
    const channel = await Channel.findById(channelId);
    
    // If channel doesn't exist, return 404
    if (!channel) {
      return res.status(404).json({ 
        success: false, 
        message: "Channel not found" 
      });
    }
    
    // If channel is not private, allow access
    if (!channel.isPrivate) {
      // Store channel in request for potential later use
      req.channel = channel;
      return next();
    }
    
    // If user is the creator, allow access
    if (channel.createdBy.toString() === userId.toString()) {
      req.channel = channel;
      return next();
    }
    
    // Check if user is in the allowed users list
    const isAllowed = channel.allowedUsers.some(
      allowedId => allowedId.toString() === userId.toString()
    );
    
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this channel"
      });
    }
    
    // User has access, store channel in request and continue
    req.channel = channel;
    next();
    
  } catch (error) {
    console.error("Error in checkChannelAccess middleware:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

/**
 * Add a user to a private channel's allowed users list
 */
export const addUserToPrivateChannel = async (req, res) => {
  try {
    const { channelId, userId: userToAddId } = req.params;
    const currentUserId = req.user._id;
    
    // Find the channel
    const channel = await Channel.findById(channelId);
    
    // If channel doesn't exist, return 404
    if (!channel) {
      return res.status(404).json({ 
        success: false, 
        message: "Channel not found" 
      });
    }
    
    // Check if channel is private
    if (!channel.isPrivate) {
      return res.status(400).json({
        success: false,
        message: "Cannot add users to a public channel"
      });
    }
    
    // Check if requesting user is the creator or has access
    const isCreator = channel.createdBy.toString() === currentUserId.toString();
    const hasAccess = channel.allowedUsers.some(
      id => id.toString() === currentUserId.toString()
    );
    
    if (!isCreator && !hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to add users to this channel"
      });
    }
    
    // Check if user is already in allowed users
    const isAlreadyAllowed = channel.allowedUsers.some(
      id => id.toString() === userToAddId
    );
    
    if (isAlreadyAllowed) {
      return res.status(400).json({
        success: false,
        message: "User already has access to this channel"
      });
    }
    
    // Add user to allowed users
    channel.allowedUsers.push(userToAddId);
    await channel.save();
    
    res.status(200).json({
      success: true,
      message: "User added to private channel successfully"
    });
    
  } catch (error) {
    console.error("Error in addUserToPrivateChannel controller:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

/**
 * Remove a user from a private channel's allowed users list
 */
export const removeUserFromPrivateChannel = async (req, res) => {
  try {
    const { channelId, userId: userToRemoveId } = req.params;
    const currentUserId = req.user._id;
    
    // Find the channel
    const channel = await Channel.findById(channelId);
    
    // If channel doesn't exist, return 404
    if (!channel) {
      return res.status(404).json({ 
        success: false, 
        message: "Channel not found" 
      });
    }
    
    // Check if channel is private
    if (!channel.isPrivate) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove users from a public channel"
      });
    }
    
    // Check if requesting user is the creator
    const isCreator = channel.createdBy.toString() === currentUserId.toString();
    
    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: "Only the channel creator can remove users"
      });
    }
    
    // Cannot remove the creator
    if (userToRemoveId === channel.createdBy.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove the channel creator"
      });
    }
    
    // Remove user from allowed users
    channel.allowedUsers = channel.allowedUsers.filter(
      id => id.toString() !== userToRemoveId
    );
    
    await channel.save();
    
    res.status(200).json({
      success: true,
      message: "User removed from private channel successfully"
    });
    
  } catch (error) {
    console.error("Error in removeUserFromPrivateChannel controller:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

