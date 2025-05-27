import { Router } from "express";
import ScrapedJobs from "../../models/ScrapedJobs.js";

const jobsRouter = Router();

// GET /api/jobs?page=1&limit=20
jobsRouter.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      ScrapedJobs.find().sort({ _id: -1 }).skip(skip).limit(limit),
      ScrapedJobs.countDocuments()
    ]);

    res.json({
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default jobsRouter; 