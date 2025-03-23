import { body, param } from "express-validator";

// Validation for channel ID
export const validateChannelId = [
  param("channelId").isMongoId().withMessage("Invalid channel ID format"),
];

// Validation for user ID
export const validateUserId = [
  param("userId").isMongoId().withMessage("Invalid user ID format"),
];

// Validation for creating a channel
export const validateCreateChannel = [
  body("channelName")
    .notEmpty()
    .withMessage("Channel name is required")
    .isString()
    .withMessage("Channel name must be a string")
    .isLength({ min: 2, max: 50 })
    .withMessage("Channel name must be between 2 and 50 characters"),
  body("isPrivate")
    .optional()
    .isBoolean()
    .withMessage("isPrivate must be a boolean"),
  body("allowedUsers")
    .optional()
    .isArray()
    .withMessage("allowedUsers must be an array"),
  body("allowedUsers.*")
    .optional()
    .isMongoId()
    .withMessage("Each allowed user ID must be a valid MongoDB ID"),
];
