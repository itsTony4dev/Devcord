import { body, param, query } from "express-validator";

export const sendDirectMessageValidation = [
  param("receiverId")
    .isMongoId()
    .withMessage("Invalid receiver ID format"),
  
  body("content")
    .notEmpty()
    .withMessage("Message content is required")
    .isString()
    .withMessage("Message content must be a string")
    .isLength({ max: 5000 })
    .withMessage("Message content cannot exceed 5000 characters"),
  
  body("isCode")
    .optional()
    .isBoolean()
    .withMessage("isCode must be a boolean"),
  
  body("language")
    .optional()
    .isString()
    .withMessage("Language must be a string")
];

export const getConversationValidation = [
  param("friendId")
    .isMongoId()
    .withMessage("Invalid friend ID format"),
  
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  
  query("before")
    .optional()
    .isISO8601()
    .withMessage("Before must be a valid date")
];

export const deleteDirectMessageValidation = [
  param("messageId")
    .isMongoId()
    .withMessage("Invalid message ID format")
];

export const markMessagesAsReadValidation = [
  param("senderId")
    .isMongoId()
    .withMessage("Invalid sender ID format")
];

export const sendTypingIndicatorValidation = [
  param("receiverId")
    .isMongoId()
    .withMessage("Invalid receiver ID format"),
  
  body("isTyping")
    .isBoolean()
    .withMessage("isTyping must be a boolean")
]; 