import mongoose from 'mongoose';
const { Schema } = mongoose;

const userReportSchema = new Schema({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter ID is required']
  },
  reportedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reported user ID is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    enum: ['harassment', 'spam', 'inappropriate_content', 'impersonation', 'other'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
userReportSchema.index({ reporterId: 1 });
userReportSchema.index({ reportedUserId: 1 });
userReportSchema.index({ status: 1 });

const UserReport = mongoose.model('UserReport', userReportSchema);

export default UserReport; 