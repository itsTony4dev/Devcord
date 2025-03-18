import { Workspace, User } from "../../models/index.js";

export const getWorkspaces = async (req, res) => {
  try {
    const userId = req.user.id;
    const workspaces = await Workspace.find({ createdBy: userId });
    res.status(200).json(workspaces);
  } catch (error) {
    console.error("Error in getWorkspaces controller:", error.message);
    res.status(500).json("Internal server error");
  }
};

export const getWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json("Workspace not found");
    }
    res.status(200).json(workspace);
  } catch (error) {
    console.error("Error in getWorkspace controller:", error.message);
    res.status(500).json("Internal server error");
  }
};

export const createWorkspace = async (req, res) => {
  try {
    const { workspaceName, description } = req.body;
    const createdBy = req.user.id;
    if (!workspaceName) {
      return res.status(400).json("Workspace name is required");
    }
    const user = await User.findById(createdBy);
    if (!user) {
      return res.status(404).json("User not found");
    }
    const workspace = new Workspace({ workspaceName, description, createdBy });
    await workspace.save();

    if (!workspace) {
      return res.status(500).json("Workspace creation failed");
    }
    res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    console.error("Error in createWorkspace controller:", error.message);
    res.status(500).json("Internal server error");
  }
};

export const updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { workspaceName, description } = req.body;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json("Workspace not found");
    }
    workspace.workspaceName = workspaceName || workspace.workspaceName;
    workspace.description = description || workspace.description;
    await workspace.save();
    res.status(200).json({
      success: true,
      message: "Workspace updated successfully",
      workspace,
    });
  } catch (error) {
    console.error("Error in updateWorkspace controller:", error.message);
    res.status(500).json("Internal server error");
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json("Workspace not found");
    }
    await workspace.remove();
    res.status(200).json({
      success: true,
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteWorkspace controller:", error.message);
    res.status(500).json("Internal server error");
  }
};

export const getWorkspaceInviteUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json("Workspace not found");
    }
    if (!workspace.inviteCode) {
      return res.status(400).json("Invite code not found");
    }
    if (workspace.createdBy.toString() !== req.user.id) {
      return res.status(403).json("Forbidden");
    }
    res.status(200).json({
      success: true,
      message: "Invite URL generated successfully",
      inviteUrl: workspace.inviteUrl,
    });
  } catch (error) {
    console.error("Error in getInviteUrl controller:", error.message);
    res.status(500).json("Internal server error");
  }
};
