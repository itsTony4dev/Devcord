import mongoose from "mongoose";

const jobPostingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  link: {
    type: String,
    required: true,
  },
  postedAt: {
    type: Date,
    default: Date.now
  }
});

const JobPosting = mongoose.model("JobPosting", jobPostingSchema);
export default JobPosting;
