import { jest } from '@jest/globals';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

// Mock the required modules
jest.mock('puppeteer');
jest.mock('cheerio');

describe('Scraper Controller', () => {
  let mockReq;
  let mockRes;
  let mockJson;
  let mockStatus;
  let mockBrowser;
  let mockPage;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {
      body: {},
      params: {},
      user: { _id: 'user123' },
    };
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    // Mock browser and page
    mockPage = {
      goto: jest.fn(),
      content: jest.fn(),
      close: jest.fn(),
    };
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };
    puppeteer.launch.mockResolvedValue(mockBrowser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scrapeStackOverflow', () => {
    it('should return 400 when query is missing', async () => {
      mockReq.query = {};
      await scrapeStackOverflow(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Search query is required',
      });
    });

    it('should scrape Stack Overflow successfully', async () => {
      const mockHtml = `
        <div class="question-summary">
          <h3><a href="/questions/1">Test Question 1</a></h3>
          <div class="stats">
            <span class="vote-count">10</span>
            <span class="answer-count">2</span>
          </div>
        </div>
      `;
      const mockCheerio = {
        find: jest.fn().mockReturnThis(),
        map: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnValue([
          {
            title: 'Test Question 1',
            link: '/questions/1',
            votes: '10',
            answers: '2',
          },
        ]),
      };

      mockReq.query = { q: 'test query' };
      mockPage.content.mockResolvedValue(mockHtml);
      cheerio.load.mockReturnValue(mockCheerio);

      await scrapeStackOverflow(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        results: expect.any(Array),
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle scraping errors', async () => {
      mockReq.query = { q: 'test query' };
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      await scrapeStackOverflow(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Error scraping Stack Overflow',
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('scrapeGitHub', () => {
    it('should return 400 when query is missing', async () => {
      mockReq.query = {};
      await scrapeGitHub(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Search query is required',
      });
    });

    it('should scrape GitHub successfully', async () => {
      const mockHtml = `
        <div class="repo-list">
          <div class="repo-item">
            <h3><a href="/user/repo">Test Repo</a></h3>
            <p class="description">Test Description</p>
            <div class="stats">
              <span class="stars">100</span>
              <span class="forks">50</span>
            </div>
          </div>
        </div>
      `;
      const mockCheerio = {
        find: jest.fn().mockReturnThis(),
        map: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnValue([
          {
            name: 'Test Repo',
            link: '/user/repo',
            description: 'Test Description',
            stars: '100',
            forks: '50',
          },
        ]),
      };

      mockReq.query = { q: 'test query' };
      mockPage.content.mockResolvedValue(mockHtml);
      cheerio.load.mockReturnValue(mockCheerio);

      await scrapeGitHub(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        results: expect.any(Array),
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle scraping errors', async () => {
      mockReq.query = { q: 'test query' };
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      await scrapeGitHub(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Error scraping GitHub',
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('scrapeDocumentation', () => {
    it('should return 400 when query is missing', async () => {
      mockReq.query = {};
      await scrapeDocumentation(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Search query is required',
      });
    });

    it('should scrape documentation successfully', async () => {
      const mockHtml = `
        <div class="doc-section">
          <h2><a href="/docs/page">Test Page</a></h2>
          <p class="description">Test Description</p>
          <div class="content">
            <p>Test content</p>
          </div>
        </div>
      `;
      const mockCheerio = {
        find: jest.fn().mockReturnThis(),
        map: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnValue([
          {
            title: 'Test Page',
            link: '/docs/page',
            description: 'Test Description',
            content: 'Test content',
          },
        ]),
      };

      mockReq.query = { q: 'test query' };
      mockPage.content.mockResolvedValue(mockHtml);
      cheerio.load.mockReturnValue(mockCheerio);

      await scrapeDocumentation(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        results: expect.any(Array),
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle scraping errors', async () => {
      mockReq.query = { q: 'test query' };
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      await scrapeDocumentation(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Error scraping documentation',
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
}); 