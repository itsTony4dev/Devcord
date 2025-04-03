import express from "express";
import { sendMessage, getChannelMessages, deleteMessage } from "./messages.controller.js";
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

export default messagesRouter;

