import { body, param } from "express-validator";

/**
 * Validation rules for creating a workspace
 */
export const validateCreateWorkspace = [
  body("workspaceName")
    .notEmpty()
    .withMessage("Workspace name is required")
    .isString()
    .withMessage("Workspace name must be a string")
    .matches(/^[A-Za-z\s]+$/)
    .withMessage("Workspace name cannot contain numbers or special characters")
    .isLength({ min: 3, max: 50 })
    .withMessage("Workspace name must be between 3 and 50 characters long"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
];

/**
 * Validation rules for updating a workspace
 */
export const validateUpdateWorkspace = [
  body("workspaceName")
    .optional()
    .isString()
    .withMessage("Workspace name must be a string")
    .isLength({ min: 3, max: 50 })
    .withMessage("Workspace name must be between 3 and 50 characters long"),
  body("description").optional().isString(),
];

/**
 * Validation rules for Workspace ID parameter
 */
export const validateWorkspaceId = [
  param("id")
    .notEmpty()
    .withMessage("Workspace ID is required")
    .isMongoId()
    .withMessage("Invalid Workspace ID format"),
];

/**
 * Validation rules for promoting workspace members to admin
 */
export const validatePromoteAdmin = [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("At least one user ID must be provided")
    .custom((userIds) => {
      if (!Array.isArray(userIds)) {
        return false;
      }
      // Check that all IDs are valid MongoDB ObjectIds
      return userIds.every((id) => /^[0-9a-fA-F]{24}$/.test(id));
    })
    .withMessage("All user IDs must be valid"),
];

/**
 * Validation rules for removing workspace members
 */
export const validateRemoveMember = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format")
];
