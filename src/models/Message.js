import mongoose from 'mongoose';
const { Schema } = mongoose;

const messageSchema = new Schema({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: [true, 'Channel ID is required']
  },
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null
  },
  threadId: {
    type: Schema.Types.ObjectId,
    ref: 'Thread',
    default: null
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  content: {
    type: String,
    maxlength: [5000, 'Message content cannot exceed 5000 characters']
  },
  image:{
    type:String,
    default: null
  },
  isCode: {
    type: Boolean,
    default: false
  },
  lang: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  editedAt: {
    type: Date,
    default: null
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  reactions: [{
    emoji: String,
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ workspaceId: 1, createdAt: -1 });
messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ userId: 1 });
messageSchema.index({ mentions: 1 });
messageSchema.index({ content: 'text' });

// Static method to find messages in a channel
messageSchema.statics.findChannelMessages = async function(channelId, limit = 50, before = null) {
  const query = { channelId: channelId, threadId: null };
  
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar')
    .populate('mentions', 'username');
};

// Static method to find messages in a thread
messageSchema.statics.findThreadMessages = async function(threadId, limit = 50) {
  return this.find({ threadId: threadId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('userId', 'username avatar')
    .populate('mentions', 'username');
};

// Static method to find messages that mention a user
messageSchema.statics.findMentions = async function(userId, limit = 20) {
  return this.find({ mentions: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar')
    .populate('channelId', 'channelName workspaceId');
};

const Message = mongoose.model('Message', messageSchema);

export default Message; 