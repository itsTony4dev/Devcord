import mongoose from "mongoose";

const scrapedJobsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  company: {
    type: String,
  },
  location: {
    type: String,
  },
  jobType: {
    enum: ["part-time,", "full-time", "contract"],
  },
  level: {
    enum: ["internship, junior, senior, lead, manager"],
  },
  applicationLink: {
    type: String,
    required: true,
  },
});

const ScrapedJobs = mongoose.model("ScrapedJobs", scrapedJobsSchema);
export default ScrapedJobs;
