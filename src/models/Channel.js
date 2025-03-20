import mongoose from 'mongoose';
const { Schema } = mongoose;

const channelSchema = new Schema({
  channelName: {
    type: String,
    required: [true, 'Channel name is required'],
    trim: true,
    minlength: [2, 'Channel name must be at least 2 characters'],
    maxlength: [50, 'Channel name cannot exceed 50 characters']
  },
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace ID is required']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator ID is required']
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  allowedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
channelSchema.index({ workspaceId: 1 });
channelSchema.index({ workspaceId: 1, channelName: 1 }, { unique: true });
channelSchema.index({ createdBy: 1 });

// Pre-save hook to ensure channel name is unique within a workspace
channelSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('channelName')) {
    const existingChannel = await mongoose.models.Channel.findOne({
      workspaceId: this.workspaceId,
      channelName: this.channelName
    });

    if (existingChannel && !existingChannel._id.equals(this._id)) {
      const error = new Error('A channel with this name already exists in this workspace');
      error.status = 400;
      return next(error);
    }
  }
  next();
});

// Static method to find all channels in a workspace
channelSchema.statics.findWorkspaceChannels = async function(workspaceId, userId) {
  const query = { workspaceId: workspaceId };
  
  // If user ID is provided, include private channels where user is allowed
  if (userId) {
    query.$or = [
      { isPrivate: false },
      { isPrivate: true, allowedUsers: userId },
      { createdBy: userId }
    ];
  } else {
    query.isPrivate = false;
  }
  
  return this.find(query).sort({ createdAt: 1 });
};

const Channel = mongoose.model('Channel', channelSchema);

export default Channel; 