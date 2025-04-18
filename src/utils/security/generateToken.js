import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });

  // Set cookie with more permissive options for development
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Only require HTTPS in production
    sameSite: "lax", // Allow cookies to be sent in cross-site requests for better development experience
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    path: "/", // Make sure cookie is accessible for all paths
  });
  
  // Also set a non-httpOnly cookie for the frontend to read directly
  // This is less secure but allows direct access from JavaScript for socket connections
  res.cookie("auth_token", token, {
    httpOnly: false, // Accessible from JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  
  // Log for debugging
  console.log(`Generated token for user ${userId} and set cookies`);
};
