import "dotenv/config";
import jwt from "jsonwebtoken";

import { User } from "../models/index.js";

export const authenticate = async (req, res, next) => {
  let token = null;
  // 1. Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }
  // 2. Cookie (jwt or auth_token)
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }
  // 3. Query parameter (for edge cases)
  else if (req.query && req.query.token) {
    token = req.query.token;
  }
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
