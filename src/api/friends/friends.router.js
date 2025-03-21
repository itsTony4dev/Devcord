import { Router } from "express";
import {
  sendFriendRequest,
  getFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendsList,
  removeFriend,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "./friends.controller.js";

import {
  validateUserId,
  validateFriendRequest,
  validateBlockUser,
} from "./friends.validation.js";

import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/auth.js";

const friendRouter = Router();
friendRouter.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Friend management endpoints
 */

/**
 * @swagger
 * /api/friends/requests:
 *   get:
 *     summary: Get all friend requests received by the current user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Friend requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       requestId:
 *                         type: string
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
friendRouter.get("/requests", getFriendRequests);

/**
 * @swagger
 * /api/friends/requests/sent:
 *   get:
 *     summary: Get all pending friend requests sent by the current user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sent friend requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       requestId:
 *                         type: string
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
friendRouter.get("/requests/sent", getSentFriendRequests);

/**
 * @swagger
 * /api/friends/requests/{requestId}/accept:
 *   put:
 *     summary: Accept a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Friend request ID
 *     responses:
 *       200:
 *         description: Friend request accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Friend request accepted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Friend request not found
 *       500:
 *         description: Server error
 */
friendRouter.put("/requests/:requestId/accept", acceptFriendRequest);

/**
 * @swagger
 * /api/friends/requests/{requestId}/decline:
 *   delete:
 *     summary: Decline a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Friend request ID
 *     responses:
 *       200:
 *         description: Friend request declined
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Friend request declined
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Friend request not found
 *       500:
 *         description: Server error
 */
friendRouter.delete("/requests/:requestId/decline", declineFriendRequest);

/**
 * @swagger
 * /api/friends:
 *   get:
 *     summary: Get all friends for the current user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Friends list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       friendshipId:
 *                         type: string
 *                       friendId:
 *                         type: string
 *                       username:
 *                         type: string
 *                       avatar:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
friendRouter.get("/", getFriendsList);

/**
 * @swagger
 * /api/friends/{userId}/add-friend:
 *   post:
 *     summary: Send a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       201:
 *         description: Friend request sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Friend request sent successfully
 *       400:
 *         description: Invalid request or already friends
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
friendRouter.post(
  "/:userId/add-friend",
  validateFriendRequest,
  validate,
  sendFriendRequest
);

/**
 * @swagger
 * /api/friends/{userId}:
 *   delete:
 *     summary: Remove a friend
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the friend to remove
 *     responses:
 *       200:
 *         description: Friend removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Friend removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Friend not found
 *       500:
 *         description: Server error
 */
friendRouter.delete("/:userId", validateUserId, validate, removeFriend);

/**
 * @swagger
 * /api/friends/block:
 *   post:
 *     summary: Block a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to block
 *     responses:
 *       200:
 *         description: User blocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User blocked successfully
 *       400:
 *         description: Invalid request or cannot block yourself
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
friendRouter.post("/block", validateBlockUser, validate, blockUser);

/**
 * @swagger
 * /api/friends/block/{userId}:
 *   delete:
 *     summary: Unblock a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to unblock
 *     responses:
 *       200:
 *         description: User unblocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User unblocked successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Blocked user not found
 *       500:
 *         description: Server error
 */
friendRouter.delete("/block/:userId", validateUserId, validate, unblockUser);

/**
 * @swagger
 * /api/friends/block:
 *   get:
 *     summary: Get list of blocked users
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blocked users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       avatar:
 *                         type: string
 *                       blockedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
friendRouter.get("/block", getBlockedUsers);

export default friendRouter;
