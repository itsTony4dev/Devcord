import jwt from "jsonwebtoken";
import { User } from "../../../models/index.js";
import cookieParser from 'cookie-parser';

export const socketAuthMiddleware = async (socket, next) => {
  try {
    // Get token from cookies
    const cookies = socket.handshake.headers.cookie;
    if (!cookies) {
      return next(new Error("Authentication error: No cookies found"));
    }

    // Parse cookies
    const parsedCookies = cookieParser.JSONCookies(cookies);
    const token = parsedCookies.jwt;

    if (!token) {
      return next(new Error("Authentication error: No token found"));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // Attach user to socket
    socket.user = user;
    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication error"));
  }
}; 