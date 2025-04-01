import { Channel, UserWorkspace, Workspace } from "../models/index.js";

export const privateChannelAccess = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!channel.isPrivate) {
      return next();
    }

    const isAllowed = channel.allowedUsers.some(
      (allowedUserId) => allowedUserId.toString() === userId.toString()
    );

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this private channel",
      });
    }

    next();
  } catch (error) {
    console.error("Error in privateChannelAccess middleware:", error);
    res.status(500).json({
      success: false,
      message: "Error checking channel access",
    });
  }
};
