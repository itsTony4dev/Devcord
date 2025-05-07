import puppeteer from "puppeteer";


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keywords or aliases for each category
const categoryAliases = {
  Frontend: ["frontend", "react", "vue", "angular", "front-end"],
  "Full-Stack": ["fullstack", "full-stack", "full", "stack", "mern", "mean"],
  Backend: ["backend", "back-end"],
  Mobile: ["mobile", "ios", "android", "flutter", "react-native"],
  Blockchain: ["blockchain", "web3", "crypto"],
  "UI/UX": ["ui", "ux", "designer"],
  DevOps: ["devops", "sre", "infrastructure", "ci/cd", "cloud"],
  Game: ["game", "unity", "unreal"],
  QA: ["qa", "quality", "test", "testing"],
  "AI/ML": ["ai", "ml", "machine learning", "artificial intelligence"],
  Software: ["software", "engineer", "developer"],
  Cybersecurity: ["cybersecurity", "security"],
  Data: ["data", "data scientist", "analytics"],
  IT: ["it", "support", "system admin"],
};

function categorizeJob(title) {
  if (!title || typeof title !== "string") return "Software";

  const lowerTitle = title.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryAliases)) {
    for (const keyword of keywords) {
      if (lowerTitle.includes(keyword)) {
        return category;
      }
    }
  }

  return "Software";
}


