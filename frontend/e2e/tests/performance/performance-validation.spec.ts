import { test, expect } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";
import { TestDataSeeder } from "../../utils/test-data-seeder";

test.describe("Performance Validation", () => {
  let testHelpers: TestHelpers;
  let testDataSeeder: TestDataSeeder;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    testDataSeeder = new TestDataSeeder();
    await testHelpers.loginAsRecruiter();
  });

  test.afterEach(async () => {
    await testDataSeeder.cleanup();
  });

  test("should load dashboard within performance budget", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/dashboard");
    await expect(
      page.locator('[data-testid="dashboard-header"]')
    ).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};

          entries.forEach((entry) => {
            if (entry.name === "first-contentful-paint") {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === "largest-contentful-paint") {
              vitals.lcp = entry.startTime;
            }
          });

          resolve(vitals);
        }).observe({ entryTypes: ["paint", "largest-contentful-paint"] });

        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });

    // FCP should be under 1.8s, LCP should be under 2.5s
    if (metrics.fcp) expect(metrics.fcp).toBeLessThan(1800);
    if (metrics.lcp) expect(metrics.lcp).toBeLessThan(2500);
  });

  test("should handle large candidate lists efficiently", async ({ page }) => {
    // Seed large dataset
    await testDataSeeder.seedLargeCandidateDataset(500);

    const startTime = Date.now();
    await page.goto("/candidates");

    // Wait for initial load
    await expect(page.locator('[data-testid="candidates-page"]')).toBeVisible();
    const initialLoadTime = Date.now() - startTime;

    // Should load within 5 seconds even with large dataset
    expect(initialLoadTime).toBeLessThan(5000);

    // Test scrolling performance
    const scrollStartTime = Date.now();

    // Scroll through multiple pages
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(100);
    }

    const scrollTime = Date.now() - scrollStartTime;

    // Scrolling should be smooth (under 2 seconds for 5 scroll actions)
    expect(scrollTime).toBeLessThan(2000);

    // Test search performance
    const searchStartTime = Date.now();
    await page
      .locator('[data-testid="candidate-search"]')
      .fill("test search query");
    await page.locator('[data-testid="search-button"]').click();

    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    const searchTime = Date.now() - searchStartTime;

    // Search should complete within 2 seconds
    expect(searchTime).toBeLessThan(2000);
  });

  test("should handle Kanban board with many candidates efficiently", async ({
    page,
  }) => {
    // Create job with many applications
    const jobId = await testDataSeeder.createTestJob();
    await testDataSeeder.seedLargeApplicationDataset(jobId, 100);

    const startTime = Date.now();
    await page.goto("/applications");

    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
    const loadTime = Date.now() - startTime;

    // Should load within 4 seconds
    expect(loadTime).toBeLessThan(4000);

    // Test drag and drop performance
    const dragStartTime = Date.now();

    const sourceCard = page.locator('[data-testid^="candidate-card-"]').first();
    const targetColumn = page.locator('[data-testid="stage-column-screening"]');

    await sourceCard.dragTo(targetColumn);

    // Wait for update to complete
    await expect(
      targetColumn.locator('[data-testid^="candidate-card-"]')
    ).toBeVisible();
    const dragTime = Date.now() - dragStartTime;

    // Drag and drop should complete within 1 second
    expect(dragTime).toBeLessThan(1000);

    // Test column filtering performance
    const filterStartTime = Date.now();
    await page.locator('[data-testid="stage-filter-screening"]').click();

    await expect(
      page.locator('[data-testid="filtered-candidates"]')
    ).toBeVisible();
    const filterTime = Date.now() - filterStartTime;

    expect(filterTime).toBeLessThan(1000);
  });

  test("should render analytics charts efficiently with large datasets", async ({
    page,
  }) => {
    // Seed large analytics dataset
    await testDataSeeder.seedLargeAnalyticsDataset(1000);

    const startTime = Date.now();
    await page.goto("/analytics");

    // Wait for all charts to load
    await expect(
      page.locator('[data-testid="recruitment-metrics-chart"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="pipeline-metrics-chart"]')
    ).toBeVisible();

    const chartsLoadTime = Date.now() - startTime;

    // Charts should load within 5 seconds
    expect(chartsLoadTime).toBeLessThan(5000);

    // Test chart interaction performance
    const interactionStartTime = Date.now();

    await page.locator('[data-testid="recruitment-metrics-chart"]').hover();
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();

    const interactionTime = Date.now() - interactionStartTime;

    // Chart interactions should be responsive (under 500ms)
    expect(interactionTime).toBeLessThan(500);

    // Test date range filtering performance
    const filterStartTime = Date.now();

    await page.locator('[data-testid="date-range-picker"]').click();
    await page.locator('[data-testid="date-range-last-7-days"]').click();

    // Wait for charts to update
    await page.waitForTimeout(1000);
    const filterTime = Date.now() - filterStartTime;

    // Date filtering should complete within 3 seconds
    expect(filterTime).toBeLessThan(3000);
  });

  test("should handle file uploads efficiently", async ({ page }) => {
    await page.goto("/candidates/upload");

    // Test single file upload performance
    const uploadStartTime = Date.now();

    await page
      .locator('[data-testid="resume-upload-input"]')
      .setInputFiles("e2e/fixtures/files/sample-resume.pdf");

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
      timeout: 10000,
    });

    const uploadTime = Date.now() - uploadStartTime;

    // File upload should complete within 8 seconds
    expect(uploadTime).toBeLessThan(8000);

    // Test multiple file uploads
    await page.goto("/candidates/upload");

    const multiUploadStartTime = Date.now();

    await page
      .locator('[data-testid="resume-upload-input"]')
      .setInputFiles([
        "e2e/fixtures/files/sample-resume.pdf",
        "e2e/fixtures/files/sample-resume.docx",
      ]);

    // Wait for all uploads to complete
    await expect(
      page.locator('[data-testid="all-uploads-complete"]')
    ).toBeVisible({ timeout: 15000 });

    const multiUploadTime = Date.now() - multiUploadStartTime;

    // Multiple uploads should complete within 15 seconds
    expect(multiUploadTime).toBeLessThan(15000);
  });

  test("should handle form submissions efficiently", async ({ page }) => {
    await page.goto("/candidates/new");

    // Fill form with data
    await page
      .locator('[data-testid="candidate-name"]')
      .fill("Performance Test User");
    await page
      .locator('[data-testid="candidate-email"]')
      .fill("performance@test.com");
    await page.locator('[data-testid="candidate-phone"]').fill("1234567890");
    await page.locator('[data-testid="candidate-location"]').fill("Test City");

    // Test form submission performance
    const submitStartTime = Date.now();

    await page.locator('[data-testid="candidate-form-submit"]').click();

    // Wait for success message or redirect
    await expect(page.locator('[data-testid="form-success"]')).toBeVisible({
      timeout: 5000,
    });

    const submitTime = Date.now() - submitStartTime;

    // Form submission should complete within 3 seconds
    expect(submitTime).toBeLessThan(3000);
  });

  test("should handle navigation efficiently", async ({ page }) => {
    // Test navigation between major sections
    const sections = [
      { path: "/dashboard", testId: "dashboard-header" },
      { path: "/candidates", testId: "candidates-page" },
      { path: "/jobs", testId: "jobs-page" },
      { path: "/applications", testId: "applications-page" },
      { path: "/analytics", testId: "analytics-dashboard" },
    ];

    for (const section of sections) {
      const navStartTime = Date.now();

      await page.goto(section.path);
      await expect(
        page.locator(`[data-testid="${section.testId}"]`)
      ).toBeVisible();

      const navTime = Date.now() - navStartTime;

      // Each navigation should complete within 2 seconds
      expect(navTime).toBeLessThan(2000);
    }
  });

  test("should handle memory usage efficiently", async ({ page }) => {
    // Navigate through multiple pages to test memory leaks
    const pages = [
      "/dashboard",
      "/candidates",
      "/jobs",
      "/applications",
      "/analytics",
    ];

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Navigate through pages multiple times
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForTimeout(1000);
      }
    }

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory usage shouldn't increase dramatically (allow 50MB increase)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    }
  });

  test("should handle concurrent operations efficiently", async ({ page }) => {
    const jobId = await testDataSeeder.createTestJob();
    await testDataSeeder.seedLargeApplicationDataset(jobId, 50);

    await page.goto("/applications");
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Perform multiple concurrent operations
    const operations = [];

    // Start multiple drag operations
    const candidateCards = page.locator('[data-testid^="candidate-card-"]');
    const targetColumn = page.locator('[data-testid="stage-column-screening"]');

    const concurrentStartTime = Date.now();

    // Simulate concurrent user actions
    operations.push(
      candidateCards.nth(0).dragTo(targetColumn),
      candidateCards.nth(1).dragTo(targetColumn),
      page.locator('[data-testid="stage-filter-applied"]').click(),
      page.locator('[data-testid="candidate-search"]').fill("test")
    );

    await Promise.all(operations);

    const concurrentTime = Date.now() - concurrentStartTime;

    // Concurrent operations should complete within 5 seconds
    expect(concurrentTime).toBeLessThan(5000);
  });

  test("should maintain performance under load", async ({ page }) => {
    // Simulate high load scenario
    await testDataSeeder.seedLargeCandidateDataset(200);
    await testDataSeeder.seedLargeAnalyticsDataset(500);

    // Test multiple rapid page loads
    const rapidLoadStartTime = Date.now();

    for (let i = 0; i < 5; i++) {
      await page.goto("/candidates");
      await expect(
        page.locator('[data-testid="candidates-page"]')
      ).toBeVisible();

      await page.goto("/analytics");
      await expect(
        page.locator('[data-testid="analytics-dashboard"]')
      ).toBeVisible();
    }

    const rapidLoadTime = Date.now() - rapidLoadStartTime;

    // Rapid page loads should complete within 15 seconds
    expect(rapidLoadTime).toBeLessThan(15000);
  });
});
