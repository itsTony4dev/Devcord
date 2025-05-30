import "dotenv/config";
import jwt from "jsonwebtoken";

import { Workspace, User, UserWorkspace, DirectMessage, Friends, Channel } from "../../models/index.js";

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
      return res
        .status(500)
        .json({ success: false, message: "Workspace creation failed" });
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
    res.status(500).json({ success: false, message: "Internal server error" });
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
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;
    const userId = req.user._id;

    // Find workspace
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      return res.status(404).json({ 
        success: false, 
        message: "Workspace not found" 
      });
    }
    
    // Check if user is authorized to delete the workspace
    if (workspace.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the workspace owner can delete the workspace"
      });
    }
    
    // Get all workspace members before deletion for notifications
    const workspaceMembers = await UserWorkspace.find({ workspaceId });
    const memberIds = workspaceMembers.map(member => member.userId.toString());
    
    // Delete all associated data
    await Promise.all([
      // Delete workspace
      Workspace.findByIdAndDelete(workspaceId),
      
      // Delete all workspace memberships
      UserWorkspace.deleteMany({ workspaceId }),
      
      // Delete all channels in the workspace
      Channel.deleteMany({ workspaceId }),

      // Consider deleting other related data like messages in those channels
    ]);
    
    // Get the socket instance for real-time notifications
    const io = req.app.get("io");
    
    // Notify all members about workspace deletion
    if (io) {
      for (const memberId of memberIds) {
        const memberSocketId = io.userSocketMap?.[memberId];
        
        if (memberSocketId) {
          io.of("/dm").to(memberSocketId).emit("workspaceDeleted", {
            workspaceId,
            message: `Workspace "${workspace.workspaceName}" has been deleted`
          });
          
          console.log(`Sent workspaceDeleted event to user ${memberId} (socket: ${memberSocketId})`);
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteWorkspace controller:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
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
    const senderId = req.user.id;

    // Validate input
    if (
      !usersToInvite ||
      !Array.isArray(usersToInvite) ||
      usersToInvite.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one user to invite",
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
    if (workspace.createdBy.toString() !== req.user.id.toString()) {
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

    // Keep track of successful invites
    const successfulInvites = [];
    const failedInvites = [];
    const invitedUsers = [];

    // Get the socket instance for real-time notifications
    const io = req.app.get("io");

    // Send invites to each user via direct message
    for (const userId of usersToInvite) {
      try {
        // Find user if they exist
        const user = await User.findById(userId);
        if (!user) {
          failedInvites.push({ userId, reason: "User not found" });
          continue;
        }

        // Check if users are friends
        const areFriends = await Friends.findOne({
          $or: [
            { userId: senderId, friendId: userId, status: "accepted" },
            { userId: userId, friendId: senderId, status: "accepted" },
          ],
        });

        if (!areFriends) {
          failedInvites.push({ userId, reason: "Not friends with user" });
          continue;
        }

        // Generate a token for the invited user
        const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
          expiresIn: "7d", 
        });

        // Create a link that works across environments
        const content = `You've been invited to join the workspace "${workspace.workspaceName}". Use the invite code: ${workspace.inviteCode} or press the following link: ${process.env.BACKEND_URL}/api/workspaces/${workspace.id}/join/${workspace.inviteCode}?token=${token}`;

        // Create new direct message with workspace invitation
        const newMessage = new DirectMessage({
          senderId,
          receiverId: userId,
          content,
          isWorkspaceInvite: true,
          workspaceInvite: {
            workspaceId,
            workspaceName: workspace.workspaceName,
            inviteCode: workspace.inviteCode
          }
        });

        await newMessage.save();

        // Get sender info
        const sender = await User.findById(senderId).select("username avatar");

        // Prepare message data for socket emission
        const messageData = {
          messageId: newMessage._id,
          senderId,
          receiverId: userId,
          content,
          isWorkspaceInvite: true,
          workspaceInvite: {
            workspaceId,
            workspaceName: workspace.workspaceName,
            inviteCode: workspace.inviteCode
          },
          createdAt: newMessage.createdAt,
          sender: {
            username: sender.username,
            avatar: sender.avatar,
          },
        };

        // Get receiver's socket ID
        const receiverSocketId = io.userSocketMap?.[userId];

        // Send to receiver if online
        if (receiverSocketId) {
          io.of("/dm").to(receiverSocketId).emit("receiveDirectMessage", messageData);
        }

        invitedUsers.push(userId);
        successfulInvites.push(userId);
      } catch (error) {
        console.error(`Failed to send invite to ${userId}:`, error.message);
        failedInvites.push({ userId, reason: error.message });
      }
    }

    await Workspace.findByIdAndUpdate(workspaceId, {
      $addToSet: { invitedUsers },
    });
    
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
    const { id, inviteCode } = req.params;
    let userId;
    
    // Check if we have a user in the request (set by authenticate middleware)
    if (req.user && req.user.id) {
      userId = req.user.id;
    } 
    // If not, check for a token in query params 
    else if (req.query.token) {
      try {
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }
        userId = user._id;
      } catch (tokenError) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Find workspace by invite code
    const workspace = await Workspace.findOne({ inviteCode });
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code or workspace not found",
      });
    }

    // Check if user is already a member of this workspace
    const existingMembership = await UserWorkspace.findOne({
      userId,
      workspaceId: workspace._id,
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this workspace",
        workspaceId: workspace._id,
        workspaceName: workspace.workspaceName,
      });
    }

    // If workspace creator attempts to join their own workspace
    if (workspace.createdBy.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You are the owner of this workspace",
        workspaceId: workspace._id,
        workspaceName: workspace.workspaceName,
      });
    }

    // Check if user is invited
    const isInvited = workspace.invitedUsers && 
      workspace.invitedUsers.some(id => id.toString() === userId.toString());

    if (!isInvited && workspace.isPrivate) {
      return res.status(403).json({
        success: false,
        message: "You are not invited to join this workspace",
      });
    }

    // Add user to workspace
    const newUserWorkspace = new UserWorkspace({
      userId,
      workspaceId: workspace._id,
      role: "member",
      joinedAt: new Date(),
    });

    await newUserWorkspace.save();

    // Get the socket instance for real-time notifications
    const io = req.app.get("io");
    
    // Get the user's socket ID if they are connected
    const userSocketId = io?.userSocketMap?.[userId.toString()];
    
    // Send a real-time update to the user if they're online
    if (userSocketId) {
      const workspaceInfo = {
        _id: workspace._id,
        id: workspace._id,
        workspaceId: workspace._id,
        workspaceName: workspace.workspaceName,
        name: workspace.workspaceName,
        description: workspace.description,
        role: "member",
        isInvited: true,
        isOwned: false
      };
      
      // Emit the event to the user with the workspace info
      io.of("/dm").to(userSocketId).emit("workspaceJoined", workspaceInfo);
    }

    // Generate token for continued session
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "15d",
    });

    // Set the token in a cookie for subsequent requests
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    });

    res.status(201).json({
      success: true,
      message: "You have joined the workspace successfully",
      workspace: {
        id: workspace._id,
        name: workspace.workspaceName,
        description: workspace.description,
      },
      token: token, // Include token in response for client-side storage
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
      return res
        .status(404)
        .json({ success: false, message: "Workspace not found" });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const userWorkspace = await UserWorkspace.findOne({
      userId: user._id,
      workspaceId: workspace._id,
    });
    if (!userWorkspace) {
      return res.status(400).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }
    if (userWorkspace.role === "owner") {
      return res.status(400).json({
        success: false,
        message: "The owner cannot leave the workspace",
      });
    }
    await UserWorkspace.deleteOne({ _id: userWorkspace._id });
    res.status(200).json({
      success: true,
      message: "You have left the workspace successfully",
    });
  } catch (error) {
    console.error("Error in leaveWorkspace controller:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getUserWorkspaces = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
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

/**
 * Toggle workspace member role between admin and member
 */
export const toggleWorkspaceRole = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;
    const { userIds } = req.body;
    
    // Check if current user is a member of the workspace
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

    // Check if requester is admin or owner
    const isRequesterAdmin = await UserWorkspace.isAdmin(
      req.user.id,
      workspaceId
    );

    if (!isRequesterAdmin) {
      return res.status(403).json({
        success: false,
        message: "You must be an admin or owner to modify workspace roles",
      });
    }

    // Ensure userIds is an array (for backward compatibility)
    const targetUserIds = Array.isArray(userIds) ? userIds : [userIds];
    
    // Track results
    const results = {
      success: [],
      failed: []
    };

    // Process each user
    for (const userId of targetUserIds) {
      try {
        // Check if user is a member
        const isTargetMember = await UserWorkspace.isMember(
          userId,
          workspaceId
        );

        if (!isTargetMember) {
          results.failed.push({
            userId,
            reason: "User is not a member of this workspace"
          });
          continue;
        }

        // Get user's current role
        const userWorkspaceRecord = await UserWorkspace.findOne({ 
          userId, 
          workspaceId 
        });
        
        const currentRole = userWorkspaceRecord.role;
        
        // Prevent changing owner's role
        if (currentRole === "owner") {
          results.failed.push({
            userId,
            reason: "Cannot change role of workspace owner"
          });
          continue;
        }
        
        const newRole = currentRole === "admin" ? "member" : "admin";
        
        // Update user role with {new: true} to return the updated document
        await UserWorkspace.findOneAndUpdate(
          { userId, workspaceId },
          { role: newRole },
          { new: true }
        );

        results.success.push({
          userId,
          oldRole: currentRole,
          newRole: newRole
        });
      } catch (error) {
        results.failed.push({
          userId,
          reason: "Failed to update user role"
        });
      }
    }

    // Return results
    return res.status(200).json({
      success: true,
      message: `${results.success.length} user role(s) toggled successfully`,
      results
    });
  } catch (error) {
    console.error("Error in toggleWorkspaceRole controller:", error.message);
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
      workspace: {
        id: workspace._id,
        name: workspace.workspaceName,
        description: workspace.description,
      },
      members: members.map((member) => ({
        id: member.userId._id,
        username: member.userId.username,
        email: member.userId.email,
        avatar: member.userId.avatar,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
    });
  } catch (error) {
    console.error("Error in getWorkspaceMembers controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Remove a member from a workspace
 */
export const removeWorkspaceMember = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;
    const { userId: memberIdToRemove } = req.body;

    // Validate input
    if (!memberIdToRemove) {
      return res.status(400).json({
        success: false,
        message: "Member ID is required"
      });
    }

    // Check if workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
    }

    // Check if requester is a member of the workspace
    const requesterWorkspace = await UserWorkspace.findOne({
      userId: req.user.id,
      workspaceId
    });

    if (!requesterWorkspace) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace"
      });
    }

    // Check if requester has admin rights
    const isRequesterAdmin = await UserWorkspace.isAdmin(
      req.user.id,
      workspaceId
    );

    if (!isRequesterAdmin) {
      return res.status(403).json({
        success: false,
        message: "You must be an admin or owner to remove members"
      });
    }

    // Check if member to remove exists in the workspace
    const memberToRemove = await UserWorkspace.findOne({
      userId: memberIdToRemove,
      workspaceId
    });

    if (!memberToRemove) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this workspace"
      });
    }

    // Check if trying to remove the workspace owner
    if (memberToRemove.role === "owner") {
      return res.status(403).json({
        success: false,
        message: "Cannot remove the workspace owner"
      });
    }

    // Check if admin trying to remove another admin (only owners can do this)
    if (
      memberToRemove.role === "admin" && 
      requesterWorkspace.role !== "owner"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the workspace owner can remove admins"
      });
    }

    // Remove the member
    await UserWorkspace.findOneAndDelete({
      userId: memberIdToRemove,
      workspaceId
    });

    // Remove the user from the workspace
    await Workspace.findOneAndUpdate(
      { _id: workspaceId },
      { $pull: { invitedUsers: memberIdToRemove } }
    );

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Member removed from workspace successfully"
    });
    
  } catch (error) {
    console.error("Error in removeWorkspaceMember controller:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getWorkspaceInvitedUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }
    const invitedUsers = await User.find({
      _id: { $in: workspace.invitedUsers },
    });
    res.status(200).json({
      success: true,
      invitedUsers,
    });
    return res.status(200).json({ success: true, invitedUsers });
  } catch (error) {
    console.error(
      "Error in getWorkspaceInvitedUsers controller:",
      error.message
    );
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

