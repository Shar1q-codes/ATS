import { test, expect } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";

test.describe("Complete User Journey Integration Tests", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test("should complete full recruiter workflow from login to hire", async ({
    page,
  }) => {
    // Step 1: Authentication
    await page.goto("/login");
    await helpers.login();
    await expect(
      page.locator('[data-testid="dashboard-header"]')
    ).toBeVisible();

    // Step 2: Create Job Family and Template
    await helpers.navigateToPage("/jobs");
    await page.click('[data-testid="job-families-tab"]');
    await page.click('[data-testid="create-job-family-button"]');

    await helpers.fillForm({
      name: "Full Stack Developer",
      description: "Full stack web development roles",
    });

    // Add requirements
    await page.click('[data-testid="add-requirement-button"]');
    await page.selectOption('[data-testid="requirement-type-select"]', "skill");
    await page.selectOption(
      '[data-testid="requirement-category-select"]',
      "must"
    );
    await page.fill(
      '[data-testid="requirement-description-input"]',
      "JavaScript proficiency"
    );
    await page.fill('[data-testid="requirement-weight-input"]', "9");
    await page.click('[data-testid="save-requirement-button"]');

    await page.click('[data-testid="save-job-family-button"]');
    await helpers.verifyToast("Job family created successfully", "success");

    // Create Job Template
    await page.click('[data-testid="job-templates-tab"]');
    await page.click('[data-testid="create-job-template-button"]');
    await page.selectOption(
      '[data-testid="job-family-select"]',
      "Full Stack Developer"
    );

    await helpers.fillForm({
      name: "Senior Full Stack Developer",
      level: "senior",
      "min-experience": "5",
      "max-experience": "10",
    });

    await page.click('[data-testid="save-job-template-button"]');
    await helpers.verifyToast("Job template created successfully", "success");

    // Step 3: Create Company Profile
    await page.click('[data-testid="company-profiles-tab"]');
    await page.click('[data-testid="create-company-profile-button"]');

    await helpers.fillForm({
      name: "InnovateTech Solutions",
      industry: "Technology",
      location: "Austin, TX",
    });

    await page.selectOption('[data-testid="company-size-select"]', "medium");
    await page.selectOption(
      '[data-testid="work-arrangement-select"]',
      "hybrid"
    );
    await page.click('[data-testid="save-company-profile-button"]');
    await helpers.verifyToast(
      "Company profile created successfully",
      "success"
    );

    // Step 4: Create and Publish Job Variant
    await page.click('[data-testid="job-variants-tab"]');
    await page.click('[data-testid="create-job-variant-button"]');
    await page.selectOption(
      '[data-testid="job-template-select"]',
      "Senior Full Stack Developer"
    );
    await page.selectOption(
      '[data-testid="company-profile-select"]',
      "InnovateTech Solutions"
    );

    await page.fill(
      '[data-testid="custom-title-input"]',
      "Senior Full Stack Developer - React/Node"
    );
    await page.click('[data-testid="save-job-variant-button"]');
    await helpers.verifyToast("Job variant created successfully", "success");

    await page.click('[data-testid="publish-job-button"]');
    await page.click('[data-testid="confirm-publish-button"]');
    await helpers.verifyToast("Job variant published successfully", "success");

    // Step 5: Upload and Parse Resume
    await helpers.navigateToPage("/candidates/upload");
    await helpers.uploadFile(
      '[data-testid="resume-upload-input"]',
      "sample-resume.pdf"
    );
    await helpers.waitForLoadingToComplete();
    await helpers.verifyToast(
      "Resume uploaded and parsed successfully",
      "success"
    );

    // Review parsed data and create candidate
    await expect(
      page.locator('[data-testid="parsed-data-section"]')
    ).toBeVisible();
    await page.fill('[data-testid="phone-input"]', "+1-555-0123");
    await page.fill('[data-testid="location-input"]', "Austin, TX");
    await page.click('[data-testid="create-candidate-button"]');

    await page.waitForURL("**/candidates/*");
    await helpers.verifyToast(
      "Candidate profile created successfully",
      "success"
    );

    // Get candidate ID from URL for later use
    const candidateUrl = page.url();
    const candidateId = candidateUrl.split("/").pop();

    // Step 6: Create Application
    await page.click('[data-testid="create-application-button"]');
    await page.selectOption(
      '[data-testid="job-variant-select"]',
      "Senior Full Stack Developer - React/Node"
    );
    await page.fill(
      '[data-testid="initial-notes-textarea"]',
      "Strong candidate with relevant experience"
    );
    await page.click('[data-testid="create-application-button"]');

    await page.waitForURL("**/applications/*");
    await helpers.verifyToast("Application created successfully", "success");

    // Verify AI matching results
    await expect(page.locator('[data-testid="fit-score"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="match-explanation"]')
    ).toBeVisible();

    // Get application ID from URL
    const applicationUrl = page.url();
    const applicationId = applicationUrl.split("/").pop();

    // Step 7: Move Through Pipeline Stages
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Move to screening
    await helpers.dragAndDrop(
      `[data-testid="application-${applicationId}"]`,
      '[data-testid="stage-column-screening"]'
    );
    await helpers.waitForApiResponse("/api/applications/*/status", 200);
    await helpers.verifyToast("Application status updated", "success");

    // Add screening notes
    await page.locator(`[data-testid="application-${applicationId}"]`).click();
    await page.waitForURL("**/applications/*");
    await page.click('[data-testid="add-note-button"]');
    await page.fill(
      '[data-testid="note-content-textarea"]',
      "Passed initial phone screening. Good technical knowledge."
    );
    await page.click('[data-testid="save-note-button"]');
    await helpers.verifyToast("Note added successfully", "success");

    // Step 8: Send Email Communication
    await page.click('[data-testid="send-email-button"]');
    await page.selectOption(
      '[data-testid="email-template-select"]',
      "Interview Invitation"
    );
    await page.fill(
      '[data-testid="email-subject-input"]',
      "Interview Invitation - Senior Full Stack Developer"
    );
    await page.click('[data-testid="send-email-button"]');
    await helpers.verifyToast("Email sent successfully", "success");

    // Step 9: Continue Pipeline Movement
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Move to shortlisted
    await helpers.dragAndDrop(
      `[data-testid="stage-column-screening"] [data-testid="application-${applicationId}"]`,
      '[data-testid="stage-column-shortlisted"]'
    );
    await helpers.waitForApiResponse("/api/applications/*/status", 200);

    // Move to interview scheduled
    await helpers.dragAndDrop(
      `[data-testid="stage-column-shortlisted"] [data-testid="application-${applicationId}"]`,
      '[data-testid="stage-column-interview_scheduled"]'
    );
    await helpers.waitForApiResponse("/api/applications/*/status", 200);

    // Move to interview completed
    await helpers.dragAndDrop(
      `[data-testid="stage-column-interview_scheduled"] [data-testid="application-${applicationId}"]`,
      '[data-testid="stage-column-interview_completed"]'
    );
    await helpers.waitForApiResponse("/api/applications/*/status", 200);

    // Step 10: Final Hiring Decision
    await helpers.dragAndDrop(
      `[data-testid="stage-column-interview_completed"] [data-testid="application-${applicationId}"]`,
      '[data-testid="stage-column-offer_extended"]'
    );
    await helpers.waitForApiResponse("/api/applications/*/status", 200);

    // Add offer notes
    await page.locator(`[data-testid="application-${applicationId}"]`).click();
    await page.waitForURL("**/applications/*");
    await page.click('[data-testid="add-note-button"]');
    await page.fill(
      '[data-testid="note-content-textarea"]',
      "Offer extended: $120k base salary, equity package included"
    );
    await page.click('[data-testid="save-note-button"]');
    await helpers.verifyToast("Note added successfully", "success");

    // Move to hired
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();
    await helpers.dragAndDrop(
      `[data-testid="stage-column-offer_extended"] [data-testid="application-${applicationId}"]`,
      '[data-testid="stage-column-hired"]'
    );
    await helpers.waitForApiResponse("/api/applications/*/status", 200);
    await helpers.verifyToast("Application status updated", "success");

    // Step 11: Verify Complete Workflow
    await page.locator(`[data-testid="application-${applicationId}"]`).click();
    await page.waitForURL("**/applications/*");

    // Verify final status
    await expect(
      page.locator('[data-testid="application-status"]')
    ).toContainText("Hired");

    // Verify complete stage history
    await expect(page.locator('[data-testid="stage-history"]')).toBeVisible();
    const historyEntries = page.locator('[data-testid="history-entry"]');
    await expect(historyEntries).toHaveCount(7); // All stage transitions

    // Verify communication history
    await expect(
      page.locator('[data-testid="communication-history"]')
    ).toContainText("Interview Invitation");

    // Verify notes are preserved
    await expect(
      page.locator('[data-testid="application-notes"]')
    ).toContainText("Strong candidate with relevant experience");
    await expect(
      page.locator('[data-testid="application-notes"]')
    ).toContainText("Passed initial phone screening");
    await expect(
      page.locator('[data-testid="application-notes"]')
    ).toContainText("Offer extended: $120k base salary");

    // Step 12: Check Analytics Impact
    await helpers.navigateToPage("/analytics");
    await helpers.waitForLoadingToComplete();

    // Verify metrics are updated
    await expect(
      page.locator('[data-testid="total-applications"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="hired-count"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="pipeline-metrics"]')
    ).toBeVisible();

    // Check pipeline performance
    await helpers.navigateToPage("/analytics/pipeline");
    await helpers.waitForLoadingToComplete();
    await expect(page.locator('[data-testid="pipeline-chart"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="time-to-fill-metric"]')
    ).toBeVisible();
  });

  test("should handle error scenarios gracefully throughout the workflow", async ({
    page,
  }) => {
    // Login
    await page.goto("/login");
    await helpers.login();

    // Test job creation with network error
    await helpers.navigateToPage("/jobs");
    await page.click('[data-testid="job-families-tab"]');
    await page.click('[data-testid="create-job-family-button"]');

    // Mock network error
    await helpers.mockApiResponse(
      "**/api/jobs/families",
      { error: "Network error" },
      500
    );

    await helpers.fillForm({
      name: "Test Job Family",
      description: "Test description",
    });
    await page.click('[data-testid="save-job-family-button"]');

    // Verify error handling
    await helpers.verifyToast(
      "Failed to create job family. Please try again.",
      "error"
    );

    // Test resume upload with parsing error
    await helpers.navigateToPage("/candidates/upload");
    await helpers.mockApiResponse(
      "**/api/candidates/parse-resume",
      { error: "Parsing failed" },
      500
    );

    await helpers.uploadFile(
      '[data-testid="resume-upload-input"]',
      "sample-resume.pdf"
    );
    await helpers.verifyToast(
      "Failed to parse resume. Please try again or enter information manually.",
      "error"
    );

    // Verify manual entry option is available
    await expect(
      page.locator('[data-testid="manual-entry-button"]')
    ).toBeVisible();

    // Test application creation with validation error
    await helpers.navigateToPage("/applications/new");
    await page.click('[data-testid="create-application-button"]'); // Submit without required fields

    // Verify validation errors
    await expect(page.locator('[data-testid="candidate-error"]')).toContainText(
      "Candidate is required"
    );
    await expect(
      page.locator('[data-testid="job-variant-error"]')
    ).toContainText("Job variant is required");

    // Test email sending failure
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();
    await page.click(
      '[data-testid="candidate-row"]:first-child [data-testid="view-candidate-button"]'
    );
    await page.waitForURL("**/candidates/*");

    await helpers.mockApiResponse(
      "**/api/communication/send-email",
      { error: "Email service unavailable" },
      500
    );

    await page.click('[data-testid="send-email-button"]');
    await page.selectOption(
      '[data-testid="email-template-select"]',
      "Application Received"
    );
    await page.click('[data-testid="send-email-button"]');

    await helpers.verifyToast(
      "Failed to send email. Please try again later.",
      "error"
    );
  });

  test("should maintain data consistency across browser refresh and navigation", async ({
    page,
  }) => {
    // Login and create some data
    await page.goto("/login");
    await helpers.login();

    // Create candidate
    await helpers.navigateToPage("/candidates/new");
    await helpers.fillForm({
      "first-name": "Test",
      "last-name": "Candidate",
      email: "test.candidate@example.com",
      phone: "+1-555-9999",
    });
    await page.click('[data-testid="save-candidate-button"]');
    await page.waitForURL("**/candidates/*");

    const candidateUrl = page.url();
    const candidateId = candidateUrl.split("/").pop();

    // Refresh page and verify data persistence
    await page.reload();
    await helpers.waitForLoadingToComplete();

    await expect(page.locator('[data-testid="candidate-name"]')).toContainText(
      "Test Candidate"
    );
    await expect(page.locator('[data-testid="candidate-email"]')).toContainText(
      "test.candidate@example.com"
    );

    // Navigate away and back
    await helpers.navigateToPage("/dashboard");
    await helpers.navigateToPage(`/candidates/${candidateId}`);

    // Verify data is still there
    await expect(page.locator('[data-testid="candidate-name"]')).toContainText(
      "Test Candidate"
    );
    await expect(page.locator('[data-testid="candidate-email"]')).toContainText(
      "test.candidate@example.com"
    );

    // Test with application pipeline
    await helpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();

    // Get initial application count
    const initialAppliedCount = await page
      .locator(
        '[data-testid="stage-column-applied"] [data-testid="application-card"]'
      )
      .count();

    // Refresh and verify count is maintained
    await page.reload();
    await helpers.waitForLoadingToComplete();

    const refreshedAppliedCount = await page
      .locator(
        '[data-testid="stage-column-applied"] [data-testid="application-card"]'
      )
      .count();
    expect(refreshedAppliedCount).toBe(initialAppliedCount);
  });

  test("should handle concurrent user actions and real-time updates", async ({
    page,
    context,
  }) => {
    // Login with first user
    await page.goto("/login");
    await helpers.login();

    // Open second tab/page for concurrent actions
    const secondPage = await context.newPage();
    const secondHelpers = new TestHelpers(secondPage);
    await secondPage.goto("/login");
    await secondHelpers.login();

    // Both users navigate to applications
    await helpers.navigateToPage("/applications");
    await secondHelpers.navigateToPage("/applications");
    await helpers.waitForLoadingToComplete();
    await secondHelpers.waitForLoadingToComplete();

    // First user moves an application
    const applicationCards = page.locator('[data-testid="application-card"]');
    if ((await applicationCards.count()) > 0) {
      const firstCard = applicationCards.first();
      const candidateName = await firstCard
        .locator('[data-testid="candidate-name"]')
        .textContent();

      await helpers.dragAndDrop(
        '[data-testid="stage-column-applied"] [data-testid="application-card"]:first-child',
        '[data-testid="stage-column-screening"]'
      );
      await helpers.waitForApiResponse("/api/applications/*/status", 200);

      // Second user should see the update (if real-time updates are implemented)
      // This would require WebSocket or polling implementation
      await secondPage.waitForTimeout(2000); // Wait for potential real-time update
      await secondPage.reload(); // Manual refresh to see changes
      await secondHelpers.waitForLoadingToComplete();

      // Verify the application moved in second user's view
      const screeningCards = secondPage.locator(
        '[data-testid="stage-column-screening"] [data-testid="application-card"]'
      );
      if ((await screeningCards.count()) > 0) {
        const movedCard = screeningCards.first();
        const movedCandidateName = await movedCard
          .locator('[data-testid="candidate-name"]')
          .textContent();
        expect(movedCandidateName).toBe(candidateName);
      }
    }

    await secondPage.close();
  });
});
