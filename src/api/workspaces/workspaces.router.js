import { Router } from "express";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceInviteUrl,
  getWorkspace,
  getWorkspaces,
  updateWorkspace,
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

export default workspacesRouter;
