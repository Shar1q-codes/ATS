import { test, expect } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";
import { testJobFamilies, testCompanyProfiles } from "../../fixtures/test-data";

test.describe("Job Management", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Login as recruiter before each test
    await page.goto("/login");
    await helpers.login();
  });

  test("should create job family successfully", async ({ page }) => {
    await helpers.navigateToPage("/jobs");

    // Click on Job Families tab
    await page.click('[data-testid="job-families-tab"]');

    // Click create new job family
    await page.click('[data-testid="create-job-family-button"]');

    const jobFamily = testJobFamilies[0];

    // Fill job family form
    await helpers.fillForm({
      name: jobFamily.name,
      description: jobFamily.description,
    });

    // Add skill categories
    for (const category of jobFamily.skillCategories) {
      await page.fill('[data-testid="skill-category-input"]', category);
      await page.click('[data-testid="add-skill-category-button"]');
    }

    // Add requirements
    for (const requirement of jobFamily.requirements) {
      await page.click('[data-testid="add-requirement-button"]');
      await page.selectOption(
        '[data-testid="requirement-type-select"]',
        requirement.type
      );
      await page.selectOption(
        '[data-testid="requirement-category-select"]',
        requirement.category
      );
      await page.fill(
        '[data-testid="requirement-description-input"]',
        requirement.description
      );
      await page.fill(
        '[data-testid="requirement-weight-input"]',
        requirement.weight.toString()
      );
      await page.click('[data-testid="save-requirement-button"]');
    }

    // Save job family
    await page.click('[data-testid="save-job-family-button"]');

    // Verify success
    await helpers.verifyToast("Job family created successfully", "success");
    await expect(page.locator('[data-testid="job-family-list"]')).toContainText(
      jobFamily.name
    );
  });

  test("should create job template from job family", async ({ page }) => {
    await helpers.navigateToPage("/jobs");

    // Click on Job Templates tab
    await page.click('[data-testid="job-templates-tab"]');

    // Click create new job template
    await page.click('[data-testid="create-job-template-button"]');

    // Select job family
    await page.selectOption(
      '[data-testid="job-family-select"]',
      "Software Engineer"
    );

    // Fill template details
    await helpers.fillForm({
      name: "Senior Software Engineer",
      level: "senior",
      "min-experience": "5",
      "max-experience": "10",
      "min-salary": "120000",
      "max-salary": "180000",
    });

    // Modify inherited requirements
    await page.click(
      '[data-testid="requirement-item"]:first-child [data-testid="edit-requirement-button"]'
    );
    await page.fill('[data-testid="requirement-weight-input"]', "10");
    await page.click('[data-testid="save-requirement-button"]');

    // Add template-specific requirement
    await page.click('[data-testid="add-requirement-button"]');
    await page.selectOption('[data-testid="requirement-type-select"]', "skill");
    await page.selectOption(
      '[data-testid="requirement-category-select"]',
      "should"
    );
    await page.fill(
      '[data-testid="requirement-description-input"]',
      "Leadership experience"
    );
    await page.fill('[data-testid="requirement-weight-input"]', "7");
    await page.click('[data-testid="save-requirement-button"]');

    // Save job template
    await page.click('[data-testid="save-job-template-button"]');

    // Verify success
    await helpers.verifyToast("Job template created successfully", "success");
    await expect(
      page.locator('[data-testid="job-template-list"]')
    ).toContainText("Senior Software Engineer");
  });

  test("should create company profile", async ({ page }) => {
    await helpers.navigateToPage("/jobs");

    // Click on Company Profiles tab
    await page.click('[data-testid="company-profiles-tab"]');

    // Click create new company profile
    await page.click('[data-testid="create-company-profile-button"]');

    const company = testCompanyProfiles[0];

    // Fill company profile form
    await helpers.fillForm({
      name: company.name,
      industry: company.industry,
      location: company.location,
    });

    // Select company size
    await page.selectOption(
      '[data-testid="company-size-select"]',
      company.size
    );

    // Select work arrangement
    await page.selectOption(
      '[data-testid="work-arrangement-select"]',
      company.workArrangement
    );

    // Add culture values
    for (const culture of company.culture) {
      await page.fill('[data-testid="culture-input"]', culture);
      await page.click('[data-testid="add-culture-button"]');
    }

    // Add benefits
    for (const benefit of company.benefits) {
      await page.fill('[data-testid="benefit-input"]', benefit);
      await page.click('[data-testid="add-benefit-button"]');
    }

    // Add priority skills
    for (const skill of company.preferences.prioritySkills) {
      await page.fill('[data-testid="priority-skill-input"]', skill);
      await page.click('[data-testid="add-priority-skill-button"]');
    }

    // Save company profile
    await page.click('[data-testid="save-company-profile-button"]');

    // Verify success
    await helpers.verifyToast(
      "Company profile created successfully",
      "success"
    );
    await expect(
      page.locator('[data-testid="company-profile-list"]')
    ).toContainText(company.name);
  });

  test("should create job variant from template and company", async ({
    page,
  }) => {
    await helpers.navigateToPage("/jobs");

    // Click on Job Variants tab
    await page.click('[data-testid="job-variants-tab"]');

    // Click create new job variant
    await page.click('[data-testid="create-job-variant-button"]');

    // Select job template
    await page.selectOption(
      '[data-testid="job-template-select"]',
      "Senior Software Engineer"
    );

    // Select company profile
    await page.selectOption(
      '[data-testid="company-profile-select"]',
      "TechCorp Inc."
    );

    // Customize job title
    await page.fill(
      '[data-testid="custom-title-input"]',
      "Senior Full-Stack Engineer"
    );

    // Add company-specific requirement
    await page.click('[data-testid="add-custom-requirement-button"]');
    await page.selectOption('[data-testid="requirement-type-select"]', "skill");
    await page.selectOption(
      '[data-testid="requirement-category-select"]',
      "must"
    );
    await page.fill(
      '[data-testid="requirement-description-input"]',
      "React and Node.js experience"
    );
    await page.fill('[data-testid="requirement-weight-input"]', "9");
    await page.click('[data-testid="save-requirement-button"]');

    // Modify inherited requirement
    await page.click(
      '[data-testid="inherited-requirement"]:first-child [data-testid="modify-requirement-button"]'
    );
    await page.fill('[data-testid="requirement-weight-input"]', "8");
    await page.click('[data-testid="save-modification-button"]');

    // Add custom description
    await page.fill(
      '[data-testid="custom-description-textarea"]',
      "Join our innovative team building cutting-edge web applications."
    );

    // Save job variant
    await page.click('[data-testid="save-job-variant-button"]');

    // Verify success
    await helpers.verifyToast("Job variant created successfully", "success");
    await expect(
      page.locator('[data-testid="job-variant-list"]')
    ).toContainText("Senior Full-Stack Engineer");
  });

  test("should preview and publish job variant", async ({ page }) => {
    await helpers.navigateToPage("/jobs");

    // Click on Job Variants tab
    await page.click('[data-testid="job-variants-tab"]');

    // Click on existing job variant
    await page.click(
      '[data-testid="job-variant-row"]:first-child [data-testid="view-variant-button"]'
    );

    // Click preview button
    await page.click('[data-testid="preview-job-button"]');

    // Verify preview modal opens
    await expect(
      page.locator('[data-testid="job-preview-modal"]')
    ).toBeVisible();

    // Verify preview content
    await expect(page.locator('[data-testid="preview-title"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="preview-description"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="preview-requirements"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="preview-company-info"]')
    ).toBeVisible();

    // Close preview
    await page.click('[data-testid="close-preview-button"]');

    // Publish job variant
    await page.click('[data-testid="publish-job-button"]');

    // Confirm publication
    await page.click('[data-testid="confirm-publish-button"]');

    // Verify success
    await helpers.verifyToast("Job variant published successfully", "success");
    await expect(page.locator('[data-testid="job-status"]')).toContainText(
      "Published"
    );
  });

  test("should validate job creation forms", async ({ page }) => {
    await helpers.navigateToPage("/jobs");

    // Test job family validation
    await page.click('[data-testid="job-families-tab"]');
    await page.click('[data-testid="create-job-family-button"]');

    // Try to save empty form
    await page.click('[data-testid="save-job-family-button"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="name-error"]')).toContainText(
      "Name is required"
    );
    await expect(
      page.locator('[data-testid="description-error"]')
    ).toContainText("Description is required");

    // Test duplicate name validation
    await helpers.fillForm({
      name: "Software Engineer", // Assuming this already exists
      description: "Test description",
    });
    await page.click('[data-testid="save-job-family-button"]');
    await helpers.verifyToast(
      "Job family with this name already exists",
      "error"
    );
  });

  test("should search and filter jobs", async ({ page }) => {
    await helpers.navigateToPage("/jobs");

    // Test search in job families
    await page.click('[data-testid="job-families-tab"]');
    await page.fill('[data-testid="search-input"]', "Software");
    await page.click('[data-testid="search-button"]');

    // Verify search results
    await expect(page.locator('[data-testid="job-family-row"]')).toContainText(
      "Software"
    );

    // Test filter by skill category
    await page.click('[data-testid="skill-category-filter"]');
    await page.click('[data-testid="programming-filter-option"]');
    await page.click('[data-testid="apply-filters-button"]');

    // Verify filtered results
    await helpers.waitForLoadingToComplete();

    // Clear filters
    await page.click('[data-testid="clear-filters-button"]');
  });

  test("should handle job variant comparison", async ({ page }) => {
    await helpers.navigateToPage("/jobs");

    // Click on Job Variants tab
    await page.click('[data-testid="job-variants-tab"]');

    // Select multiple variants for comparison
    await page.check('[data-testid="variant-checkbox"]:nth-child(1)');
    await page.check('[data-testid="variant-checkbox"]:nth-child(2)');

    // Click compare button
    await page.click('[data-testid="compare-variants-button"]');

    // Verify comparison modal opens
    await expect(
      page.locator('[data-testid="comparison-modal"]')
    ).toBeVisible();

    // Verify comparison content
    await expect(
      page.locator('[data-testid="comparison-table"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="requirements-comparison"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="differences-highlight"]')
    ).toBeVisible();

    // Close comparison
    await page.click('[data-testid="close-comparison-button"]');
  });

  test("should manage job variant versions", async ({ page }) => {
    await helpers.navigateToPage("/jobs");

    // Click on Job Variants tab
    await page.click('[data-testid="job-variants-tab"]');

    // Click on existing job variant
    await page.click(
      '[data-testid="job-variant-row"]:first-child [data-testid="view-variant-button"]'
    );

    // Make changes to create new version
    await page.click('[data-testid="edit-variant-button"]');
    await page.fill('[data-testid="custom-title-input"]', "Updated Title");
    await page.click('[data-testid="save-changes-button"]');

    // Verify new version created
    await helpers.verifyToast("New version created", "success");

    // View version history
    await page.click('[data-testid="version-history-button"]');

    // Verify version history modal
    await expect(
      page.locator('[data-testid="version-history-modal"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="version-list"]')).toBeVisible();

    // Compare versions
    await page.click('[data-testid="compare-versions-button"]');
    await expect(
      page.locator('[data-testid="version-comparison"]')
    ).toBeVisible();
  });

  test("should complete end-to-end job creation and publishing workflow", async ({
    page,
  }) => {
    // Step 1: Create Job Family
    await helpers.navigateToPage("/jobs");
    await page.click('[data-testid="job-families-tab"]');
    await page.click('[data-testid="create-job-family-button"]');

    await helpers.fillForm({
      name: "Data Scientist",
      description: "Data science and analytics roles",
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
      "Python programming"
    );
    await page.fill('[data-testid="requirement-weight-input"]', "9");
    await page.click('[data-testid="save-requirement-button"]');

    await page.click('[data-testid="save-job-family-button"]');
    await helpers.verifyToast("Job family created successfully", "success");

    // Step 2: Create Job Template
    await page.click('[data-testid="job-templates-tab"]');
    await page.click('[data-testid="create-job-template-button"]');
    await page.selectOption(
      '[data-testid="job-family-select"]',
      "Data Scientist"
    );

    await helpers.fillForm({
      name: "Senior Data Scientist",
      level: "senior",
      "min-experience": "5",
      "max-experience": "10",
    });

    await page.click('[data-testid="save-job-template-button"]');
    await helpers.verifyToast("Job template created successfully", "success");

    // Step 3: Create Company Profile (if not exists)
    await page.click('[data-testid="company-profiles-tab"]');
    await page.click('[data-testid="create-company-profile-button"]');

    await helpers.fillForm({
      name: "DataCorp Analytics",
      industry: "Technology",
      location: "New York, NY",
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

    // Step 4: Create Job Variant
    await page.click('[data-testid="job-variants-tab"]');
    await page.click('[data-testid="create-job-variant-button"]');
    await page.selectOption(
      '[data-testid="job-template-select"]',
      "Senior Data Scientist"
    );
    await page.selectOption(
      '[data-testid="company-profile-select"]',
      "DataCorp Analytics"
    );

    await page.fill(
      '[data-testid="custom-title-input"]',
      "Senior Data Scientist - ML Focus"
    );
    await page.click('[data-testid="save-job-variant-button"]');
    await helpers.verifyToast("Job variant created successfully", "success");

    // Step 5: Preview and Publish
    await page.click('[data-testid="preview-job-button"]');
    await expect(
      page.locator('[data-testid="job-preview-modal"]')
    ).toBeVisible();
    await page.click('[data-testid="close-preview-button"]');

    await page.click('[data-testid="publish-job-button"]');
    await page.click('[data-testid="confirm-publish-button"]');
    await helpers.verifyToast("Job variant published successfully", "success");

    // Verify published status
    await expect(page.locator('[data-testid="job-status"]')).toContainText(
      "Published"
    );
  });

  test("should validate form inputs across job management workflow", async ({
    page,
  }) => {
    await helpers.navigateToPage("/jobs");

    // Test Job Family validation
    await page.click('[data-testid="job-families-tab"]');
    await page.click('[data-testid="create-job-family-button"]');
    await page.click('[data-testid="save-job-family-button"]');

    await expect(page.locator('[data-testid="name-error"]')).toContainText(
      "Name is required"
    );
    await expect(
      page.locator('[data-testid="description-error"]')
    ).toContainText("Description is required");

    // Test Job Template validation
    await page.click('[data-testid="job-templates-tab"]');
    await page.click('[data-testid="create-job-template-button"]');
    await page.click('[data-testid="save-job-template-button"]');

    await expect(
      page.locator('[data-testid="job-family-error"]')
    ).toContainText("Job family is required");
    await expect(page.locator('[data-testid="name-error"]')).toContainText(
      "Template name is required"
    );

    // Test Company Profile validation
    await page.click('[data-testid="company-profiles-tab"]');
    await page.click('[data-testid="create-company-profile-button"]');
    await page.click('[data-testid="save-company-profile-button"]');

    await expect(page.locator('[data-testid="name-error"]')).toContainText(
      "Company name is required"
    );
    await expect(page.locator('[data-testid="industry-error"]')).toContainText(
      "Industry is required"
    );

    // Test Job Variant validation
    await page.click('[data-testid="job-variants-tab"]');
    await page.click('[data-testid="create-job-variant-button"]');
    await page.click('[data-testid="save-job-variant-button"]');

    await expect(
      page.locator('[data-testid="job-template-error"]')
    ).toContainText("Job template is required");
    await expect(
      page.locator('[data-testid="company-profile-error"]')
    ).toContainText("Company profile is required");
  });
});
