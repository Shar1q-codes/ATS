import { test, expect } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";
import { TestDataSeeder } from "../../utils/test-data-seeder";

test.describe("Error Handling and Edge Cases", () => {
  let testHelpers: TestHelpers;
  let testDataSeeder: TestDataSeeder;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    testDataSeeder = new TestDataSeeder();
  });

  test.afterEach(async () => {
    await testDataSeeder.cleanup();
  });

  test("should handle network failures gracefully", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    // Simulate network failure
    await page.route("**/api/**", (route) => {
      route.abort("failed");
    });

    await page.goto("/candidates");

    // Should show error message
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Restore network and retry
    await page.unroute("**/api/**");
    await page.locator('[data-testid="retry-button"]').click();

    // Should load successfully
    await expect(page.locator('[data-testid="candidates-page"]')).toBeVisible();
  });

  test("should handle API timeout errors", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    // Simulate slow API response
    await page.route("**/api/candidates", (route) => {
      setTimeout(() => {
        route.continue();
      }, 30000); // 30 second delay
    });

    await page.goto("/candidates");

    // Should show loading state initially
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Should eventually show timeout error
    await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({
      timeout: 35000,
    });
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test("should handle authentication errors", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    // Simulate expired token
    await page.route("**/api/**", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });

    await page.goto("/candidates");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.locator('[data-testid="session-expired-message"]')
    ).toBeVisible();
  });

  test("should handle server errors (500)", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    // Simulate server error
    await page.route("**/api/candidates", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/candidates");

    // Should show server error message
    await expect(page.locator('[data-testid="server-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "server error"
    );
    await expect(page.locator('[data-testid="contact-support"]')).toBeVisible();
  });

  test("should handle file upload errors", async ({ page }) => {
    await testHelpers.loginAsRecruiter();
    await page.goto("/candidates/upload");

    // Test invalid file type
    await page
      .locator('[data-testid="resume-upload-input"]')
      .setInputFiles("e2e/fixtures/files/invalid-file.txt");

    await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "file type"
    );

    // Test file too large (simulate)
    await page.route("**/api/upload", (route) => {
      route.fulfill({
        status: 413,
        contentType: "application/json",
        body: JSON.stringify({ error: "File too large" }),
      });
    });

    await page
      .locator('[data-testid="resume-upload-input"]')
      .setInputFiles("e2e/fixtures/files/sample-resume.pdf");

    await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
  });

  test("should handle form validation errors", async ({ page }) => {
    await testHelpers.loginAsRecruiter();
    await page.goto("/candidates/new");

    // Submit empty form
    await page.locator('[data-testid="candidate-form-submit"]').click();

    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

    // Test invalid email format
    await page.locator('[data-testid="candidate-name"]').fill("Test User");
    await page.locator('[data-testid="candidate-email"]').fill("invalid-email");
    await page.locator('[data-testid="candidate-form-submit"]').click();

    await expect(
      page.locator('[data-testid="email-format-error"]')
    ).toBeVisible();

    // Test duplicate email
    await page.route("**/api/candidates", (route) => {
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "Email already exists" }),
      });
    });

    await page
      .locator('[data-testid="candidate-email"]')
      .fill("test@example.com");
    await page.locator('[data-testid="candidate-form-submit"]').click();

    await expect(
      page.locator('[data-testid="duplicate-email-error"]')
    ).toBeVisible();
  });

  test("should handle empty data states", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    // Mock empty responses
    await page.route("**/api/candidates", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });

    await page.goto("/candidates");

    // Should show empty state
    await expect(
      page.locator('[data-testid="empty-candidates"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="add-first-candidate"]')
    ).toBeVisible();

    // Test empty jobs
    await page.route("**/api/jobs", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });

    await page.goto("/jobs");
    await expect(page.locator('[data-testid="empty-jobs"]')).toBeVisible();
  });

  test("should handle concurrent user actions", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    const jobId = await testDataSeeder.createTestJob();
    const candidateId = await testDataSeeder.createTestCandidate();
    await testDataSeeder.createTestApplication(candidateId, jobId);

    await page.goto("/applications");

    // Simulate concurrent stage updates
    const candidateCard = page
      .locator('[data-testid^="candidate-card-"]')
      .first();
    const targetColumn = page.locator('[data-testid="stage-column-screening"]');

    // Start drag operation
    await candidateCard.dragTo(targetColumn);

    // Simulate another user updating the same candidate
    await page.route("**/api/applications/*/stage", (route) => {
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Candidate was updated by another user",
        }),
      });
    });

    // Should show conflict error
    await expect(page.locator('[data-testid="conflict-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="refresh-data"]')).toBeVisible();

    // Refresh should reload current state
    await page.locator('[data-testid="refresh-data"]').click();
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
  });

  test("should handle browser storage issues", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    // Simulate localStorage quota exceeded
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function (key, value) {
        throw new Error("QuotaExceededError");
      };
    });

    await page.goto("/dashboard");

    // Should show storage error
    await expect(page.locator('[data-testid="storage-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="clear-storage"]')).toBeVisible();
  });

  test("should handle malformed API responses", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    // Return malformed JSON
    await page.route("**/api/candidates", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{ invalid json",
      });
    });

    await page.goto("/candidates");

    // Should show parsing error
    await expect(
      page.locator('[data-testid="data-parsing-error"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test("should handle permission denied scenarios", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    // Simulate permission denied
    await page.route("**/api/analytics/**", (route) => {
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "Insufficient permissions" }),
      });
    });

    await page.goto("/analytics");

    // Should show permission error
    await expect(
      page.locator('[data-testid="permission-error"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="contact-admin"]')).toBeVisible();
  });

  test("should handle drag and drop failures", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    const jobId = await testDataSeeder.createTestJob();
    const candidateId = await testDataSeeder.createTestCandidate();
    await testDataSeeder.createTestApplication(candidateId, jobId);

    await page.goto("/applications");

    // Simulate drag and drop API failure
    await page.route("**/api/applications/*/stage", (route) => {
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid stage transition" }),
      });
    });

    const candidateCard = page
      .locator('[data-testid^="candidate-card-"]')
      .first();
    const targetColumn = page.locator('[data-testid="stage-column-offer"]');

    // Attempt invalid stage transition
    await candidateCard.dragTo(targetColumn);

    // Should show error and revert position
    await expect(
      page.locator('[data-testid="stage-transition-error"]')
    ).toBeVisible();

    // Card should return to original position
    const originalColumn = page.locator('[data-testid="stage-column-applied"]');
    await expect(
      originalColumn.locator('[data-testid^="candidate-card-"]')
    ).toBeVisible();
  });

  test("should handle search with no results", async ({ page }) => {
    await testHelpers.loginAsRecruiter();

    await page.route("**/api/candidates/search*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });

    await page.goto("/candidates");

    // Search for non-existent candidate
    await page
      .locator('[data-testid="candidate-search"]')
      .fill("nonexistent candidate");
    await page.locator('[data-testid="search-button"]').click();

    // Should show no results message
    await expect(
      page.locator('[data-testid="no-search-results"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="clear-search"]')).toBeVisible();

    // Clear search should restore full list
    await page.locator('[data-testid="clear-search"]').click();
    await expect(page.locator('[data-testid="candidate-search"]')).toHaveValue(
      ""
    );
  });
});
