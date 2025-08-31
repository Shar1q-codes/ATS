import { test, expect } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";
import { testApplicationStages } from "../../fixtures/test-data";

test.describe("Application Pipeline Management", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Login as recruiter before each test
    await page.goto("/login");
    await helpers.login();
  });

  test("should create new application", async ({ page }) => {
    await helpers.navigateToPage("/applications/new");

    // Select candidate
    await page.click('[data-testid="candidate-select"]');
    await page.click('[data-testid="candidate-option"]:first-child');

    // Select job variant
    await page.click('[data-testid="job-variant-select"]');
    await page.click('[data-testid="job-variant-option"]:first-child');

    // Add initial notes
    await page.fill(
      '[data-testid="initial-notes-textarea"]',
      "Initial application review notes"
    );

    // Submit application
    await page.click('[data-testid="create-application-button"]');

    // Wait for redirect to application detail
    await page.waitForURL("**/applications/*");

    // Verify application created
    await helpers.verifyToast("Application created successfully", "success");
    await expect(
      page.locator('[data-testid="application-status"]')
    ).toContainText("Applied");
    await expect(page.locator('[data-testid="fit-score"]')).toBeVisible();
  });

  test("should display Kanban board with pipeline stages", async ({ page }) => {
    await helpers.navigateToPage("/applications");

    // Wait for applications to load
    await helpers.waitForLoadingToComplete();

    // Verify Kanban board is displayed
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Verify all pipeline stages are present
    for (const stage of testApplicationStages) {
      await expect(
        page.locator(`[data-testid="stage-column-${stage}"]`)
      ).toBeVisible();
    }

    // Verify stage headers show counts
    await expect(
      page.locator('[data-testid="stage-count"]').first()
    ).toBeVisible();

    // Verify application cards are displayed
    await expect(
      page.locator('[data-testid="application-card"]').first()
    ).toBeVisible();
  });

  test("should drag and drop applications between stages", async ({ page }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Get initial application card
    const applicationCard = page
      .locator('[data-testid="application-card"]')
      .first();
    const candidateName = await applicationCard
      .locator('[data-testid="candidate-name"]')
      .textContent();

    // Drag application from "Applied" to "Shortlisted"
    await helpers.dragAndDrop(
      '[data-testid="stage-column-applied"] [data-testid="application-card"]:first-child',
      '[data-testid="stage-column-shortlisted"]'
    );

    // Wait for API call to complete
    await helpers.waitForApiResponse("/api/applications/*/status", 200);

    // Verify application moved to new stage
    const shortlistedColumn = page.locator(
      '[data-testid="stage-column-shortlisted"]'
    );
    await expect(
      shortlistedColumn.locator('[data-testid="candidate-name"]').first()
    ).toContainText(candidateName || "");

    // Verify success toast
    await helpers.verifyToast("Application status updated", "success");
  });

  test("should show stage transition confirmation for critical stages", async ({
    page,
  }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Try to drag application to "Rejected" stage
    await helpers.dragAndDrop(
      '[data-testid="stage-column-applied"] [data-testid="application-card"]:first-child',
      '[data-testid="stage-column-rejected"]'
    );

    // Verify confirmation dialog appears
    await expect(
      page.locator('[data-testid="stage-transition-dialog"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="rejection-reason-select"]')
    ).toBeVisible();

    // Select rejection reason
    await page.selectOption(
      '[data-testid="rejection-reason-select"]',
      "Not qualified"
    );
    await page.fill(
      '[data-testid="rejection-notes-textarea"]',
      "Candidate lacks required experience"
    );

    // Confirm transition
    await page.click('[data-testid="confirm-transition-button"]');

    // Verify application moved and dialog closed
    await expect(
      page.locator('[data-testid="stage-transition-dialog"]')
    ).not.toBeVisible();
    await helpers.verifyToast("Application rejected", "success");
  });

  test("should view application detail page", async ({ page }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Click on application card
    await page.click('[data-testid="application-card"]:first-child');

    // Wait for application detail page
    await page.waitForURL("**/applications/*");

    // Verify application details are displayed
    await expect(
      page.locator('[data-testid="candidate-profile"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="job-details"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="match-explanation"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="stage-history"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="application-notes"]')
    ).toBeVisible();

    // Verify action buttons
    await expect(
      page.locator('[data-testid="change-stage-button"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="add-note-button"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="send-email-button"]')
    ).toBeVisible();
  });

  test("should add and view application notes", async ({ page }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Click on application card
    await page.click('[data-testid="application-card"]:first-child');
    await page.waitForURL("**/applications/*");

    // Add new note
    await page.click('[data-testid="add-note-button"]');
    await page.fill(
      '[data-testid="note-content-textarea"]',
      "Candidate showed strong technical skills in the screening call."
    );
    await page.click('[data-testid="save-note-button"]');

    // Verify note was added
    await helpers.verifyToast("Note added successfully", "success");
    await expect(
      page.locator('[data-testid="note-item"]').first()
    ).toContainText("Candidate showed strong technical skills");

    // Verify note metadata
    await expect(
      page.locator('[data-testid="note-author"]').first()
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="note-timestamp"]').first()
    ).toBeVisible();

    // Edit note
    await page.click(
      '[data-testid="note-item"]:first-child [data-testid="edit-note-button"]'
    );
    await page.fill(
      '[data-testid="note-content-textarea"]',
      "Updated: Candidate showed exceptional technical skills."
    );
    await page.click('[data-testid="save-note-button"]');

    // Verify note was updated
    await helpers.verifyToast("Note updated successfully", "success");
    await expect(
      page.locator('[data-testid="note-item"]').first()
    ).toContainText("Updated: Candidate showed exceptional");
  });

  test("should view stage history", async ({ page }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Click on application card
    await page.click('[data-testid="application-card"]:first-child');
    await page.waitForURL("**/applications/*");

    // Verify stage history section
    await expect(page.locator('[data-testid="stage-history"]')).toBeVisible();

    // Verify history entries
    const historyEntries = page.locator('[data-testid="history-entry"]');
    await expect(historyEntries.first()).toBeVisible();

    // Verify history entry details
    await expect(
      historyEntries.first().locator('[data-testid="stage-change"]')
    ).toBeVisible();
    await expect(
      historyEntries.first().locator('[data-testid="change-timestamp"]')
    ).toBeVisible();
    await expect(
      historyEntries.first().locator('[data-testid="changed-by"]')
    ).toBeVisible();

    // Change stage to create new history entry
    await page.click('[data-testid="change-stage-button"]');
    await page.selectOption('[data-testid="new-stage-select"]', "shortlisted");
    await page.fill(
      '[data-testid="stage-change-notes"]',
      "Moving to shortlist after initial review"
    );
    await page.click('[data-testid="confirm-stage-change-button"]');

    // Verify new history entry appears
    await helpers.verifyToast("Stage updated successfully", "success");
    await expect(page.locator('[data-testid="history-entry"]')).toHaveCount(2);
  });

  test("should filter and search applications", async ({ page }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Test search by candidate name
    await page.fill('[data-testid="search-input"]', "John");
    await page.click('[data-testid="search-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify search results
    const applicationCards = page.locator('[data-testid="application-card"]');
    if ((await applicationCards.count()) > 0) {
      await expect(
        applicationCards.first().locator('[data-testid="candidate-name"]')
      ).toContainText("John");
    }

    // Clear search
    await page.fill('[data-testid="search-input"]', "");
    await page.click('[data-testid="search-button"]');

    // Test filter by job
    await page.click('[data-testid="job-filter"]');
    await page.click('[data-testid="job-option"]:first-child');
    await page.click('[data-testid="apply-filters-button"]');
    await helpers.waitForLoadingToComplete();

    // Test filter by date range
    await page.click('[data-testid="date-filter"]');
    await page.fill('[data-testid="start-date-input"]', "2024-01-01");
    await page.fill('[data-testid="end-date-input"]', "2024-12-31");
    await page.click('[data-testid="apply-date-filter-button"]');
    await helpers.waitForLoadingToComplete();

    // Clear all filters
    await page.click('[data-testid="clear-filters-button"]');
    await helpers.waitForLoadingToComplete();
  });

  test("should handle bulk stage transitions", async ({ page }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Select multiple applications
    await page.check('[data-testid="application-checkbox"]:nth-child(1)');
    await page.check('[data-testid="application-checkbox"]:nth-child(2)');

    // Verify bulk actions panel appears
    await expect(
      page.locator('[data-testid="bulk-actions-panel"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="selected-count"]')).toContainText(
      "2 selected"
    );

    // Bulk stage change
    await page.click('[data-testid="bulk-stage-change-button"]');
    await page.selectOption('[data-testid="bulk-stage-select"]', "shortlisted");
    await page.fill(
      '[data-testid="bulk-change-notes"]',
      "Bulk moved to shortlist after review"
    );
    await page.click('[data-testid="confirm-bulk-change-button"]');

    // Verify success
    await helpers.verifyToast("2 applications updated successfully", "success");

    // Verify applications moved to new stage
    const shortlistedColumn = page.locator(
      '[data-testid="stage-column-shortlisted"]'
    );
    await expect(
      shortlistedColumn.locator('[data-testid="application-card"]')
    ).toHaveCount(2);
  });

  test("should send email from application detail", async ({ page }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Click on application card
    await page.click('[data-testid="application-card"]:first-child');
    await page.waitForURL("**/applications/*");

    // Click send email button
    await page.click('[data-testid="send-email-button"]');

    // Verify email composition modal
    await expect(
      page.locator('[data-testid="email-composition-modal"]')
    ).toBeVisible();

    // Select email template
    await page.selectOption(
      '[data-testid="email-template-select"]',
      "Interview Invitation"
    );

    // Verify template content is loaded
    await expect(
      page.locator('[data-testid="email-subject-input"]')
    ).not.toBeEmpty();
    await expect(
      page.locator('[data-testid="email-body-textarea"]')
    ).not.toBeEmpty();

    // Customize email content
    await page.fill(
      '[data-testid="email-subject-input"]',
      "Interview Invitation - Software Engineer Position"
    );
    await page.fill(
      '[data-testid="email-body-textarea"]',
      "Dear Candidate,\n\nWe would like to invite you for an interview..."
    );

    // Send email
    await page.click('[data-testid="send-email-button"]');

    // Verify email sent
    await helpers.verifyToast("Email sent successfully", "success");
    await expect(
      page.locator('[data-testid="email-composition-modal"]')
    ).not.toBeVisible();

    // Verify email appears in communication history
    await expect(
      page.locator('[data-testid="communication-history"]')
    ).toContainText("Interview Invitation");
  });

  test("should handle application status validation", async ({ page }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Try to move application to invalid next stage
    // For example, from "Applied" directly to "Hired" (skipping intermediate stages)
    await helpers.dragAndDrop(
      '[data-testid="stage-column-applied"] [data-testid="application-card"]:first-child',
      '[data-testid="stage-column-hired"]'
    );

    // Verify validation error
    await helpers.verifyToast(
      "Invalid stage transition. Please follow the proper pipeline sequence.",
      "error"
    );

    // Verify application didn't move
    await expect(
      page.locator(
        '[data-testid="stage-column-applied"] [data-testid="application-card"]'
      )
    ).toHaveCount(1);
  });

  test("should persist drag-and-drop stage transitions with data integrity", async ({
    page,
  }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Get initial application data
    const applicationCard = page
      .locator('[data-testid="application-card"]')
      .first();
    const candidateName = await applicationCard
      .locator('[data-testid="candidate-name"]')
      .textContent();
    const fitScore = await applicationCard
      .locator('[data-testid="fit-score"]')
      .textContent();

    // Move application through multiple stages
    await helpers.dragAndDrop(
      '[data-testid="stage-column-applied"] [data-testid="application-card"]:first-child',
      '[data-testid="stage-column-screening"]'
    );
    await helpers.waitForApiResponse("/api/applications/*/status", 200);
    await helpers.verifyToast("Application status updated", "success");

    // Verify data persistence after first move
    const screeningCard = page
      .locator(
        '[data-testid="stage-column-screening"] [data-testid="application-card"]'
      )
      .first();
    await expect(
      screeningCard.locator('[data-testid="candidate-name"]')
    ).toContainText(candidateName || "");
    await expect(
      screeningCard.locator('[data-testid="fit-score"]')
    ).toContainText(fitScore || "");

    // Continue moving through pipeline
    await helpers.dragAndDrop(
      '[data-testid="stage-column-screening"] [data-testid="application-card"]:first-child',
      '[data-testid="stage-column-shortlisted"]'
    );
    await helpers.waitForApiResponse("/api/applications/*/status", 200);

    // Refresh page to verify persistence
    await page.reload();
    await helpers.waitForLoadingToComplete();

    // Verify application is still in correct stage after refresh
    const shortlistedCard = page
      .locator(
        '[data-testid="stage-column-shortlisted"] [data-testid="application-card"]'
      )
      .first();
    await expect(
      shortlistedCard.locator('[data-testid="candidate-name"]')
    ).toContainText(candidateName || "");
    await expect(
      shortlistedCard.locator('[data-testid="fit-score"]')
    ).toContainText(fitScore || "");
  });

  test("should handle concurrent drag-and-drop operations", async ({
    page,
  }) => {
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Verify multiple applications exist
    const appliedCards = page.locator(
      '[data-testid="stage-column-applied"] [data-testid="application-card"]'
    );
    const cardCount = await appliedCards.count();

    if (cardCount >= 2) {
      // Move two applications simultaneously to different stages
      const firstCard = appliedCards.nth(0);
      const secondCard = appliedCards.nth(1);

      const firstName = await firstCard
        .locator('[data-testid="candidate-name"]')
        .textContent();
      const secondName = await secondCard
        .locator('[data-testid="candidate-name"]')
        .textContent();

      // Perform concurrent moves
      await Promise.all([
        helpers.dragAndDrop(
          '[data-testid="stage-column-applied"] [data-testid="application-card"]:nth-child(1)',
          '[data-testid="stage-column-screening"]'
        ),
        helpers.dragAndDrop(
          '[data-testid="stage-column-applied"] [data-testid="application-card"]:nth-child(2)',
          '[data-testid="stage-column-shortlisted"]'
        ),
      ]);

      // Wait for both API calls
      await helpers.waitForApiResponse("/api/applications/*/status", 200);
      await helpers.waitForApiResponse("/api/applications/*/status", 200);

      // Verify both moves were successful
      await expect(
        page
          .locator(
            '[data-testid="stage-column-screening"] [data-testid="candidate-name"]'
          )
          .first()
      ).toContainText(firstName || "");

      await expect(
        page
          .locator(
            '[data-testid="stage-column-shortlisted"] [data-testid="candidate-name"]'
          )
          .first()
      ).toContainText(secondName || "");
    }
  });

  test("should complete end-to-end application lifecycle", async ({ page }) => {
    // Create new application
    await helpers.navigateToPage("/applications/new");
    await page.click('[data-testid="candidate-select"]');
    await page.click('[data-testid="candidate-option"]:first-child');
    await page.click('[data-testid="job-variant-select"]');
    await page.click('[data-testid="job-variant-option"]:first-child');
    await page.fill(
      '[data-testid="initial-notes-textarea"]',
      "Initial screening notes"
    );
    await page.click('[data-testid="create-application-button"]');

    // Wait for redirect and verify creation
    await page.waitForURL("**/applications/*");
    await helpers.verifyToast("Application created successfully", "success");

    // Get application ID from URL
    const url = page.url();
    const applicationId = url.split("/").pop();

    // Navigate back to pipeline
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Find the new application and move through stages
    const newApplication = page.locator(
      `[data-testid="application-${applicationId}"]`
    );

    // Move to screening
    await helpers.dragAndDrop(
      `[data-testid="application-${applicationId}"]`,
      '[data-testid="stage-column-screening"]'
    );
    await helpers.waitForApiResponse("/api/applications/*/status", 200);

    // Add screening notes
    await newApplication.click();
    await page.waitForURL("**/applications/*");
    await page.click('[data-testid="add-note-button"]');
    await page.fill(
      '[data-testid="note-content-textarea"]',
      "Passed initial screening"
    );
    await page.click('[data-testid="save-note-button"]');
    await helpers.verifyToast("Note added successfully", "success");

    // Continue through pipeline
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Move to shortlisted
    await helpers.dragAndDrop(
      `[data-testid="stage-column-screening"] [data-testid="application-${applicationId}"]`,
      '[data-testid="stage-column-shortlisted"]'
    );
    await helpers.waitForApiResponse("/api/applications/*/status", 200);

    // Send interview invitation email
    await page.locator(`[data-testid="application-${applicationId}"]`).click();
    await page.waitForURL("**/applications/*");
    await page.click('[data-testid="send-email-button"]');
    await page.selectOption(
      '[data-testid="email-template-select"]',
      "Interview Invitation"
    );
    await page.click('[data-testid="send-email-button"]');
    await helpers.verifyToast("Email sent successfully", "success");

    // Verify complete application history
    await expect(page.locator('[data-testid="stage-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="history-entry"]')).toHaveCount(3); // Applied -> Screening -> Shortlisted
    await expect(
      page.locator('[data-testid="communication-history"]')
    ).toContainText("Interview Invitation");
  });
});
