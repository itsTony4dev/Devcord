import "dotenv/config";

import { Workspace, User, UserWorkspace } from "../../models/index.js";
import transporter from "../../config/transporter.js";

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

export const sendWorkspaceInvite = async (req, res) => {
  try {
    const usersToInvite = req.body.users;
    const workspaceId = req.params.id;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json("Workspace not found");
    }
    if (workspace.createdBy.toString() !== req.user.id) {
      return res.status(403).json("Forbidden");
    }

    for (const email of usersToInvite) {
      const user = await User.findOne({ email });
      if (user) {
        // Send email to user
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: email,
          subject: "Workspace Invite",
          html: `<p>You have been invited to join the workspace: ${workspace.workspaceName}</p>`, //make a template (send workspace name and invite code)
        });
      }
    }
  } catch (error) {
    console.error("Error in sendWorkspaceInvite controller:", error.message);
    res.status(500).json("Internal server error");
  }
};

export const joinWorkspace = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const workspace = await Workspace.findOne({ inviteCode });
    if (!workspace) {
      return res.status(404).json("Workspace not found");
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json("User not found");
    }
    const userWorkspace = await UserWorkspace.findOne({
      userId: user._id,
      workspaceId: workspace._id,
    });
    if (userWorkspace) {
      return res.status(400).json("You are already a member of this workspace");
    }
    const newUserWorkspace = new UserWorkspace({
      userId: user._id,
      workspaceId: workspace._id,
      role: "member",
    });
    await newUserWorkspace.save();
    res.status(201).json({
      success: true,
      message: "You have joined the workspace successfully",
    });
  } catch (error) {
    console.error("Error in joinWorkspace controller:", error.message);
    res.status(500).json("Internal server error");
  }
};

export const leaveWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json("Workspace not found");
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json("User not found");
    }
    const userWorkspace = await UserWorkspace.findOne({
      userId: user._id,
      workspaceId: workspace._id,
    });
    if (!userWorkspace) {
      return res.status(400).json("You are not a member of this workspace");
    }
    if (
      userWorkspace.role === "owner" ||
      (userWorkspace.role === "admin" &&
        (await UserWorkspace.countDocuments({
          workspaceId: workspace._id,
          role: "admin",
        })) === 1)
    ) {
      return res
        .status(400)
        .json(
          "You cannot leave this workspace as you are the only admin or owner"
        );
    }
    await userWorkspace.remove();
    res.status(200).json({
      success: true,
      message: "You have left the workspace successfully",
    });
  } catch (error) {
    console.error("Error in leaveWorkspace controller:", error.message);
    res.status(500).json("Internal server error");
  }
};

export const getUserWorkspaces = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json("User not found");
    }
    const userWorkspaces = await UserWorkspace.find({ userId: user._id })
      .populate("workspaceId", "workspaceName description createdAt")
      .sort({ joinedAt: -1 });
    res.status(200).json(userWorkspaces);
  } catch (error) {
    console.error("Error in getUserWorkspaces controller:", error.message);
    res.status(500).json("Internal server error");
  }
};
