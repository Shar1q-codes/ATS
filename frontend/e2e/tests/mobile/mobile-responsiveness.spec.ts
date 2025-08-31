import { test, expect, devices } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";
import { TestDataSeeder } from "../../utils/test-data-seeder";

// Test different mobile devices
const mobileDevices = [
  { name: "iPhone 12", device: devices["iPhone 12"] },
  { name: "Pixel 5", device: devices["Pixel 5"] },
  { name: "iPad", device: devices["iPad Pro"] },
];

mobileDevices.forEach(({ name, device }) => {
  test.describe(`Mobile Responsiveness - ${name}`, () => {
    let testHelpers: TestHelpers;
    let testDataSeeder: TestDataSeeder;

    test.use({ ...device });

    test.beforeEach(async ({ page }) => {
      testHelpers = new TestHelpers(page);
      testDataSeeder = new TestDataSeeder();
      await testHelpers.loginAsRecruiter();
    });

    test.afterEach(async () => {
      await testDataSeeder.cleanup();
    });

    test(`should display mobile-friendly navigation on ${name}`, async ({
      page,
    }) => {
      await page.goto("/dashboard");

      // Check if mobile navigation is present
      const mobileMenuButton = page.locator(
        '[data-testid="mobile-menu-button"]'
      );
      const desktopNav = page.locator('[data-testid="desktop-navigation"]');

      // Either mobile menu or desktop nav should be visible
      expect(
        (await mobileMenuButton.isVisible()) || (await desktopNav.isVisible())
      ).toBe(true);

      if (await mobileMenuButton.isVisible()) {
        // Test mobile menu functionality
        await mobileMenuButton.click();
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

        // Test navigation links
        await page.locator('[data-testid="mobile-nav-candidates"]').click();
        await expect(page).toHaveURL(/\/candidates/);

        // Menu should close after navigation
        await expect(
          page.locator('[data-testid="mobile-menu"]')
        ).not.toBeVisible();
      }
    });

    test(`should handle touch interactions on ${name}`, async ({ page }) => {
      await page.goto("/candidates");

      // Test touch scrolling
      await page.touchscreen.tap(200, 300);
      await page.mouse.wheel(0, 500);

      // Test touch on candidate cards
      const candidateCard = page
        .locator('[data-testid^="candidate-card-"]')
        .first();
      if (await candidateCard.isVisible()) {
        await candidateCard.tap();

        // Should open candidate detail
        await expect(
          page.locator('[data-testid="candidate-detail"]')
        ).toBeVisible();
      }
    });

    test(`should display forms properly on ${name}`, async ({ page }) => {
      await page.goto("/candidates/new");

      // Check form elements are properly sized
      const nameInput = page.locator('[data-testid="candidate-name"]');
      const emailInput = page.locator('[data-testid="candidate-email"]');

      await expect(nameInput).toBeVisible();
      await expect(emailInput).toBeVisible();

      // Test form input on mobile
      await nameInput.tap();
      await nameInput.fill("Mobile Test User");

      await emailInput.tap();
      await emailInput.fill("mobile@test.com");

      // Test file upload on mobile
      const fileUpload = page.locator('[data-testid="resume-upload"]');
      await expect(fileUpload).toBeVisible();

      // Submit button should be accessible
      const submitButton = page.locator(
        '[data-testid="candidate-form-submit"]'
      );
      await expect(submitButton).toBeVisible();

      // Button should be large enough for touch
      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThan(40); // Minimum touch target size
    });

    test(`should handle Kanban board on ${name}`, async ({ page }) => {
      // Seed test data
      const jobId = await testDataSeeder.createTestJob();
      const candidateId = await testDataSeeder.createTestCandidate();
      await testDataSeeder.createTestApplication(candidateId, jobId);

      await page.goto("/applications");

      // Check if Kanban board adapts to mobile
      const kanbanBoard = page.locator('[data-testid="kanban-board"]');
      await expect(kanbanBoard).toBeVisible();

      // On mobile, columns might stack or scroll horizontally
      const stageColumns = page.locator('[data-testid^="stage-column-"]');
      const columnCount = await stageColumns.count();
      expect(columnCount).toBeGreaterThan(0);

      // Test horizontal scrolling if columns are side by side
      if (columnCount > 2) {
        await page.mouse.wheel(100, 0); // Horizontal scroll
      }

      // Test candidate card interaction
      const candidateCard = page
        .locator('[data-testid^="candidate-card-"]')
        .first();
      if (await candidateCard.isVisible()) {
        await candidateCard.tap();

        // Should show candidate details or context menu
        const candidateDetail = page.locator(
          '[data-testid="candidate-detail-modal"]'
        );
        const contextMenu = page.locator(
          '[data-testid="candidate-context-menu"]'
        );

        expect(
          (await candidateDetail.isVisible()) || (await contextMenu.isVisible())
        ).toBe(true);
      }
    });

    test(`should display analytics charts on ${name}`, async ({ page }) => {
      await testDataSeeder.seedAnalyticsData();

      await page.goto("/analytics");

      // Charts should be responsive
      await expect(
        page.locator('[data-testid="analytics-dashboard"]')
      ).toBeVisible();

      const metricsChart = page.locator(
        '[data-testid="recruitment-metrics-chart"]'
      );
      await expect(metricsChart).toBeVisible();

      // Chart should fit within viewport
      const chartBox = await metricsChart.boundingBox();
      const viewport = page.viewportSize();

      if (chartBox && viewport) {
        expect(chartBox.width).toBeLessThanOrEqual(viewport.width);
      }

      // Test chart interaction on mobile
      await metricsChart.tap();

      // Should show mobile-friendly tooltip or details
      const tooltip = page.locator('[data-testid="chart-tooltip"]');
      const chartDetails = page.locator('[data-testid="chart-details"]');

      // Some form of interaction feedback should be visible
      expect(
        (await tooltip.isVisible()) || (await chartDetails.isVisible())
      ).toBe(true);
    });

    test(`should handle table data on ${name}`, async ({ page }) => {
      await page.goto("/candidates");

      // Tables should be responsive
      const candidateTable = page.locator('[data-testid="candidates-table"]');
      if (await candidateTable.isVisible()) {
        // Table should either scroll horizontally or stack columns
        const tableBox = await candidateTable.boundingBox();
        const viewport = page.viewportSize();

        if (tableBox && viewport) {
          // Table should not overflow viewport without scrolling
          expect(tableBox.width).toBeLessThanOrEqual(viewport.width + 50); // Allow small overflow for scrollbars
        }

        // Test horizontal scrolling if needed
        await page.mouse.wheel(100, 0);

        // Should still be able to interact with table rows
        const firstRow = page
          .locator('[data-testid^="candidate-row-"]')
          .first();
        if (await firstRow.isVisible()) {
          await firstRow.tap();
        }
      }
    });

    test(`should handle modals and dialogs on ${name}`, async ({ page }) => {
      await page.goto("/candidates");

      const candidateCard = page
        .locator('[data-testid^="candidate-card-"]')
        .first();
      if (await candidateCard.isVisible()) {
        await candidateCard.tap();

        const modal = page.locator('[data-testid="candidate-detail-modal"]');
        await expect(modal).toBeVisible();

        // Modal should fit within viewport
        const modalBox = await modal.boundingBox();
        const viewport = page.viewportSize();

        if (modalBox && viewport) {
          expect(modalBox.width).toBeLessThanOrEqual(viewport.width);
          expect(modalBox.height).toBeLessThanOrEqual(viewport.height);
        }

        // Should be able to close modal
        const closeButton = page.locator('[data-testid="close-modal"]');
        if (await closeButton.isVisible()) {
          await closeButton.tap();
          await expect(modal).not.toBeVisible();
        } else {
          // Try closing with backdrop tap
          await page.tap(50, 50); // Tap outside modal
          await expect(modal).not.toBeVisible();
        }
      }
    });

    test(`should handle search and filters on ${name}`, async ({ page }) => {
      await page.goto("/candidates");

      // Search should be accessible
      const searchInput = page.locator('[data-testid="candidate-search"]');
      await expect(searchInput).toBeVisible();

      await searchInput.tap();
      await searchInput.fill("test search");

      // Filters should be mobile-friendly
      const filtersButton = page.locator('[data-testid="filters-button"]');
      if (await filtersButton.isVisible()) {
        await filtersButton.tap();

        const filtersPanel = page.locator('[data-testid="filters-panel"]');
        await expect(filtersPanel).toBeVisible();

        // Filter options should be touch-friendly
        const skillFilter = page.locator('[data-testid="skill-filter"]');
        if (await skillFilter.isVisible()) {
          await skillFilter.tap();

          // Should show filter options
          await expect(
            page.locator('[data-testid="skill-filter-options"]')
          ).toBeVisible();
        }
      }
    });

    test(`should maintain performance on ${name}`, async ({ page }) => {
      // Test page load performance
      const startTime = Date.now();
      await page.goto("/dashboard");

      await expect(
        page.locator('[data-testid="dashboard-header"]')
      ).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time on mobile
      expect(loadTime).toBeLessThan(5000);

      // Test navigation performance
      const navStartTime = Date.now();
      await page.locator('[data-testid="nav-candidates"]').tap();

      await expect(
        page.locator('[data-testid="candidates-page"]')
      ).toBeVisible();
      const navTime = Date.now() - navStartTime;

      expect(navTime).toBeLessThan(3000);
    });
  });
});

// Test landscape vs portrait orientations
test.describe("Mobile Orientation Tests", () => {
  test("should handle orientation changes", async ({ page }) => {
    const testHelpers = new TestHelpers(page);
    await testHelpers.loginAsRecruiter();

    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/applications");

    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.reload();

    // Layout should adapt
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // More columns might be visible in landscape
    const stageColumns = page.locator('[data-testid^="stage-column-"]');
    const columnCount = await stageColumns.count();
    expect(columnCount).toBeGreaterThan(0);
  });
});
