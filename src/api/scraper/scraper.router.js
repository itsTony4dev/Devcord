import { Router } from "express";
import scrapeLinkedInJobs from "./linkedin.scraper.js";
import { checkCronAuth } from "../../middleware/cronAuth.js";
import ScrapedJobs from "../../models/ScrapedJobs.js";

// Bulletproof normalization function for applicationLink
function normalizeLink(link) {
  try {
    const url = new URL(link);
    url.search = ""; // Remove query params
    let normalized = url.toString();
    if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
    return normalized.toLowerCase();
  } catch {
    return link;
  }
}

const scraperRouter = Router();

scraperRouter.get("/linkedin", checkCronAuth, async (_, res) => {
  try {
    const jobs = await scrapeLinkedInJobs();

    // Normalize and deduplicate in-memory
    const seenLinks = new Set();
    const uniqueJobs = [];
    for (const job of jobs) {
      job.applicationLink = normalizeLink(job.applicationLink);
      if (!seenLinks.has(job.applicationLink)) {
        seenLinks.add(job.applicationLink);
        uniqueJobs.push(job);
      }
    }

    // Prepare bulk upsert operations
    const operations = uniqueJobs.map(job => ({
      updateOne: {
        filter: { applicationLink: job.applicationLink },
        update: { $setOnInsert: job },
        upsert: true
      }
    }));

    let newJobsCount = 0;
    if (operations.length > 0) {
      const result = await ScrapedJobs.bulkWrite(operations);
      newJobsCount = result.upsertedCount || 0;
    }
    const duplicateJobsCount = uniqueJobs.length - newJobsCount;

    res.json({
      message: "Scraping completed successfully",
      newJobs: newJobsCount,
      duplicates: duplicateJobsCount,
      totalScraped: jobs.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default scraperRouter;
