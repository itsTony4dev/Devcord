import { Router } from "express";
import scrapeLinkedInJobs from "./linkedin.scraper.js";
import { checkCronAuth } from "../../middleware/cronAuth.js";

const scraperRouter = Router();

scraperRouter.get("/linkedin", checkCronAuth, async (_, res) => {
  try {
    const jobs = await scrapeLinkedInJobs();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default scraperRouter;
