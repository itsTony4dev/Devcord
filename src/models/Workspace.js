import mongoose from "mongoose";
const { Schema } = mongoose;

const workspaceSchema = new Schema(
  {
    workspaceName: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      minlength: [3, "Workspace name must be at least 3 characters"],
      maxlength: [50, "Workspace name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    inviteCode: {
      type: String,
      unique: true,
      default: () => Math.random().toString(36).substring(2, 10).toUpperCase(),
    },
    invitedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
workspaceSchema.index({ workspaceName: 1 });
workspaceSchema.index({ createdBy: 1 });

// Virtual for getting invite URL
workspaceSchema.virtual("inviteUrl").get(function () {
  return `${
    process.env.FRONTEND_URL.split(",")[0] || "http://localhost:3000"
  }/invite/${this.inviteCode}`;
});

// Pre-save hook to ensure name is unique for a given user
workspaceSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("workspaceName")) {
    const existingWorkspace = await mongoose.models.Workspace.findOne({
      createdBy: this.createdBy,
      workspaceName: this.workspaceName,
    });

    if (existingWorkspace) {
      const error = new Error("You already have a workspace with this name");
      error.status = 400;
      return next(error);
    }
  }
  next();
});

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;
