import rateLimit from "express-rate-limit";

const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later.",
  },
  headers: true,
  legacyHeaders:true,
  standardHeaders: true,
  keyGenerator: (req) => req.ip ,
});

export default changePasswordLimiter
