import { Channel } from "../../models/index.js";

export const createChannel = async (req, res) => {
  try {
    const { ChannelName, isPrivate, allowedUsers } = req.body;
    const { workspaceId } = req.params;
    const { _id: userId } = req.user;

    const channel = new Channel({
      ChannelName,
      isPrivate,
      allowedUsers,
      workspaceId,
      createdBy: userId,
    });
    await channel.save();

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
