import { Channel, UserWorkspace, Workspace } from "../models/index.js";

export const privateChannelAccess = async (req, res, next) => {
  // try {
  //   const { channelId } = req.params;
  //   const userId = req.user.id;

  //   const channel = await Channel.findById(channelId);
  //   if (!channel) {
  //     return res.status(404).json({ message: "Channel not found" });
  //   }

  //   if (!channel.isPrivate) {
  //     return next();
  //   }

  //   const isAllowed = channel.allowedUsers.some(
  //     (allowedUserId) => allowedUserId.toString() === userId.toString()
  //   );

  //   if (!isAllowed) {
  //     return res.status(403).json({
  //       success: false,
  //       message: "You don't have permission to access this private channel",
  //     });
  //   }

    next();
  // } catch (error) {
  //   console.error("Error in privateChannelAccess middleware:", error);
  //   res.status(500).json({
  //     success: false,
  //     message: "Error checking channel access",
  //   });
  // }
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