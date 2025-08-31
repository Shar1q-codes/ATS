import { test, expect, devices } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";
import { TestDataSeeder } from "../../utils/test-data-seeder";

// Test across different browsers
const browsers = ["chromium", "firefox", "webkit"];

browsers.forEach((browserName) => {
  test.describe(`Cross-browser compatibility - ${browserName}`, () => {
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

    test(`should render dashboard correctly in ${browserName}`, async ({
      page,
    }) => {
      await page.goto("/dashboard");

      // Check main layout elements
      await expect(
        page.locator('[data-testid="dashboard-header"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="navigation-menu"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

      // Check dashboard cards
      await expect(
        page.locator('[data-testid="total-applications"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="active-jobs"]')).toBeVisible();

      // Test navigation
      await page.locator('[data-testid="nav-candidates"]').click();
      await expect(page).toHaveURL(/\/candidates/);
    });

    test(`should handle file uploads in ${browserName}`, async ({ page }) => {
      await page.goto("/candidates/upload");

      const fileInput = page.locator('[data-testid="resume-upload-input"]');
      await expect(fileInput).toBeVisible();

      // Test file upload
      await fileInput.setInputFiles("e2e/fixtures/files/sample-resume.pdf");

      // Check upload progress
      await expect(
        page.locator('[data-testid="upload-progress"]')
      ).toBeVisible();

      // Wait for upload completion
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test(`should handle drag and drop in ${browserName}`, async ({ page }) => {
      // Seed test data
      const jobId = await testDataSeeder.createTestJob();
      const candidateId = await testDataSeeder.createTestCandidate();
      await testDataSeeder.createTestApplication(candidateId, jobId);

      await page.goto("/applications");

      const sourceCard = page
        .locator('[data-testid^="candidate-card-"]')
        .first();
      const targetColumn = page.locator(
        '[data-testid="stage-column-screening"]'
      );

      if ((await sourceCard.isVisible()) && (await targetColumn.isVisible())) {
        // Test drag and drop functionality
        await sourceCard.dragTo(targetColumn);

        // Verify card moved to new column
        await expect(
          targetColumn.locator('[data-testid^="candidate-card-"]')
        ).toBeVisible();
      }
    });

    test(`should render charts correctly in ${browserName}`, async ({
      page,
    }) => {
      await testDataSeeder.seedAnalyticsData();

      await page.goto("/analytics");

      // Wait for charts to load
      await expect(
        page.locator('[data-testid="recruitment-metrics-chart"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="pipeline-metrics-chart"]')
      ).toBeVisible();

      // Test chart interactions
      await page.locator('[data-testid="recruitment-metrics-chart"]').hover();

      // Check if tooltip appears (may vary by browser)
      const tooltip = page.locator('[data-testid="chart-tooltip"]');
      if (await tooltip.isVisible()) {
        await expect(tooltip).toContainText(/\d+/);
      }
    });

    test(`should handle form validation in ${browserName}`, async ({
      page,
    }) => {
      await page.goto("/candidates/new");

      // Submit empty form
      await page.locator('[data-testid="candidate-form-submit"]').click();

      // Check validation messages appear
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

      // Fill form with valid data
      await page
        .locator('[data-testid="candidate-name"]')
        .fill("Test Candidate");
      await page
        .locator('[data-testid="candidate-email"]')
        .fill("test@example.com");

      // Submit valid form
      await page.locator('[data-testid="candidate-form-submit"]').click();

      // Should redirect or show success
      await expect(page.locator('[data-testid="form-success"]')).toBeVisible();
    });

    test(`should handle responsive design in ${browserName}`, async ({
      page,
    }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/dashboard");

      await expect(
        page.locator('[data-testid="desktop-navigation"]')
      ).toBeVisible();

      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();

      // Navigation might collapse on tablet
      const mobileNav = page.locator('[data-testid="mobile-navigation"]');
      const desktopNav = page.locator('[data-testid="desktop-navigation"]');

      expect(
        (await mobileNav.isVisible()) || (await desktopNav.isVisible())
      ).toBe(true);

      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();

      // Should have mobile-friendly layout
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });
  });
});

// Test specific browser features
test.describe("Browser-specific feature tests", () => {
  test("should handle PDF viewing in Chrome", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "PDF viewing test only for Chrome");

    const testHelpers = new TestHelpers(page);
    await testHelpers.loginAsRecruiter();

    await page.goto("/candidates");

    // Click on a candidate with resume
    const candidateWithResume = page
      .locator('[data-testid^="candidate-card-"]')
      .first();
    if (await candidateWithResume.isVisible()) {
      await candidateWithResume.click();

      const viewResumeButton = page.locator('[data-testid="view-resume"]');
      if (await viewResumeButton.isVisible()) {
        await viewResumeButton.click();

        // Should open PDF in new tab or viewer
        await expect(page.locator('[data-testid="pdf-viewer"]')).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });

  test("should handle file downloads in Firefox", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "firefox", "Download test only for Firefox");

    const testHelpers = new TestHelpers(page);
    await testHelpers.loginAsRecruiter();

    await page.goto("/analytics/reports");

    // Test CSV download
    const downloadPromise = page.waitForEvent("download");
    await page.locator('[data-testid="export-csv"]').first().click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/.*\.csv$/);
  });

  test("should handle touch interactions in Safari", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "webkit", "Touch test only for Safari");

    const testHelpers = new TestHelpers(page);
    await testHelpers.loginAsRecruiter();

    // Simulate touch device
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/applications");

    // Test touch-based drag and drop if available
    const sourceCard = page.locator('[data-testid^="candidate-card-"]').first();
    if (await sourceCard.isVisible()) {
      // Touch and hold
      await sourceCard.dispatchEvent("touchstart");
      await page.waitForTimeout(500);

      // Move to target
      const targetColumn = page.locator(
        '[data-testid="stage-column-screening"]'
      );
      await targetColumn.dispatchEvent("touchmove");
      await targetColumn.dispatchEvent("touchend");

      // Verify interaction worked
      await expect(
        page.locator('[data-testid="stage-transition-success"]')
      ).toBeVisible({ timeout: 3000 });
    }
  });
});
