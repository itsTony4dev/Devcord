import "dotenv/config";
import jwt from "jsonwebtoken";

import { User } from "../models/index.js";

export const authenticate = async (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in authentication middleware", error.message);
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
