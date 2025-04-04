import express from "express";
import { 
  sendMessage, 
  getChannelMessages, 
  deleteMessage,
  editMessage,
  reactToMessage,
  pinMessage,
  searchMessages
} from "./messages.controller.js";
import { privateChannelAccess } from "../../middleware/channelAccess.js";

const messagesRouter = express.Router();

/**
 * @swagger
 * /api/messages/{channelId}:
 *   post:
 *     summary: Send a message to a channel
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Channel not found
 */
messagesRouter.post("/:channelId", privateChannelAccess, sendMessage);

/**
 * @swagger
 * /api/messages/{channelId}:
 *   get:
 *     summary: Get messages for a channel
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of messages
 *       403:
 *         description: Access denied
 *       404:
 *         description: Channel not found
 */
messagesRouter.get("/:channelId", privateChannelAccess, getChannelMessages);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       403:
 *         description: Not authorized to delete this message
 *       404:
 *         description: Message not found
 */
messagesRouter.delete("/:messageId", deleteMessage);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   patch:
 *     summary: Edit a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated successfully
 *       403:
 *         description: Not authorized to edit this message
 *       404:
 *         description: Message not found
 */
messagesRouter.patch("/:messageId", editMessage);

/**
 * @swagger
 * /api/messages/{messageId}/react:
 *   post:
 *     summary: React to a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reaction updated successfully
 *       400:
 *         description: Emoji is required
 *       403:
 *         description: Not authorized to react to this message
 *       404:
 *         description: Message not found
 */
messagesRouter.post("/:messageId/react", reactToMessage);

/**
 * @swagger
 * /api/messages/{messageId}/pin:
 *   patch:
 *     summary: Pin or unpin a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message pin status updated successfully
 *       403:
 *         description: Not authorized to pin messages in this channel
 *       404:
 *         description: Message not found
 */
messagesRouter.patch("/:messageId/pin", pinMessage);

/**
 * @swagger
 * /api/messages/{channelId}/search:
 *   get:
 *     summary: Search messages in a channel
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Search query is required
 *       403:
 *         description: Not authorized to search messages in this channel
 *       404:
 *         description: Channel not found
 */
messagesRouter.get("/:channelId/search", privateChannelAccess, searchMessages);

export default messagesRouter;

