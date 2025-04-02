import { Message } from "../../models/index.js";
import cloudinary from "../../utils/cloudinary/cloudinary.js";
import { io, getReceiverSocketId } from "../../config/socket.js";

export const getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const messages = await Message.find({ channelId });
    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("Error in getMessages controller:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createMessage = async (req, res) => {
  try {
    const { channelId, threadId } = req.params;
    const userId = req.user.id;
    const { content, image } = req.body;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const message = new Message({
      channelId,
      threadId,
      userId,
      content,
      image: imageUrl ? imageUrl : null,
    });

    await message.save();

    // Emit the message to the channel

  } catch (error) {
    console.error("Error in createMessage controller:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
