import { Router } from "express";
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
  updateWorkspaceAdmin,
  getWorkspaceMembers,
} from "./workspaces.controller.js";
import {
  validateCreateWorkspace,
  validateUpdateWorkspace,
  validateWorkspaceId,
} from "./workspaces.validation.js";
const workspacesRouter = Router();

workspacesRouter.get("/", getWorkspaces);
workspacesRouter.get("/:id", validateWorkspaceId, getWorkspace);
workspacesRouter.post("/", validateCreateWorkspace, createWorkspace);
workspacesRouter.put(
  "/:id",
  validateWorkspaceId,
  validateUpdateWorkspace,
  updateWorkspace
);
workspacesRouter.delete("/:id", validateWorkspaceId, deleteWorkspace);
workspacesRouter.get("/:id/invite", validateWorkspaceId, getWorkspaceInviteUrl);

workspacesRouter.post("/:id/join", joinWorkspace);
workspacesRouter.post("/:id/leave", leaveWorkspace);
workspacesRouter.get("/user", getUserWorkspaces);
workspacesRouter.get(":id/members", validateWorkspaceId, getWorkspaceMembers);
workspacesRouter.put("/:id/admin", validateWorkspaceId, updateWorkspaceAdmin);

export default workspacesRouter;
