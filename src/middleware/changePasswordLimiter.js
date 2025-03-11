import rateLimit from "express-rate-limit";

const sendEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  headers: true,
  legacyHeaders:true,
  standardHeaders: true,
  keyGenerator: (req) => req.ip ,
});

export default sendEmailLimiter
