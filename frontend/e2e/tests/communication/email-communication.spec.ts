import { test, expect } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";
import { testEmailTemplates } from "../../fixtures/test-data";

test.describe("Email Communication Workflows", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Login as recruiter before each test
    await page.goto("/login");
    await helpers.login();
  });

  test("should create email template successfully", async ({ page }) => {
    await helpers.navigateToPage("/communication/templates");

    // Click create new template
    await page.click('[data-testid="create-template-button"]');

    const template = testEmailTemplates[0];

    // Fill template form
    await helpers.fillForm({
      name: template.name,
      subject: template.subject,
    });

    // Fill template body using rich text editor
    await page.fill('[data-testid="template-body-editor"]', template.body);

    // Add merge fields
    await page.click('[data-testid="add-merge-field-button"]');
    await page.selectOption(
      '[data-testid="merge-field-select"]',
      "candidateName"
    );
    await page.click('[data-testid="insert-merge-field-button"]');

    // Save template
    await page.click('[data-testid="save-template-button"]');

    // Verify success
    await helpers.verifyToast("Email template created successfully", "success");
    await expect(page.locator('[data-testid="template-list"]')).toContainText(
      template.name
    );
  });

  test("should edit existing email template", async ({ page }) => {
    await helpers.navigateToPage("/communication/templates");

    // Click edit on first template
    await page.click(
      '[data-testid="template-row"]:first-child [data-testid="edit-template-button"]'
    );

    // Update template content
    await page.fill(
      '[data-testid="name-input"]',
      "Updated Application Received"
    );
    await page.fill(
      '[data-testid="subject-input"]',
      "Updated: Thank you for your application - {{jobTitle}}"
    );

    // Update body content
    await page.fill(
      '[data-testid="template-body-editor"]',
      "Updated template body with new content."
    );

    // Save changes
    await page.click('[data-testid="save-template-button"]');

    // Verify success
    await helpers.verifyToast("Email template updated successfully", "success");
    await expect(page.locator('[data-testid="template-list"]')).toContainText(
      "Updated Application Received"
    );
  });

  test("should preview email template with merge fields", async ({ page }) => {
    await helpers.navigateToPage("/communication/templates");

    // Click preview on first template
    await page.click(
      '[data-testid="template-row"]:first-child [data-testid="preview-template-button"]'
    );

    // Verify preview modal opens
    await expect(
      page.locator('[data-testid="template-preview-modal"]')
    ).toBeVisible();

    // Fill preview data
    await helpers.fillForm({
      "candidate-name": "John Doe",
      "job-title": "Software Engineer",
      "company-name": "TechCorp Inc.",
      "recruiter-name": "Jane Smith",
    });

    // Click generate preview
    await page.click('[data-testid="generate-preview-button"]');

    // Verify preview content
    await expect(page.locator('[data-testid="preview-subject"]')).toContainText(
      "John Doe"
    );
    await expect(page.locator('[data-testid="preview-body"]')).toContainText(
      "Software Engineer"
    );
    await expect(page.locator('[data-testid="preview-body"]')).toContainText(
      "TechCorp Inc."
    );

    // Close preview
    await page.click('[data-testid="close-preview-button"]');
  });

  test("should send personalized email to candidate", async ({ page }) => {
    // Navigate to candidate detail page
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();
    await page.click(
      '[data-testid="candidate-row"]:first-child [data-testid="view-candidate-button"]'
    );
    await page.waitForURL("**/candidates/*");

    // Click send email button
    await page.click('[data-testid="send-email-button"]');

    // Verify email composition modal
    await expect(
      page.locator('[data-testid="email-composition-modal"]')
    ).toBeVisible();

    // Select email template
    await page.selectOption(
      '[data-testid="email-template-select"]',
      "Application Received"
    );

    // Verify template content is loaded and merge fields are populated
    await expect(
      page.locator('[data-testid="email-subject-input"]')
    ).not.toBeEmpty();
    await expect(
      page.locator('[data-testid="email-body-textarea"]')
    ).not.toBeEmpty();

    // Verify merge fields are replaced
    const subjectValue = await page.inputValue(
      '[data-testid="email-subject-input"]'
    );
    expect(subjectValue).not.toContain("{{");

    // Customize email content
    await page.fill(
      '[data-testid="email-subject-input"]',
      "Thank you for your application - Software Engineer Position"
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
    ).toContainText("Thank you for your application");
  });

  test("should send bulk emails to multiple candidates", async ({ page }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Select multiple candidates
    await page.check('[data-testid="candidate-checkbox"]:nth-child(1)');
    await page.check('[data-testid="candidate-checkbox"]:nth-child(2)');
    await page.check('[data-testid="candidate-checkbox"]:nth-child(3)');

    // Click bulk email button
    await page.click('[data-testid="bulk-email-button"]');

    // Verify bulk email modal
    await expect(
      page.locator('[data-testid="bulk-email-modal"]')
    ).toBeVisible();

    // Select email template
    await page.selectOption(
      '[data-testid="email-template-select"]',
      "Application Received"
    );

    // Verify recipient count
    await expect(page.locator('[data-testid="recipient-count"]')).toContainText(
      "3 recipients"
    );

    // Customize subject
    await page.fill(
      '[data-testid="email-subject-input"]',
      "Bulk Update: Application Status"
    );

    // Send bulk email
    await page.click('[data-testid="send-bulk-email-button"]');

    // Verify confirmation dialog
    await expect(
      page.locator('[data-testid="bulk-email-confirmation"]')
    ).toBeVisible();
    await page.click('[data-testid="confirm-bulk-send-button"]');

    // Verify success
    await helpers.verifyToast("Bulk email sent to 3 candidates", "success");
  });

  test("should track email delivery status", async ({ page }) => {
    await helpers.navigateToPage("/communication/emails");

    // Wait for email list to load
    await helpers.waitForLoadingToComplete();

    // Verify email list displays
    await expect(page.locator('[data-testid="email-list"]')).toBeVisible();

    // Check first email entry
    const firstEmail = page.locator('[data-testid="email-row"]').first();
    await expect(
      firstEmail.locator('[data-testid="email-subject"]')
    ).toBeVisible();
    await expect(
      firstEmail.locator('[data-testid="email-recipient"]')
    ).toBeVisible();
    await expect(
      firstEmail.locator('[data-testid="email-status"]')
    ).toBeVisible();
    await expect(
      firstEmail.locator('[data-testid="email-timestamp"]')
    ).toBeVisible();

    // Click on email to view details
    await firstEmail.click();

    // Verify email detail modal
    await expect(
      page.locator('[data-testid="email-detail-modal"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="delivery-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-content"]')).toBeVisible();

    // Check delivery tracking information
    await expect(page.locator('[data-testid="sent-timestamp"]')).toBeVisible();

    // Check if email was opened (if tracking is available)
    const openedStatus = page.locator('[data-testid="opened-timestamp"]');
    if (await openedStatus.isVisible()) {
      await expect(openedStatus).toBeVisible();
    }
  });

  test("should filter and search email history", async ({ page }) => {
    await helpers.navigateToPage("/communication/emails");
    await helpers.waitForLoadingToComplete();

    // Test search by recipient
    await page.fill('[data-testid="search-input"]', "john.doe@example.com");
    await page.click('[data-testid="search-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify search results
    const emailRows = page.locator('[data-testid="email-row"]');
    if ((await emailRows.count()) > 0) {
      await expect(
        emailRows.first().locator('[data-testid="email-recipient"]')
      ).toContainText("john.doe@example.com");
    }

    // Clear search
    await page.fill('[data-testid="search-input"]', "");
    await page.click('[data-testid="search-button"]');

    // Test filter by status
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="status-delivered"]');
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
  });

  test("should handle email template validation", async ({ page }) => {
    await helpers.navigateToPage("/communication/templates");

    // Click create new template
    await page.click('[data-testid="create-template-button"]');

    // Try to save empty template
    await page.click('[data-testid="save-template-button"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="name-error"]')).toContainText(
      "Template name is required"
    );
    await expect(page.locator('[data-testid="subject-error"]')).toContainText(
      "Subject is required"
    );
    await expect(page.locator('[data-testid="body-error"]')).toContainText(
      "Template body is required"
    );

    // Test duplicate name validation
    await helpers.fillForm({
      name: "Application Received", // Assuming this already exists
      subject: "Test subject",
    });
    await page.fill('[data-testid="template-body-editor"]', "Test body");
    await page.click('[data-testid="save-template-button"]');

    await helpers.verifyToast(
      "Template with this name already exists",
      "error"
    );
  });

  test("should manage email template categories", async ({ page }) => {
    await helpers.navigateToPage("/communication/templates");

    // Test category filter
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="category-application"]');
    await page.click('[data-testid="apply-category-filter-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify filtered results
    const templateRows = page.locator('[data-testid="template-row"]');
    if ((await templateRows.count()) > 0) {
      await expect(
        templateRows.first().locator('[data-testid="template-category"]')
      ).toContainText("Application");
    }

    // Create template with category
    await page.click('[data-testid="create-template-button"]');
    await helpers.fillForm({
      name: "Interview Reminder",
      subject: "Interview Reminder - {{jobTitle}}",
    });
    await page.fill(
      '[data-testid="template-body-editor"]',
      "This is a reminder about your upcoming interview."
    );
    await page.selectOption('[data-testid="category-select"]', "Interview");
    await page.click('[data-testid="save-template-button"]');

    // Verify template created with category
    await helpers.verifyToast("Email template created successfully", "success");
  });

  test("should handle email sending errors gracefully", async ({ page }) => {
    // Mock API to return email sending error
    await helpers.mockApiResponse(
      "**/api/communication/send-email",
      {
        error: "Email service unavailable",
      },
      500
    );

    // Navigate to candidate and try to send email
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();
    await page.click(
      '[data-testid="candidate-row"]:first-child [data-testid="view-candidate-button"]'
    );
    await page.waitForURL("**/candidates/*");

    // Try to send email
    await page.click('[data-testid="send-email-button"]');
    await page.selectOption(
      '[data-testid="email-template-select"]',
      "Application Received"
    );
    await page.click('[data-testid="send-email-button"]');

    // Verify error handling
    await helpers.verifyToast(
      "Failed to send email. Please try again later.",
      "error"
    );

    // Verify modal stays open for retry
    await expect(
      page.locator('[data-testid="email-composition-modal"]')
    ).toBeVisible();
  });

  test("should support email template variables and formatting", async ({
    page,
  }) => {
    await helpers.navigateToPage("/communication/templates");
    await page.click('[data-testid="create-template-button"]');

    // Test rich text formatting
    await page.fill('[data-testid="name-input"]', "Formatted Template");
    await page.fill('[data-testid="subject-input"]', "Test Subject");

    // Use rich text editor features
    await page.click('[data-testid="template-body-editor"]');
    await page.type(
      '[data-testid="template-body-editor"]',
      "Dear {{candidateName}},\n\n"
    );

    // Test bold formatting
    await page.click('[data-testid="bold-button"]');
    await page.type('[data-testid="template-body-editor"]', "Important: ");
    await page.click('[data-testid="bold-button"]'); // Toggle off

    await page.type(
      '[data-testid="template-body-editor"]',
      "Your application for {{jobTitle}} has been received.\n\n"
    );

    // Test bullet list
    await page.click('[data-testid="bullet-list-button"]');
    await page.type(
      '[data-testid="template-body-editor"]',
      "Next steps:\nWe will review your application\nYou will hear from us within 5 business days"
    );

    // Save template
    await page.click('[data-testid="save-template-button"]');

    // Verify success
    await helpers.verifyToast("Email template created successfully", "success");

    // Test template preview with formatting
    await page.click(
      '[data-testid="template-row"]:last-child [data-testid="preview-template-button"]'
    );
    await helpers.fillForm({
      "candidate-name": "John Doe",
      "job-title": "Software Engineer",
    });
    await page.click('[data-testid="generate-preview-button"]');

    // Verify formatting is preserved in preview
    await expect(page.locator('[data-testid="preview-body"]')).toContainText(
      "Dear John Doe"
    );
    await expect(page.locator('[data-testid="preview-body"]')).toContainText(
      "Software Engineer"
    );
  });
});
