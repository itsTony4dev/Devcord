import express from "express";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceInviteUrl,
  getWorkspace,
  getWorkspaces,
  updateWorkspace,
  joinWorkspace,
  leaveWorkspace,
  getUserWorkspaces,
  getWorkspaceMembers,
  sendWorkspaceInvite,
  getWorkspaceInvitedUsers,
  removeWorkspaceMember,
  toggleWorkspaceRole
} from "./workspaces.controller.js";

import {
  validateCreateWorkspace,
  validateUpdateWorkspace,
  validateWorkspaceId,
  validatePromoteAdmin,
  validateRemoveMember,
} from "./workspaces.validation.js";

import { validate } from "../../middleware/validate.js";

const workspacesRouter = express.Router();

/**
 * @swagger
 * /api/workspaces:
 *   get:
 *     summary: Get all workspaces created by the current user
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 workspaces:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workspace'
 *       500:
 *         description: Internal server error
 */
workspacesRouter.get("/", getWorkspaces);

/**
 * @swagger
 * /api/workspaces/user/workspaces:
 *   get:
 *     summary: Get all workspaces the current user is a member of
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's workspaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 workspaces:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workspace'
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
workspacesRouter.get("/user", getUserWorkspaces);

/**
 * @swagger
 * /api/workspaces/{id}:
 *   get:
 *     summary: Get a specific workspace by ID
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Workspace details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 workspace:
 *                   $ref: '#/components/schemas/Workspace'
 *       404:
 *         description: Workspace not found
 *       500:
 *         description: Internal server error
 */
workspacesRouter.get("/:id", validateWorkspaceId, getWorkspace);

/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create a new workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workspaceName
 *             properties:
 *               workspaceName:
 *                 type: string
 *                 description: Name of the workspace
 *               description:
 *                 type: string
 *                 description: Description of the workspace
 *     responses:
 *       201:
 *         description: Workspace created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 workspace:
 *                   $ref: '#/components/schemas/Workspace'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
workspacesRouter.post("/", validateCreateWorkspace, createWorkspace);

/**
 * @swagger
 * /api/workspaces/{id}:
 *   put:
 *     summary: Update a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               workspaceName:
 *                 type: string
 *                 description: New name of the workspace
 *               description:
 *                 type: string
 *                 description: New description of the workspace
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 workspace:
 *                   $ref: '#/components/schemas/Workspace'
 *       404:
 *         description: Workspace not found
 *       500:
 *         description: Internal server error
 */
workspacesRouter.put(
  "/:id",
  validateWorkspaceId,
  validateUpdateWorkspace,
  validate,
  updateWorkspace
);

/**
 * @swagger
 * /api/workspaces/{id}:
 *   delete:
 *     summary: Delete a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Workspace not found
 *       500:
 *         description: Internal server error
 */
workspacesRouter.delete("/:id", validateWorkspaceId, deleteWorkspace);

/**
 * @swagger
 * /api/workspaces/{id}/invite:
 *   post:
 *     summary: Send workspace invitations to users
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - users
 *             properties:
 *               users:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 description: List of email addresses to invite
 *     responses:
 *       200:
 *         description: Invitations sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     successful:
 *                       type: array
 *                       items:
 *                         type: string
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           email:
 *                             type: string
 *                           reason:
 *                             type: string
 *                 inviteCode:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Workspace not found
 *       500:
 *         description: Internal server error
 */
workspacesRouter.get("/:id/invite", validateWorkspaceId, getWorkspaceInviteUrl);

workspacesRouter.post("/:id/invite", validateWorkspaceId, sendWorkspaceInvite);

/**
 * @swagger
 * /api/workspaces/{id}/join:
 *   post:
 *     summary: Join a workspace by ID
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       201:
 *         description: Successfully joined workspace
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
 *                   example: You have joined the workspace successfully
 *                 workspace:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *       400:
 *         description: Already a member or owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workspace or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// This route bypasses the authenticate middleware to allow invitation links to work
// The joinWorkspace function handles authentication via tokens in URL params if needed
workspacesRouter.get("/:id/join/:inviteCode", joinWorkspace);

/**
 * @swagger
 * /api/workspaces/{id}/leave:
 *   post:
 *     summary: Leave a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Successfully left workspace
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
 *                   example: You have left the workspace successfully
 *       400:
 *         description: Not a member or cannot leave (only admin/owner)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workspace or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
workspacesRouter.post("/:id/leave", leaveWorkspace);

/**
 * @swagger
 * /api/workspaces/{id}/admins:
 *   post:
 *     summary: Promote users to admin role in a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to promote to admin
 *     responses:
 *       200:
 *         description: Users promoted to admin successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: array
 *                       items:
 *                         type: string
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           reason:
 *                             type: string
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Workspace or user not found
 *       500:
 *         description: Server error
 */
workspacesRouter.put(
  "/:id/admins",
  validateWorkspaceId,
  validatePromoteAdmin,
  validate,
  toggleWorkspaceRole
);

/**
 * @swagger
 * /api/workspaces/{id}/members:
 *   get:
 *     summary: Get all members of a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: List of workspace members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 members:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserWorkspace'
 *       404:
 *         description: Workspace not found
 *       500:
 *         description: Internal server error
 */
workspacesRouter.get("/:id/members", validateWorkspaceId, getWorkspaceMembers);

/**
 * @swagger
 * /api/workspaces/{id}/invited-users:
 *   get:
 *     summary: Get all invited users of a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: List of invited users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 invitedUsers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserWorkspace'
 *       404:
 *         description: Workspace not found
 *       500:
 *         description: Internal server error
 */
workspacesRouter.get(
  "/:id/invited-users",
  validateWorkspaceId,
  getWorkspaceInvitedUsers
);

/**
 * @swagger
 * /api/workspaces/{id}/members:
 *   delete:
 *     summary: Remove a member from a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to remove
 *     responses:
 *       200:
 *         description: Member removed successfully
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
 *                   example: Member removed from workspace successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized to remove this member
 *       404:
 *         description: Workspace or user not found
 *       500:
 *         description: Server error
 */
workspacesRouter.delete(
  "/:id/members",
  validateWorkspaceId,
  validateRemoveMember,
  validate,
  removeWorkspaceMember
);

export default workspacesRouter;
