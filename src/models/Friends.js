import mongoose from "mongoose";
const { Schema } = mongoose;

const friendsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    friendId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Friend ID is required"],
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of friendship pairs
friendsSchema.index({ userId: 1, friendId: 1 }, { unique: true });
// Indexes for faster queries
friendsSchema.index({ userId: 1, status: 1 });
friendsSchema.index({ friendId: 1, status: 1 });

// Pre-save hook to prevent self-friending
friendsSchema.pre("save", function (next) {
  if (this.userId.toString() === this.friendId.toString()) {
    const error = new Error("Cannot add yourself as a friend");
    error.status = 400;
    return next(error);
  }
  this.updatedAt = new Date();
  next();
});

// Static method to find all friends of a user
friendsSchema.statics.findFriends = async function (userId) {
  try {
    // Make sure we're working with a valid ObjectId
   const userObjectId = mongoose.Types.ObjectId.isValid(userId)
     ? mongoose.Types.ObjectId.fromString(userId)
     : userId;
    // Find all accepted friendships where the user is either userId or friendId
    const friends = await this.find({
      $or: [
        { userId: userObjectId, status: "accepted" },
        { friendId: userObjectId, status: "accepted" },
      ],
    })
      .populate("userId", "username avatar")
      .populate("friendId", "username avatar");

    // Transform the results to always show the friend's data, not the current user's
    return friends.map((friendship) => {
      // Determine which user is the friend (not the current user)
      const isFriend =
        friendship.friendId._id.toString() === userObjectId.toString();
      const friend = isFriend ? friendship.userId : friendship.friendId;

      return {
        friendshipId: friendship._id,
        friendId: friend._id,
        username: friend.username,
        avatar: friend.avatar,
        status: friendship.status,
        createdAt: friendship.createdAt,
      };
    });
  } catch (error) {
    console.error("Error in findFriends:", error);
    throw error;
  }
};

const Friends = mongoose.model("Friends", friendsSchema);

export default Friends;
