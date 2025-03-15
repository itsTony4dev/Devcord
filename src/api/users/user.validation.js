import { body, param, query } from "express-validator";

/**
 * Validation rules for updating user profile
 */
export const validateUpdateProfile = [
  body("bio")
    .optional()
    .isString()
    .withMessage("Bio must be a string")
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),
];

/**
 * Validation rules for updating user password
 */
export const validateUpdatePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
];

/**
 * Validation rules for updating social links
 */
export const validateSocialLinks = [
  body("github")
    .optional()
    .isString()
    .withMessage("GitHub URL must be a string")
    .matches(/^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/)
    .withMessage("Invalid GitHub URL format"),
  body("linkedin")
    .optional()
    .isString()
    .withMessage("LinkedIn URL must be a string")
    .matches(/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+(\/)?$/)
    .withMessage("Invalid LinkedIn URL format"),
];

/**
 * Validation rules for updating skills
 */
export const validateSkills = [
  body("skills").isArray().withMessage("Skills must be an array"),
  body("skills.*")
    .isString()
    .withMessage("Each skill must be a string")
    .isLength({ min: 1, max: 50 })
    .withMessage("Each skill must be between 1 and 50 characters"),
];

/**
 * Validation rules for updating avatar
 */
export const validateAvatar = [
  body("avatar")
    .notEmpty()
    .withMessage("Avatar URL is required")
    .isURL()
    .withMessage("Avatar must be a valid URL"),
];

/**
 * Validation rules for user search
 */
export const validateSearch = [
  query("q").notEmpty().withMessage("Search query is required"),
  query("type")
    .optional()
    .isIn(["username", "skills"])
    .withMessage('Search type must be either "username" or "skills"'),
];

/**
 * Validation rules for user ID parameter
 */
export const validateUserId = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format"),
];

/**
 * Validation rules for pagination
 */
export const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];
