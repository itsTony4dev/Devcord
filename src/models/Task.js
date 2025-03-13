import mongoose from 'mongoose';
const { Schema } = mongoose;

const taskSchema = new Schema({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: [true, 'Channel ID is required']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator ID is required']
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [3, 'Task title must be at least 3 characters'],
    maxlength: [100, 'Task title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done'],
    default: 'todo'
  },
  dueDate: {
    type: Date,
    default: null
  },
  assignedTo: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
taskSchema.index({ channelId: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ dueDate: 1 });

// Static method to find tasks in a channel
taskSchema.statics.findChannelTasks = async function(channelId) {
  return this.find({ channelId: channelId })
    .populate('createdBy', 'username avatar')
    .populate('assignedTo', 'username avatar')
    .sort({ createdAt: -1 });
};

// Static method to find tasks assigned to a user
taskSchema.statics.findUserTasks = async function(userId) {
  return this.find({ assignedTo: userId })
    .populate('channelId', 'channelName workspaceId')
    .populate('createdBy', 'username avatar')
    .sort({ dueDate: 1, priority: -1 });
};

// Static method to find overdue tasks
taskSchema.statics.findOverdueTasks = async function(userId) {
  const now = new Date();
  return this.find({ 
    assignedTo: userId,
    dueDate: { $lt: now },
    status: { $ne: 'done' }
  })
  .populate('channelId', 'channelName workspaceId')
  .sort({ dueDate: 1 });
};

const Task = mongoose.model('Task', taskSchema);

export default Task; 