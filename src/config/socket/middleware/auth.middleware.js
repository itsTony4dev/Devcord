import jwt from "jsonwebtoken";
import { User } from "../../../models/index.js";
import cookie from 'cookie';

export const socketAuthMiddleware = async (socket, next) => {
  try {
    console.log("Socket handshake headers:", socket.handshake.headers);
    console.log("Socket handshake auth:", socket.handshake.auth);
    
    // Try to get token from multiple possible sources
    let token = null;
    
    // 1. Check in auth object (from socket.auth in client)
    if (socket.handshake.auth && socket.handshake.auth.token) {
      console.log("Found token in auth object");
      token = socket.handshake.auth.token;
    }
    
    // 2. Check in Authorization header
    if (!token && socket.handshake.headers.authorization) {
      console.log("Found Authorization header");
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    // 3. Check in cookies (original method)
    if (!token && socket.handshake.headers.cookie) {
      console.log("Checking cookies for token");
      
      // Parse cookies properly using cookie library
      const cookies = cookie.parse(socket.handshake.headers.cookie);
      if (cookies.jwt) {
        console.log("Found token in cookies");
        token = cookies.jwt;
      }
    }

    // Check if we found a token
    if (!token) {
      console.log("No token found in any source");
      return next(new Error("Authentication error: No token found"));
    }
    
    console.log("Token found, verifying...");
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified, finding user...");
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log("User not found with ID:", decoded.userId);
      return next(new Error("Authentication error: User not found"));
    }

    console.log("User authenticated:", user.username);
    
    // Attach user to socket
    socket.user = user;
    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication error"));
  }
}; 