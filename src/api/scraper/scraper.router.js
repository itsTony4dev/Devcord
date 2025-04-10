import { Router } from "express";
import scrapeLinkedInJobs from "./linkedin.scraper.js";

const scraperRouter = Router();

scraperRouter.get("/linkedin", async (req, res) => {
  const jobs = await scrapeLinkedInJobs();
  res.json(jobs);
});

export default scraperRouter;
