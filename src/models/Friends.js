import mongoose from 'mongoose';
const { Schema } = mongoose;

const friendsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  friendId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Friend ID is required']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure uniqueness of friendship pairs
friendsSchema.index({ userId: 1, friendId: 1 }, { unique: true });
// Indexes for faster queries
friendsSchema.index({ userId: 1, status: 1 });
friendsSchema.index({ friendId: 1, status: 1 });

// Pre-save hook to prevent self-friending
friendsSchema.pre('save', function(next) {
  if (this.userId.toString() === this.friendId.toString()) {
    const error = new Error('Cannot add yourself as a friend');
    error.status = 400;
    return next(error);
  }
  this.updatedAt = new Date();
  next();
});

// Static method to find all friends of a user
friendsSchema.statics.findFriends = async function(userId) {
  const friends = await this.find({
    $or: [
      { userId: userId, status: 'accepted' },
      { friendId: userId, status: 'accepted' }
    ]
  }).populate('userId friendId', 'username avatar');
  
  return friends.map(friendship => {
    const friend = friendship.userId.toString() === userId.toString() 
      ? friendship.friendId 
      : friendship.userId;
    return {
      friendshipId: friendship._id,
      friendId: friend._id,
      username: friend.username,
      avatar: friend.avatar,
      createdAt: friendship.createdAt
    };
  });
};

const Friends = mongoose.model('Friends', friendsSchema);

export default Friends; 