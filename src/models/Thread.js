import mongoose from 'mongoose';
const { Schema } = mongoose;

const threadSchema = new Schema({
  threadName: {
    type: String,
    trim: true,
    maxlength: [100, 'Thread name cannot exceed 100 characters'],
    default: ''
  },
  parentMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: [true, 'Parent message ID is required']
  },
  channelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: [true, 'Channel ID is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
threadSchema.index({ channelId: 1 });
threadSchema.index({ parentMessageId: 1 }, { unique: true });
threadSchema.index({ participants: 1 });
threadSchema.index({ lastActivity: -1 });

// Update last activity timestamp when thread is modified
threadSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

// Static method to find all threads in a channel
threadSchema.statics.findChannelThreads = async function(channelId) {
  return this.find({ channelId: channelId })
    .populate('parentMessageId', 'content userId createdAt')
    .sort({ lastActivity: -1 });
};

// Static method to find threads a user has participated in
threadSchema.statics.findUserThreads = async function(userId) {
  return this.find({ participants: userId })
    .populate('channelId', 'channelName workspaceId')
    .populate('parentMessageId', 'content userId createdAt')
    .sort({ lastActivity: -1 });
};

const Thread = mongoose.model('Thread', threadSchema);

export default Thread; 