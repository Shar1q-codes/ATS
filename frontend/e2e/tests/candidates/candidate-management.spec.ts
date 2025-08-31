import { test, expect } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";
import { testCandidates } from "../../fixtures/test-data";

test.describe("Candidate Management", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Login as recruiter before each test
    await page.goto("/login");
    await helpers.login();
  });

  test("should upload and parse resume successfully", async ({ page }) => {
    await helpers.navigateToPage("/candidates/upload");

    // Upload resume file
    await helpers.uploadFile(
      '[data-testid="resume-upload-input"]',
      "sample-resume.pdf"
    );

    // Wait for upload to complete
    await helpers.waitForLoadingToComplete();

    // Verify upload success
    await helpers.verifyToast("Resume uploaded successfully", "success");

    // Verify parsing results are displayed
    await expect(
      page.locator('[data-testid="parsed-data-section"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="extracted-skills"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="extracted-experience"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="extracted-education"]')
    ).toBeVisible();

    // Verify candidate form is pre-filled
    const emailInput = page.locator('[data-testid="email-input"]');
    await expect(emailInput).not.toBeEmpty();
  });

  test("should create candidate profile manually", async ({ page }) => {
    await helpers.navigateToPage("/candidates/new");

    const candidate = testCandidates[0];

    // Fill candidate form
    await helpers.fillForm({
      "first-name": candidate.firstName,
      "last-name": candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      "linkedin-url": candidate.linkedinUrl,
      "portfolio-url": candidate.portfolioUrl || "",
    });

    // Add skills
    for (const skill of candidate.skills) {
      await page.fill('[data-testid="skill-input"]', skill);
      await page.click('[data-testid="add-skill-button"]');
    }

    // Add experience
    await page.fill(
      '[data-testid="experience-years"]',
      candidate.experience.toString()
    );

    // Submit form
    await page.click('[data-testid="save-candidate-button"]');

    // Wait for redirect to candidate detail page
    await page.waitForURL("**/candidates/*");

    // Verify candidate was created
    await helpers.verifyToast("Candidate created successfully", "success");
    await expect(page.locator('[data-testid="candidate-name"]')).toContainText(
      `${candidate.firstName} ${candidate.lastName}`
    );
    await expect(page.locator('[data-testid="candidate-email"]')).toContainText(
      candidate.email
    );
  });

  test("should search and filter candidates", async ({ page }) => {
    await helpers.navigateToPage("/candidates");

    // Wait for candidates to load
    await helpers.waitForLoadingToComplete();

    // Test search functionality
    await page.fill('[data-testid="search-input"]', "John");
    await page.click('[data-testid="search-button"]');

    // Wait for search results
    await helpers.waitForLoadingToComplete();

    // Verify search results
    const candidateRows = page.locator('[data-testid="candidate-row"]');
    await expect(candidateRows.first()).toContainText("John");

    // Test skill filter
    await page.click('[data-testid="skills-filter"]');
    await page.click('[data-testid="skill-option-javascript"]');
    await page.click('[data-testid="apply-filters-button"]');

    // Wait for filtered results
    await helpers.waitForLoadingToComplete();

    // Verify filtered results
    await expect(
      page.locator('[data-testid="filter-results-count"]')
    ).toBeVisible();

    // Test location filter
    await page.click('[data-testid="location-filter"]');
    await page.selectOption(
      '[data-testid="location-select"]',
      "San Francisco, CA"
    );
    await page.click('[data-testid="apply-filters-button"]');

    // Wait for filtered results
    await helpers.waitForLoadingToComplete();

    // Clear filters
    await page.click('[data-testid="clear-filters-button"]');
    await helpers.waitForLoadingToComplete();
  });

  test("should view candidate detail page", async ({ page }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Click on first candidate
    await page.click(
      '[data-testid="candidate-row"]:first-child [data-testid="view-candidate-button"]'
    );

    // Wait for candidate detail page
    await page.waitForURL("**/candidates/*");

    // Verify candidate details are displayed
    await expect(
      page.locator('[data-testid="candidate-profile"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="candidate-skills"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="candidate-experience"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="application-history"]')
    ).toBeVisible();

    // Verify action buttons are present
    await expect(
      page.locator('[data-testid="edit-candidate-button"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="create-application-button"]')
    ).toBeVisible();
  });

  test("should edit candidate profile", async ({ page }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Click on first candidate
    await page.click(
      '[data-testid="candidate-row"]:first-child [data-testid="view-candidate-button"]'
    );
    await page.waitForURL("**/candidates/*");

    // Click edit button
    await page.click('[data-testid="edit-candidate-button"]');

    // Update candidate information
    await page.fill('[data-testid="phone-input"]', "+1-555-9999");
    await page.fill('[data-testid="location-input"]', "Updated Location");

    // Add new skill
    await page.fill('[data-testid="skill-input"]', "New Skill");
    await page.click('[data-testid="add-skill-button"]');

    // Save changes
    await page.click('[data-testid="save-changes-button"]');

    // Verify changes were saved
    await helpers.verifyToast("Candidate updated successfully", "success");
    await expect(page.locator('[data-testid="candidate-phone"]')).toContainText(
      "+1-555-9999"
    );
    await expect(
      page.locator('[data-testid="candidate-location"]')
    ).toContainText("Updated Location");
  });

  test("should handle bulk operations", async ({ page }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Select multiple candidates
    await page.check('[data-testid="candidate-checkbox"]:nth-child(1)');
    await page.check('[data-testid="candidate-checkbox"]:nth-child(2)');
    await page.check('[data-testid="candidate-checkbox"]:nth-child(3)');

    // Verify bulk actions are enabled
    await expect(
      page.locator('[data-testid="bulk-actions-panel"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="selected-count"]')).toContainText(
      "3 selected"
    );

    // Test bulk tag assignment
    await page.click('[data-testid="bulk-tag-button"]');
    await page.fill('[data-testid="tag-input"]', "High Priority");
    await page.click('[data-testid="apply-tag-button"]');

    // Verify success message
    await helpers.verifyToast("Tags applied to 3 candidates", "success");

    // Test bulk export
    await page.click('[data-testid="bulk-export-button"]');
    await page.click('[data-testid="export-csv-button"]');

    // Verify download started
    await helpers.verifyToast("Export started", "success");
  });

  test("should validate resume upload", async ({ page }) => {
    await helpers.navigateToPage("/candidates/upload");

    // Try to upload invalid file type
    await helpers.uploadFile(
      '[data-testid="resume-upload-input"]',
      "invalid-file.txt"
    );

    // Verify error message
    await helpers.verifyToast(
      "Invalid file type. Please upload PDF, DOCX, or image files.",
      "error"
    );

    // Test file size limit (if applicable)
    // This would require a large test file
    // await helpers.uploadFile('[data-testid="resume-upload-input"]', 'large-file.pdf');
    // await helpers.verifyToast('File size too large. Maximum size is 10MB.', 'error');
  });

  test("should handle parsing errors gracefully", async ({ page }) => {
    await helpers.navigateToPage("/candidates/upload");

    // Mock API to return parsing error
    await helpers.mockApiResponse(
      "**/api/candidates/parse-resume",
      {
        error: "Failed to parse resume",
      },
      500
    );

    // Upload file
    await helpers.uploadFile(
      '[data-testid="resume-upload-input"]',
      "sample-resume.pdf"
    );

    // Wait for error
    await helpers.verifyToast(
      "Failed to parse resume. Please try again or enter information manually.",
      "error"
    );

    // Verify manual entry option is available
    await expect(
      page.locator('[data-testid="manual-entry-button"]')
    ).toBeVisible();
  });

  test("should show candidate match scores", async ({ page }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Click on candidate with applications
    await page.click(
      '[data-testid="candidate-row"]:first-child [data-testid="view-candidate-button"]'
    );
    await page.waitForURL("**/candidates/*");

    // Verify match scores section
    await expect(
      page.locator('[data-testid="match-scores-section"]')
    ).toBeVisible();

    // Check if match scores are displayed for applications
    const matchScores = page.locator('[data-testid="match-score"]');
    if ((await matchScores.count()) > 0) {
      await expect(matchScores.first()).toBeVisible();
      await expect(matchScores.first()).toContainText(/\d+%/); // Should contain percentage
    }
  });

  test("should complete end-to-end resume upload and candidate creation workflow", async ({
    page,
  }) => {
    // Start with resume upload
    await helpers.navigateToPage("/candidates/upload");

    // Test drag and drop upload
    await helpers.uploadFile(
      '[data-testid="resume-upload-input"]',
      "sample-resume.pdf"
    );

    // Wait for upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await helpers.waitForLoadingToComplete();

    // Verify parsing results
    await helpers.verifyToast(
      "Resume uploaded and parsed successfully",
      "success"
    );
    await expect(
      page.locator('[data-testid="parsed-data-section"]')
    ).toBeVisible();

    // Verify extracted information
    await expect(
      page.locator('[data-testid="extracted-name"]')
    ).not.toBeEmpty();
    await expect(
      page.locator('[data-testid="extracted-email"]')
    ).not.toBeEmpty();
    await expect(
      page.locator('[data-testid="extracted-skills"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="extracted-experience"]')
    ).toBeVisible();

    // Review and edit parsed data
    await page.click('[data-testid="edit-parsed-data-button"]');
    await page.fill('[data-testid="phone-input"]', "+1-555-1234");
    await page.fill('[data-testid="location-input"]', "San Francisco, CA");

    // Add additional skills
    await page.fill('[data-testid="additional-skill-input"]', "Docker");
    await page.click('[data-testid="add-skill-button"]');

    // Create candidate profile
    await page.click('[data-testid="create-candidate-button"]');

    // Wait for redirect to candidate detail
    await page.waitForURL("**/candidates/*");

    // Verify candidate was created successfully
    await helpers.verifyToast(
      "Candidate profile created successfully",
      "success"
    );
    await expect(
      page.locator('[data-testid="candidate-profile"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="resume-link"]')).toBeVisible();
  });

  test("should handle multiple file format uploads", async ({ page }) => {
    await helpers.navigateToPage("/candidates/upload");

    // Test PDF upload
    await helpers.uploadFile(
      '[data-testid="resume-upload-input"]',
      "sample-resume.pdf"
    );
    await helpers.waitForLoadingToComplete();
    await helpers.verifyToast(
      "Resume uploaded and parsed successfully",
      "success"
    );

    // Clear and test DOCX upload
    await page.click('[data-testid="clear-upload-button"]');
    await helpers.uploadFile(
      '[data-testid="resume-upload-input"]',
      "sample-resume.docx"
    );
    await helpers.waitForLoadingToComplete();
    await helpers.verifyToast(
      "Resume uploaded and parsed successfully",
      "success"
    );

    // Test image upload (scanned resume)
    await page.click('[data-testid="clear-upload-button"]');
    await helpers.uploadFile(
      '[data-testid="resume-upload-input"]',
      "scanned-resume.jpg"
    );
    await helpers.waitForLoadingToComplete();
    await helpers.verifyToast(
      "Resume uploaded and parsed successfully",
      "success"
    );
  });

  test("should validate candidate data and handle duplicates", async ({
    page,
  }) => {
    await helpers.navigateToPage("/candidates/new");

    // Try to create candidate with existing email
    await helpers.fillForm({
      "first-name": "John",
      "last-name": "Doe",
      email: "john.doe@example.com", // Assuming this already exists
      phone: "+1-555-0101",
    });

    await page.click('[data-testid="save-candidate-button"]');

    // Verify duplicate email validation
    await helpers.verifyToast(
      "Candidate with this email already exists",
      "error"
    );

    // Verify duplicate handling options
    await expect(
      page.locator('[data-testid="duplicate-options"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="view-existing-button"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="update-existing-button"]')
    ).toBeVisible();

    // Test viewing existing candidate
    await page.click('[data-testid="view-existing-button"]');
    await page.waitForURL("**/candidates/*");
    await expect(page.locator('[data-testid="candidate-email"]')).toContainText(
      "john.doe@example.com"
    );
  });
});
