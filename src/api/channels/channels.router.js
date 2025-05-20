import express from "express";
import {
  createChannel,
  getWorkspaceChannels,
  getChannelById,
  deleteChannel,
  addUserToPrivateChannel,
  removeUserFromPrivateChannel,
} from "./channels.controller.js";
import { validate } from "../../middleware/validate.js";
import { checkChannelAccess } from "../../middleware/channelAccess.js";
import {
  validateChannelId,
  validateCreateChannel,
  validateUserId,
} from "./channels.validation.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Channels
 *   description: Channel management endpoints
 */

/**
 * @swagger
 * /api/channels/workspace/{workspaceId}:
 *   post:
 *     summary: Create a new channel in a workspace
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channelName
 *             properties:
 *               channelName:
 *                 type: string
 *                 description: Name of the channel
 *               isPrivate:
 *                 type: boolean
 *                 description: Whether the channel is private
 *               allowedUsers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of user IDs who can access a private channel
 *     responses:
 *       201:
 *         description: Channel created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/:workspaceId", validateCreateChannel, validate, createChannel);

/**
 * @swagger
 * /api/channels/workspace/{workspaceId}:
 *   get:
 *     summary: Get all accessible channels in a workspace
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: List of channels
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/:workspaceId", getWorkspaceChannels);

/**
 * @swagger
 * /api/channels/{channelId}:
 *   get:
 *     summary: Get channel details by ID (checks access for private channels)
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - No access to private channel
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:channelId",

  validateChannelId,
  validate,
  checkChannelAccess,
  getChannelById
);

/**
 * @swagger
 * /api/channels/{channelId}:
 *   delete:
 *     summary: Delete a channel (only creator can delete)
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the channel creator
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Server error
 */
router.delete("/:channelId", validateChannelId, validate, deleteChannel);

/**
 * @swagger
 * /api/channels/{channelId}/users/{userId}:
 *   post:
 *     summary: Add a user to a private channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to add
 *     responses:
 *       200:
 *         description: User added to channel successfully
 *       400:
 *         description: Invalid request or user already has access
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - No permission to add users
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:channelId/users/:userId",
  validateChannelId,
  validateUserId,
  validate,
  addUserToPrivateChannel
);

/**
 * @swagger
 * /api/channels/{channelId}/users/{userId}:
 *   delete:
 *     summary: Remove a user from a private channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to remove
 *     responses:
 *       200:
 *         description: User removed from channel successfully
 *       400:
 *         description: Invalid request or cannot remove creator
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only creator can remove users
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:channelId/users/:userId",
  validateChannelId,
  validateUserId,
  validate,
  removeUserFromPrivateChannel
);

export default router;
