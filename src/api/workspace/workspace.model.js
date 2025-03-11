import "dotenv/config";
import mongoose from "mongoose";
const { Schema } = mongoose;

const workspaceSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      minlength: [3, "Workspace name must be at least 3 characters long"],
      maxlength: [50, "Workspace name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    avatar: {
      type: String,
      default: null,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    inviteCode: {
      type: String,
      unique: true,
      default: () => Math.random().toString(36).substring(2, 10).toUpperCase(),
    },
    members: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["owner", "admin", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
workspaceSchema.index({ name: 1 });
workspaceSchema.index({ createdBy: 1 });
workspaceSchema.index({ inviteCode: 1 }, { unique: true });
workspaceSchema.index({ "members.userId": 1 });

// Virtual for getting public URL
workspaceSchema.virtual("invite_url").get(function () {
  return `${process.env.FRONTEND_URL}/invite/${this.inviteCode}`;
});

// Virtual for members count
workspaceSchema.virtual("members_count").get(function () {
  return this.members ? this.members.length : 0;
});

// Pre-save hook to ensure name is unique for a given user
workspaceSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("name")) {
    const existingWorkspace = await mongoose.models.Workspace.findOne({
      createdBy: this.createdBy,
      name: this.name,
    });

    if (existingWorkspace) {
      const error = new Error("You already have a workspace with this name");
      error.status = 400;
      return next(error);
    }
  }

  // If new workspace, add creator as first member with owner role
  if (this.isNew && this.createdBy) {
    const creatorExists =
      this.members &&
      this.members.some(
        (member) => member.userId.toString() === this.createdBy.toString()
      );

    if (!creatorExists) {
      if (!this.members) this.members = [];
      this.members.push({
        userId: this.createdBy,
        role: "owner",
        joinedAt: new Date(),
      });
    }
  }

  next();
});

// Instance method to check if a user is the owner
workspaceSchema.methods.isOwner = function (userId) {
  return this.createdBy.toString() === userId.toString();
};

// Instance method to check if a user is a member
workspaceSchema.methods.isMember = function (userId) {
  return this.members.some(
    (member) => member.userId.toString() === userId.toString()
  );
};

// Instance method to add a member
workspaceSchema.methods.addMember = function (userId, role = "member") {
  if (this.isMember(userId)) return false;

  this.members.push({
    userId: userId,
    role,
    joinedAt: new Date(),
  });

  return true;
};

// Instance method to remove a member
workspaceSchema.methods.removeMember = function (userId) {
  const initialLength = this.members.length;
  this.members = this.members.filter(
    (member) => member.userId.toString() !== userId.toString()
  );
  return initialLength !== this.members.length;
};

// Instance method to update member role
workspaceSchema.methods.updateMemberRole = function (userId, newRole) {
  const member = this.members.find(
    (member) => member.userId.toString() === userId.toString()
  );
  if (!member) return false;

  member.role = newRole;
  return true;
};

// Static method to find user's workspaces
workspaceSchema.statics.findUserWorkspaces = async function (userId) {
  return this.find({ "members.userId": userId })
    .select("-members")
    .sort({ createdAt: -1 });
};

// Static method to find workspace with members
workspaceSchema.statics.findWithMembers = async function (
  workspaceId,
  options = {}
) {
  const query = this.findById(workspaceId);

  if (options.populateMembers) {
    query.populate("members.userId", "username email avatar bio");
  }

  return query;
};

const Workspace = mongoose.model("Workspace", workspaceSchema);

module.exports = Workspace;
