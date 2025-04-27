import mongoose from 'mongoose';
const { Schema } = mongoose;

const directMessageSchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver ID is required']
  },
  content: {
    type: String,
    maxlength: [5000, 'Message content cannot exceed 5000 characters']
  },
  image:{
    type: String,
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
  readAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  // New field for workspace invitations
  isWorkspaceInvite: {
    type: Boolean,
    default: false
  },
  workspaceInvite: {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace'
    },
    workspaceName: String,
    inviteCode: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
directMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
directMessageSchema.index({ receiverId: 1, readAt: 1 });

// Pre-save hook to prevent sending messages to yourself
directMessageSchema.pre('save', function(next) {
  if (this.senderId.toString() === this.receiverId.toString()) {
    const error = new Error('Cannot send a message to yourself');
    error.status = 400;
    return next(error);
  }
  next();
});

// Static method to find conversation between two users
directMessageSchema.statics.findConversation = async function(user1Id, user2Id, limit = 50, before = null) {
  const query = {
    $or: [
      { senderId: user1Id, receiverId: user2Id },
      { senderId: user2Id, receiverId: user1Id }
    ],
    isDeleted: false
  };
  
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'username avatar')
    .populate('receiverId', 'username avatar');
};

// Static method to find unread messages for a user
directMessageSchema.statics.findUnreadMessages = async function(userId) {
  return this.find({ 
    receiverId: userId,
    readAt: null,
    isDeleted: false
  })
  .populate('senderId', 'username avatar')
  .sort({ createdAt: -1 });
};

directMessageSchema.statics.deleteConversation = async function (
  user1Id,
  user2Id
) {
  return this.deleteMany(
    {
      $or: [
        { senderId: user1Id, receiverId: user2Id },
        { senderId: user2Id, receiverId: user1Id },
      ],
      isDeleted: false, 
    }
  );
};


// Static method to mark messages as read
directMessageSchema.statics.markAsRead = async function(receiverId, senderId) {
  const now = new Date();
  return this.updateMany(
    { 
      receiverId: receiverId,
      senderId: senderId,
      readAt: null
    },
    { 
      $set: { readAt: now } 
    }
  );
};

const DirectMessage = mongoose.model('DirectMessage', directMessageSchema);

export default DirectMessage; 