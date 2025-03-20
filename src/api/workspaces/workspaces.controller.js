import "dotenv/config";

import { Workspace, User, UserWorkspace } from "../../models/index.js";
import transporter from "../../config/transporter.js";
import workspaceInviteEmail from "../../utils/email/templates/workspaceInvite.js";

export const getWorkspaces = async (req, res) => {
  try {
    const userId = req.user.id;
    const workspaces = await Workspace.find({ createdBy: userId });
    res.status(200).json({
      success: true,
      workspaces,
    });
  } catch (error) {
    console.error("Error in getWorkspaces controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }
    res.status(200).json({
      success: true,
      workspace,
    });
  } catch (error) {
    console.error("Error in getWorkspace controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
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

    const userWorkspace = new UserWorkspace({
      userId: createdBy,
      workspaceId: workspace.id,
      role: "owner",
    });
    await userWorkspace.save();
    
    res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    console.error("Error in createWorkspace controller:", error.message);
    res.status(500).json({ success: false, messsage: "Internal server error" });
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
    res.status(500).json({ success: false, messsage: "Internal server error" });
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
    res.status(500).json({ success: false, messsage: "Internal server error" });
  }
};

export const getWorkspaceInviteUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }
    if (!workspace.inviteCode) {
      return res.status(400).json({
        success: false,
        message: "Invite code not found",
      });
    }
    if (workspace.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }
    res.status(200).json({
      success: true,
      message: "Invite URL generated successfully",
      inviteUrl: workspace.inviteUrl,
      inviteCode: workspace.inviteCode,
    });
  } catch (error) {
    console.error("Error in getInviteUrl controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const sendWorkspaceInvite = async (req, res) => {
  try {
    const usersToInvite = req.body.users;
    const workspaceId = req.params.id;

    // Validate input
    if (
      !usersToInvite ||
      !Array.isArray(usersToInvite) ||
      usersToInvite.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one valid email to invite",
      });
    }

    // Check if workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // Check if user has permission to invite
    if (workspace.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to invite users to this workspace",
      });
    }

    // Generate invite code if it doesn't exist
    if (!workspace.inviteCode) {
      workspace.inviteCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();
      await workspace.save();
    }

    // Get frontend URL from environment
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    // Keep track of successful invites
    const successfulInvites = [];
    const failedInvites = [];

    // Send invites to each email
    for (const email of usersToInvite) {
      try {
        // Find user if they exist
        const user = await User.findOne({ email });
        const username = user ? user.username : "there";

        // Send email to user
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: email,
          subject: `You're invited to join ${workspace.workspaceName} on Devcord`,
          html: workspaceInviteEmail({
            username,
            workspaceName: workspace.workspaceName,
            inviteCode: workspace.inviteCode,
            baseUrl,
          }),
        });

        successfulInvites.push(email);
      } catch (emailError) {
        console.error(`Failed to send invite to ${email}:`, emailError.message);
        failedInvites.push({ email, reason: "Failed to send email" });
      }
    }

    // Return response with results
    res.status(200).json({
      success: true,
      message: "Workspace invitations processed",
      results: {
        successful: successfulInvites,
        failed: failedInvites,
      },
      inviteCode: workspace.inviteCode,
    });
  } catch (error) {
    console.error("Error in sendWorkspaceInvite controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const joinWorkspace = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    // Check if invite code is valid
    const workspace = await Workspace.findOne({ inviteCode });
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code or workspace not found",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is already a member of this workspace
    const userWorkspace = await UserWorkspace.findOne({
      userId: user._id,
      workspaceId: workspace._id,
    });

    if (userWorkspace) {
      // User is already a member
      return res.status(400).json({
        success: false,
        message: "You are already a member of this workspace",
        workspaceId: workspace._id,
        workspaceName: workspace.workspaceName,
      });
    }

    // If workspace creator attempts to join their own workspace
    if (workspace.createdBy.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You are the owner of this workspace",
        workspaceId: workspace._id,
        workspaceName: workspace.workspaceName,
      });
    }

    // Add user to workspace
    const newUserWorkspace = new UserWorkspace({
      userId: user._id,
      workspaceId: workspace._id,
      role: "member",
      joinedAt: new Date(),
    });

    await newUserWorkspace.save();

    res.status(201).json({
      success: true,
      message: "You have joined the workspace successfully",
      workspace: {
        id: workspace._id,
        name: workspace.workspaceName,
        description: workspace.description,
      },
    });
  } catch (error) {
    console.error("Error in joinWorkspace controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
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
    res.status(500).json({ success: false, messsage: "Internal server error" });
  }
};

export const getUserWorkspaces = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const userWorkspaces = await UserWorkspace.findUserWorkspaces(user._id);
    res.status(200).json({
      success: true,
      workspaces: userWorkspaces,
    });
  } catch (error) {
    console.error("Error in getUserWorkspaces controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateWorkspaceAdmin = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;
    const { userId: targetUserId } = req.body;

    const userWorkspace = await UserWorkspace.findOne({
      userId: req.user.id,
      workspaceId,
    });

    if (!userWorkspace) {
      return res.status(404).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    const isRequesterAdmin = await UserWorkspace.isAdmin(
      req.user.id,
      workspaceId
    );

    if (!isRequesterAdmin) {
      return res.status(403).json({
        success: false,
        message: "You must be an admin or owner to set workspace admins",
      });
    }

    const isTargetMember = await UserWorkspace.isMember(
      targetUserId,
      workspaceId
    );

    if (!isTargetMember) {
      return res.status(404).json({
        success: false,
        message: "Target user is not a member of this workspace",
      });
    }

    await UserWorkspace.findOneAndUpdate(
      { userId: targetUserId, workspaceId },
      { role: "admin" }
    );

    return res.status(200).json({
      success: true,
      message: "User has been promoted to admin",
    });
  } catch (error) {
    console.error("Error in setWorkspaceAdmin controller ", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getWorkspaceMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }
    const members = await UserWorkspace.findWorkspaceMembers(workspace._id);
    res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("Error in getWorkspaceMembers controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
