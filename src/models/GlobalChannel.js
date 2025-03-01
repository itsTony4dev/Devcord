import mongoose from "mongoose";

const globalChannelSchema = new mongoose.Schema({
  name: {
    type: String,
    default: "Jobs Channel",
    immutable: true
  },
  description: {
    type: String,
    default: "A channel for posting relevant job opportunities.",
    immutable: true
  },
  jobPostings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobPosting"
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
});

const GlobalChannel = mongoose.model("GlobalChannel", globalChannelSchema);
export default GlobalChannel;