function detectJobLevel(jobTitle) {
  const lowerTitle = jobTitle.toLowerCase();
  if (lowerTitle.includes("intern")) return "internship";
  if (lowerTitle.includes("internship")) return "internship";
  if (lowerTitle.includes("junior") || lowerTitle.includes("jr"))
    return "junior";
  if (lowerTitle.includes("senior") || lowerTitle.includes("sr"))
    return "senior";
  if (lowerTitle.includes("lead")) return "lead";
  if (lowerTitle.includes("manager")) return "manager";
  return "mid";
}

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
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      Connection: "keep-alive",
    });

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const resourceType = request.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.setViewport({ width: 1200, height: 800 });
    page.setDefaultNavigationTimeout(30000);

    console.log("Navigating to LinkedIn...");

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Extracting job listings...");

    await page.waitForSelector(".base-card", { timeout: 15000 });

    const basicJobData = await page.evaluate(() => {
      const jobListings = Array.from(
        document.querySelectorAll(".base-card.relative.job-search-card")
      );

      return jobListings
        .map((listing) => {
          const titleElement = listing.querySelector(
            ".base-search-card__title"
          );
          const companyElement = listing.querySelector(
            ".base-search-card__subtitle"
          );
          const locationElement = listing.querySelector(
            ".job-search-card__location"
          );
          const linkElement = listing.querySelector("a.base-card__full-link");


          const title = titleElement
            ? titleElement.textContent.trim()
            : "Unknown Title";
          const company = companyElement
            ? companyElement.textContent.trim()
            : "Unknown Company";
          const location = locationElement
            ? locationElement.textContent.trim()
            : "";
          const link = linkElement ? linkElement.href : null;

          const isInLebanon = location.toLowerCase().includes("lebanon");

          return {
            title,
            company,
            location,
            applicationLink: link,
            isInLebanon,
          };
        })
        .filter((job) => job.title && job.company && job.applicationLink);
    });

    // Process job data outside browser context
    const processedJobs = basicJobData.map((job) => {
      return {
        ...job,
        category: categorizeJob(job.title),
        level: detectJobLevel(job.title),
        jobType: "Unknown", // will be updated with detailed info later
      };
    });

    const lebanonJobs = processedJobs.filter((job) => job.isInLebanon);

    console.log(`Successfully extracted ${lebanonJobs.length} jobs in Lebanon`);

    // OPTIMIZATION: Process job details in batches with a single page
    const detailPage = await browser.newPage();


    await detailPage.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await detailPage.setRequestInterception(true);
    detailPage.on("request", (request) => {
      const resourceType = request.resourceType();
      if (
        ["image", "stylesheet", "font", "media", "script"].includes(
          resourceType
        )
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    detailPage.setDefaultNavigationTimeout(15000);

    const BATCH_SIZE = 5;
    for (let i = 0; i < lebanonJobs.length; i += BATCH_SIZE) {
      const batch = lebanonJobs.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (jobs ${
          i + 1
        } to ${Math.min(i + BATCH_SIZE, lebanonJobs.length)})`
      );

      // Process each job in the batch sequentially
      for (let j = 0; j < batch.length; j++) {
        const job = batch[j];
        const jobIndex = i + j;

        try {
          console.log(
            `Processing job ${jobIndex + 1}/${lebanonJobs.length}: ${
              job.title
            } at ${job.company} in ${job.location}`
          );

          await detailPage.goto(job.applicationLink, {
            waitUntil: "domcontentloaded",
            timeout: 10000,
          });

          const titleVisible = await detailPage
            .waitForSelector(".top-card-layout__title", { timeout: 5000 })
            .catch(() => false);

          if (!titleVisible) {
            console.log("Could not load job details page properly, skipping");
            continue;
          }

          // Double check that this job is actually in Lebanon
          const confirmedLocation = await detailPage.evaluate(() => {
            const locationElements = [
              document.querySelector(
                ".job-details-jobs-unified-top-card__bullet"
              ),
              document.querySelector(
                ".job-details-jobs-unified-top-card__primary-description-container"
              ),
              document.querySelector(".jobs-unified-top-card__bullet"),
            ];

            for (const el of locationElements) {
              if (el && el.textContent) {
                return el.textContent.trim();
              }
            }
            return null;
          });

          // Remove job if it's not actually in Lebanon (double check)
          if (
            confirmedLocation &&
            !confirmedLocation.toLowerCase().includes("lebanon")
          ) {
            console.log(
              `Removing job - location '${confirmedLocation}' is not in Lebanon`
            );
            job.isInLebanon = false;
            continue; // Skip processing this job further
          }

          // Use a single evaluation to extract all needed information at once
          const jobDetails = await detailPage.evaluate(() => {

            // Extract job type
            let jobType = "Unknown";

            // Method 1: Check job criteria section
            const criteria = document.querySelectorAll(
              ".description__job-criteria-item"
            );
            for (const item of criteria) {
              const header = item.querySelector(
                ".description__job-criteria-subheader"
              );
              if (
                header &&
                header.textContent &&
                header.textContent.trim().includes("Employment type")
              ) {
                const value = item.querySelector(
                  ".description__job-criteria-text"
                );
                if (value) {
                  jobType = value.textContent.trim();
                }
              }
            }

            // Method 2: Check job insights
            if (jobType === "Unknown") {
              const insights = document.querySelectorAll(
                ".job-details-jobs-unified-top-card__job-insight"
              );
              for (const insight of insights) {
                const text = insight.textContent.trim();
                if (
                  text.includes("Full-time") ||
                  text.includes("Part-time") ||
                  text.includes("Contract")
                ) {
                  jobType = text;
                  break;
                }
              }
            }

            let workLocationType = null;

            // Method 1: Check job workplace type in criteria
            for (const item of criteria) {
              const header = item.querySelector(
                ".description__job-criteria-subheader"
              );
              if (
                header &&
                header.textContent &&
                (header.textContent.trim().includes("Workplace type") ||
                  header.textContent.trim().includes("Location"))
              ) {
                const value = item.querySelector(
                  ".description__job-criteria-text"
                );
                if (value) {
                  workLocationType = value.textContent.trim();
                  break;
                }
              }
            }

            // Method 2: Check job insights for work location type
            if (!workLocationType) {
              const insights = document.querySelectorAll(
                ".job-details-jobs-unified-top-card__job-insight"
              );
              for (const insight of insights) {
                const text = insight.textContent.trim();
                if (
                  text.includes("Remote") ||
                  text.includes("Hybrid") ||
                  text.includes("On-site")
                ) {
                  workLocationType = text;
                  break;
                }
              }
            }

            return { jobType, workLocationType };
          });

          // Update job with the collected details
          if (jobDetails.jobType !== "Unknown") {
            job.jobType = jobDetails.jobType;
            console.log(`Job type: ${jobDetails.jobType}`);
          }

          if (jobDetails.workLocationType) {
            // Check for remote/hybrid/on-site
            if (jobDetails.workLocationType.toLowerCase().includes("remote")) {
              job.workLocationType = "Remote";
              console.log(`Work location type: Remote`);
            } else if (
              jobDetails.workLocationType.toLowerCase().includes("hybrid")
            ) {
              job.workLocationType = "Hybrid";
              console.log(`Work location type: Hybrid`);
            } else {
              job.workLocationType = "On-site";
              console.log(`Work location type: On-site`);
            }
          }

          // Brief delay between jobs to avoid rate limiting
          if (j < batch.length - 1) {
            await delay(800); // Shorter delay between jobs in the same batch
          }
        } catch (error) {
          console.error(`Error processing job ${jobIndex + 1}:`, error.message);
        }
      }

      if (i + BATCH_SIZE < lebanonJobs.length) {
        console.log("Waiting between batches to avoid rate limiting...");
        await delay(1500);
      }
    }

    await detailPage.close();

    // Final filtering to ensure only Lebanon jobs are included
    const finalJobs = lebanonJobs.filter((job) => job.isInLebanon);

    const cleanedJobs = finalJobs.map((job) => {
      return {
        title: job.title,
        category: job.category,
        company: job.company,
        location: job.location,
        jobType: job.jobType,
        level: job.level,
        workLocationType: job.workLocationType,
        applicationLink: job.applicationLink,
      };
    });

    console.log(`Final count: ${cleanedJobs.length} jobs in Lebanon`);
    return cleanedJobs;
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
