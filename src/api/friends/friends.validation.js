import { param, body } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Validate user ID in parameters
 */
export const validateUserId = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid user ID format')
];

/**
 * Validate friend request body
 */
export const validateFriendRequest = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid user ID format')
    .custom((value, { req }) => value !== req.user.id)
    .withMessage('Cannot send friend request to yourself')
];

/**
 * Validate block user request
 */
export const validateBlockUser = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid user ID format')
    .custom((value, { req }) => value !== req.user.id)
    .withMessage('Cannot block yourself')
]; 