import express from "express";
import {
  sendDirectMessage,
  getConversation,
  deleteDirectMessage,
  getUnreadMessagesCount,
  markMessagesAsRead,
  sendTypingIndicator,
  searchMessages
} from "./directMessages.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  sendDirectMessageValidation,
  getConversationValidation,
  deleteDirectMessageValidation,
  markMessagesAsReadValidation,
  sendTypingIndicatorValidation,
  
} from "./directMessages.validation.js";

const directMessagesRouter = express.Router();


/**
 * @swagger
 * /api/directMessages/unread:
 *   get:
 *     summary: Get unread messages count grouped by sender
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unread message counts
 *       500:
 *         description: Server error
 */
directMessagesRouter.get("/unread", getUnreadMessagesCount);

/**
 * @swagger
 * /api/directMessages/friend/{friendId}:
 *   get:
 *     summary: Get conversation history with a friend
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
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
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Conversation history
 *       403:
 *         description: Not authorized to view conversation
 *       404:
 *         description: Friend not found
 */
directMessagesRouter.get(
  "/friend/:friendId",
  getConversationValidation,
  validate,
  getConversation
);

/**
 * @swagger
 * /api/directMessages/friend/{receiverId}:
 *   post:
 *     summary: Send a direct message to a friend
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: receiverId
 *         required: true
 *         schema:
 *           type: string
 *     Body:
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
 *               isCode:
 *                 type: boolean
 *               language:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       403:
 *         description: Not authorized to send message
 *       404:
 *         description: Receiver not found
 */
directMessagesRouter.post(
  "/friend/:receiverId",
  sendDirectMessageValidation,
  validate,
  sendDirectMessage
);

/**
 * @swagger
 * /api/directMessages/{messageId}:
 *   delete:
 *     summary: Delete a direct message
 *     tags: [Direct Messages]
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
directMessagesRouter.delete(
  "/:messageId",
  deleteDirectMessageValidation,
  validate,
  deleteDirectMessage
);

/**
 * @swagger
 * /api/directMessages/read/{senderId}:
 *   patch:
 *     summary: Mark messages from a sender as read
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: senderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       500:
 *         description: Server error
 */
directMessagesRouter.patch(
  "/read/:senderId",
  markMessagesAsReadValidation,
  validate,
  markMessagesAsRead
);

/**
 * @swagger
 * /api/directMessages/typing/{receiverId}:
 *   post:
 *     summary: Send typing indicator to a friend
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: receiverId
 *         required: true
 *         schema:
 *           type: string
 *     Body:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isTyping
 *             properties:
 *               isTyping:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Typing indicator sent
 *       403:
 *         description: Not authorized to send typing indicator
 *       404:
 *         description: Receiver not found
 */
directMessagesRouter.post(
  "/typing/:receiverId",
  sendTypingIndicatorValidation,
  validate,
  sendTypingIndicator
);

/**
 * @swagger
 * /api/directMessages/search/{friendId}:
 *   get:
 *     summary: Search messages in a conversation
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
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
 *         description: Search results with pagination
 *       403:
 *         description: Not authorized to search messages
 *       404:
 *         description: Friend not found
 */
directMessagesRouter.get(
  "/search/:friendId",
  searchMessages
);

export default directMessagesRouter; 