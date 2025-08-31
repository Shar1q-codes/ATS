import { test, expect } from "@playwright/test";
import { TestDataSeeder } from "../../utils/test-data-seeder";
import { TestHelpers } from "../../utils/test-helpers";

test.describe("Analytics Dashboard E2E Tests", () => {
  let testHelpers: TestHelpers;
  let testDataSeeder: TestDataSeeder;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    testDataSeeder = new TestDataSeeder();

    // Seed test data for analytics
    await testDataSeeder.seedAnalyticsData();

    // Login as admin user
    await testHelpers.loginAsAdmin();
  });

  test.afterEach(async () => {
    await testDataSeeder.cleanup();
  });

  test("should display analytics dashboard with real data", async ({
    page,
  }) => {
    await page.goto("/analytics");

    // Wait for dashboard to load
    await expect(
      page.locator('[data-testid="analytics-dashboard"]')
    ).toBeVisible();

    // Check main metrics cards are present
    await expect(
      page.locator('[data-testid="total-applications"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="time-to-fill"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversion-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-jobs"]')).toBeVisible();

    // Verify charts are rendered
    await expect(
      page.locator('[data-testid="recruitment-metrics-chart"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="pipeline-metrics-chart"]')
    ).toBeVisible();

    // Test date range picker functionality
    await page.locator('[data-testid="date-range-picker"]').click();
    await page.locator('[data-testid="date-range-last-30-days"]').click();

    // Wait for data to refresh
    await page.waitForTimeout(1000);

    // Verify metrics updated
    await expect(
      page.locator('[data-testid="total-applications"]')
    ).toContainText(/\d+/);
  });

  test("should handle large dataset performance", async ({ page }) => {
    // Seed large dataset
    await testDataSeeder.seedLargeAnalyticsDataset(1000);

    const startTime = Date.now();
    await page.goto("/analytics");

    // Wait for dashboard to fully load
    await expect(
      page.locator('[data-testid="analytics-dashboard"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="recruitment-metrics-chart"]')
    ).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Dashboard should load within 5 seconds even with large dataset
    expect(loadTime).toBeLessThan(5000);

    // Test chart interactions with large dataset
    await page.locator('[data-testid="pipeline-metrics-chart"]').hover();
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();

    // Test filtering performance
    const filterStartTime = Date.now();
    await page.locator('[data-testid="date-range-picker"]').click();
    await page.locator('[data-testid="date-range-last-7-days"]').click();

    await expect(
      page.locator('[data-testid="recruitment-metrics-chart"]')
    ).toBeVisible();
    const filterTime = Date.now() - filterStartTime;

    // Filtering should complete within 2 seconds
    expect(filterTime).toBeLessThan(2000);
  });

  test("should generate and export reports with real data", async ({
    page,
  }) => {
    await page.goto("/analytics/reports");

    // Create new report
    await page.locator('[data-testid="create-report-button"]').click();
    await page
      .locator('[data-testid="report-name"]')
      .fill("Test Performance Report");
    await page.locator('[data-testid="report-type-pipeline"]').click();
    await page.locator('[data-testid="create-report-submit"]').click();

    // Wait for report generation
    await expect(page.locator('[data-testid="report-preview"]')).toBeVisible({
      timeout: 10000,
    });

    // Test CSV export
    const downloadPromise = page.waitForEvent("download");
    await page.locator('[data-testid="export-csv"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/.*\.csv$/);

    // Test PDF export
    const pdfDownloadPromise = page.waitForEvent("download");
    await page.locator('[data-testid="export-pdf"]').click();
    const pdfDownload = await pdfDownloadPromise;

    expect(pdfDownload.suggestedFilename()).toMatch(/.*\.pdf$/);
  });

  test("should display pipeline metrics with bottleneck identification", async ({
    page,
  }) => {
    await page.goto("/analytics/pipeline");

    // Wait for pipeline metrics to load
    await expect(
      page.locator('[data-testid="pipeline-metrics-page"]')
    ).toBeVisible();

    // Check pipeline stage metrics
    await expect(
      page.locator('[data-testid="applied-stage-metrics"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="screening-stage-metrics"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="interview-stage-metrics"]')
    ).toBeVisible();

    // Verify bottleneck identification
    await expect(
      page.locator('[data-testid="bottleneck-analysis"]')
    ).toBeVisible();

    // Test stage-specific filtering
    await page.locator('[data-testid="stage-filter-screening"]').click();
    await expect(
      page.locator('[data-testid="screening-detailed-metrics"]')
    ).toBeVisible();

    // Test time range analysis
    await page
      .locator('[data-testid="time-range-selector"]')
      .selectOption("last-quarter");
    await expect(
      page.locator('[data-testid="pipeline-metrics-chart"]')
    ).toBeVisible();
  });

  test("should display source performance analytics", async ({ page }) => {
    await page.goto("/analytics/sources");

    // Wait for source metrics to load
    await expect(
      page.locator('[data-testid="source-performance-page"]')
    ).toBeVisible();

    // Check source performance charts
    await expect(
      page.locator('[data-testid="source-performance-chart"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="conversion-by-source-chart"]')
    ).toBeVisible();

    // Test source comparison
    await page.locator('[data-testid="compare-sources-button"]').click();
    await page.locator('[data-testid="source-linkedin"]').check();
    await page.locator('[data-testid="source-indeed"]').check();
    await page.locator('[data-testid="compare-submit"]').click();

    await expect(
      page.locator('[data-testid="source-comparison-chart"]')
    ).toBeVisible();
  });

  test("should display diversity metrics and bias detection", async ({
    page,
  }) => {
    await page.goto("/analytics/diversity");

    // Wait for diversity metrics to load
    await expect(
      page.locator('[data-testid="diversity-metrics-page"]')
    ).toBeVisible();

    // Check diversity charts
    await expect(
      page.locator('[data-testid="diversity-metrics-chart"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="bias-detection-indicators"]')
    ).toBeVisible();

    // Test bias alert functionality
    const biasAlerts = page.locator('[data-testid="bias-alert"]');
    if ((await biasAlerts.count()) > 0) {
      await biasAlerts.first().click();
      await expect(
        page.locator('[data-testid="bias-details-modal"]')
      ).toBeVisible();
      await page.locator('[data-testid="close-bias-details"]').click();
    }

    // Test diversity report generation
    await page.locator('[data-testid="generate-diversity-report"]').click();
    await expect(
      page.locator('[data-testid="diversity-report-preview"]')
    ).toBeVisible({ timeout: 10000 });
  });
});
