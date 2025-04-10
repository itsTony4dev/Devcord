import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import fs from "fs/promises";

const scrapeLinkedInJobs = async () => {
  let browser;
  try {
    const url =
      "https://www.linkedin.com/jobs/search/?distance=25&f_TPR=r86400&geoId=101834488&keywords=software%20developer&origin=JOB_SEARCH_PAGE_JOB_FILTER";

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewport({ width: 1920, height: 1080 });

    page.setDefaultNavigationTimeout(60000);

    console.log("Navigating to LinkedIn...");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    await page.waitForSelector(".base-card", { timeout: 30000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    const jobs = [];

    $(".base-card").each((i, el) => {
      const title = $(el).find(".base-search-card__title").text().trim();
      const company = $(el).find(".base-search-card__subtitle").text().trim();
      const location = $(el).find(".job-search-card__location").text().trim();
      const link = $(el).find("a.base-card__full-link").attr("href");
      const posted = $(el).find("time").attr("datetime");

      if (title && company) {
        jobs.push({ title, company, location, link, posted });
      }
    });

    console.log(`Found ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error("Error scraping LinkedIn:", error);
    throw new Error(`Failed to scrape LinkedIn: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export default scrapeLinkedInJobs;
