import mongoose from "mongoose";
const { Schema } = mongoose;

const userWorkspaceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace ID is required"],
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
  {
    timestamps: true,
  }
);

userWorkspaceSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

userWorkspaceSchema.index({ workspaceId: 1 });
userWorkspaceSchema.index({ userId: 1 });

userWorkspaceSchema.statics.findUserWorkspaces = async function (userId) {
  return this.find({ userId: userId })
    .populate("workspaceId", "workspaceName description createdAt")
    .sort({ joinedAt: -1 });
};

userWorkspaceSchema.statics.findWorkspaceMembers = async function (
  workspaceId
) {
  return this.find({ workspaceId: workspaceId })
    .populate("userId", "username email avatar")
    .sort({ joinedAt: 1 });
};


userWorkspaceSchema.statics.isMember = async function (userId, workspaceId) {
  const membership = await this.findOne({
    userId: userId,
    workspaceId: workspaceId,
  });
  return !!membership;
};

userWorkspaceSchema.statics.isAdmin = async function (userId, workspaceId) {
  const membership = await this.findOne({
    userId: userId,
    workspaceId: workspaceId,
    role: { $in: ["owner", "admin"] },
  });
  return !!membership;
};

const UserWorkspace = mongoose.model("UserWorkspace", userWorkspaceSchema);

export default UserWorkspace;
