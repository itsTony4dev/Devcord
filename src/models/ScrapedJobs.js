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
  company: String,
  location: String,
  jobType: String,
  level: String,
  applicationLink: {
    type: String,
    required: true,
    unique: true,
  },
});

// Explicitly create index
scrapedJobsSchema.index({ applicationLink: 1 }, { unique: true, background: true });

// Pre-save hook to check for duplicates
scrapedJobsSchema.pre('save', async function(next) {
  try {
    // Check if this is a new document
    if (this.isNew) {
      const existingJob = await this.constructor.findOne({ applicationLink: this.applicationLink });
      if (existingJob) {
        const error = new Error(`Job with application link ${this.applicationLink} already exists`);
        error.name = 'DuplicateError';
        return next(error);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

const ScrapedJobs = mongoose.model("ScrapedJobs", scrapedJobsSchema);

// Ensure index exists
ScrapedJobs.createIndexes().catch(err => console.error("Error creating ScrapedJobs index:", err));

export default ScrapedJobs;
