import { Channel } from "../../models/index.js";

export const createChannel = async (req, res) => {
  try {
  } catch (error) {
    console.error("Error in createChannel controller:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
