import { Router } from "express";
import scrapeLinkedInJobs from "./linkedin.scraper.js";
import { checkCronAuth } from "../../middleware/cronAuth.js";

const scraperRouter = Router();

scraperRouter.get("/linkedin", checkCronAuth, async (_, res) => {
  const jobs = await scrapeLinkedInJobs();
  res.json(jobs);
});

export default scraperRouter;
