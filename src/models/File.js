import mongoose from 'mongoose';
const { Schema } = mongoose;

const fileSchema = new Schema({
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: [true, 'Message ID is required']
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required']
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
    maxlength: [255, 'File name cannot exceed 255 characters']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  fileType: {
    type: String,
    required: [true, 'File type is required']
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader ID is required']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
fileSchema.index({ messageId: 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ fileType: 1 });

// Virtual for getting file extension
fileSchema.virtual('fileExtension').get(function() {
  if (!this.fileName) return '';
  const parts = this.fileName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
});

// Static method to find files by user
fileSchema.statics.findUserFiles = async function(userId, limit = 20) {
  return this.find({ uploadedBy: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('messageId', 'channelId content');
};

// Static method to find files in a channel
fileSchema.statics.findChannelFiles = async function(channelId, limit = 20) {
  const messages = await mongoose.models.Message.find({ channelId: channelId })
    .select('_id')
    .lean();
  
  const messageIds = messages.map(msg => msg._id);
  
  return this.find({ messageId: { $in: messageIds } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('messageId', 'content userId')
    .populate('uploadedBy', 'username avatar');
};

const File = mongoose.model('File', fileSchema);

export default File; 