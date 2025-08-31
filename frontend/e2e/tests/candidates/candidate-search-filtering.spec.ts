import { test, expect } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";

test.describe("Candidate Search and Filtering Operations", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto("/login");
    await helpers.login();
  });

  test("should perform comprehensive candidate search across multiple pages", async ({
    page,
  }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Test basic text search
    await page.fill('[data-testid="search-input"]', "John");
    await page.click('[data-testid="search-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify search results
    const candidateRows = page.locator('[data-testid="candidate-row"]');
    const rowCount = await candidateRows.count();

    if (rowCount > 0) {
      // Verify all results contain search term
      for (let i = 0; i < rowCount; i++) {
        const row = candidateRows.nth(i);
        const candidateName = await row
          .locator('[data-testid="candidate-name"]')
          .textContent();
        expect(candidateName?.toLowerCase()).toContain("john");
      }
    }

    // Test search by email
    await page.fill('[data-testid="search-input"]', "john.doe@example.com");
    await page.click('[data-testid="search-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify email search results
    if ((await candidateRows.count()) > 0) {
      await expect(
        candidateRows.first().locator('[data-testid="candidate-email"]')
      ).toContainText("john.doe@example.com");
    }

    // Test search by skills
    await page.fill('[data-testid="search-input"]', "JavaScript");
    await page.click('[data-testid="search-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify skill-based search results
    if ((await candidateRows.count()) > 0) {
      await expect(
        candidateRows.first().locator('[data-testid="candidate-skills"]')
      ).toContainText("JavaScript");
    }
  });

  test("should apply multiple filters simultaneously", async ({ page }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Open filters panel
    await page.click('[data-testid="filters-toggle"]');

    // Apply skill filter
    await page.click('[data-testid="skills-filter"]');
    await page.check('[data-testid="skill-javascript"]');
    await page.check('[data-testid="skill-react"]');

    // Apply experience filter
    await page.click('[data-testid="experience-filter"]');
    await page.fill('[data-testid="min-experience"]', "3");
    await page.fill('[data-testid="max-experience"]', "8");

    // Apply location filter
    await page.click('[data-testid="location-filter"]');
    await page.selectOption(
      '[data-testid="location-select"]',
      "San Francisco, CA"
    );

    // Apply availability filter
    await page.click('[data-testid="availability-filter"]');
    await page.check('[data-testid="available-immediately"]');

    // Apply filters
    await page.click('[data-testid="apply-filters-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify filter results
    await expect(page.locator('[data-testid="active-filters"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="filter-chip-skills"]')
    ).toContainText("JavaScript, React");
    await expect(
      page.locator('[data-testid="filter-chip-experience"]')
    ).toContainText("3-8 years");
    await expect(
      page.locator('[data-testid="filter-chip-location"]')
    ).toContainText("San Francisco, CA");

    // Verify results match filters
    const candidateRows = page.locator('[data-testid="candidate-row"]');
    if ((await candidateRows.count()) > 0) {
      const firstCandidate = candidateRows.first();
      await expect(
        firstCandidate.locator('[data-testid="candidate-skills"]')
      ).toContainText("JavaScript");
      await expect(
        firstCandidate.locator('[data-testid="candidate-location"]')
      ).toContainText("San Francisco");
    }
  });

  test("should handle bulk operations on filtered candidates", async ({
    page,
  }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Apply a filter to get specific candidates
    await page.click('[data-testid="filters-toggle"]');
    await page.click('[data-testid="skills-filter"]');
    await page.check('[data-testid="skill-javascript"]');
    await page.click('[data-testid="apply-filters-button"]');
    await helpers.waitForLoadingToComplete();

    // Select all filtered candidates
    await page.click('[data-testid="select-all-checkbox"]');

    // Verify bulk actions panel appears
    await expect(
      page.locator('[data-testid="bulk-actions-panel"]')
    ).toBeVisible();
    const selectedCount = await page
      .locator('[data-testid="selected-count"]')
      .textContent();
    expect(selectedCount).toMatch(/\d+ selected/);

    // Test bulk tag assignment
    await page.click('[data-testid="bulk-tag-button"]');
    await page.fill('[data-testid="tag-input"]', "JavaScript Developers");
    await page.click('[data-testid="apply-tag-button"]');
    await helpers.verifyToast(/Tags applied to \d+ candidates/, "success");

    // Test bulk status update
    await page.click('[data-testid="bulk-status-button"]');
    await page.selectOption('[data-testid="status-select"]', "Active");
    await page.click('[data-testid="apply-status-button"]');
    await helpers.verifyToast(/Status updated for \d+ candidates/, "success");

    // Test bulk export
    await page.click('[data-testid="bulk-export-button"]');
    await page.selectOption('[data-testid="export-format-select"]', "csv");
    await page.click('[data-testid="confirm-export-button"]');
    await helpers.verifyToast("Export started", "success");
  });

  test("should save and load custom filter presets", async ({ page }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Create a custom filter combination
    await page.click('[data-testid="filters-toggle"]');
    await page.click('[data-testid="skills-filter"]');
    await page.check('[data-testid="skill-react"]');
    await page.check('[data-testid="skill-typescript"]');

    await page.click('[data-testid="experience-filter"]');
    await page.fill('[data-testid="min-experience"]', "5");

    await page.click('[data-testid="location-filter"]');
    await page.selectOption('[data-testid="location-select"]', "Remote");

    // Save filter preset
    await page.click('[data-testid="save-filter-preset-button"]');
    await page.fill(
      '[data-testid="preset-name-input"]',
      "Senior React Developers"
    );
    await page.click('[data-testid="save-preset-button"]');
    await helpers.verifyToast("Filter preset saved", "success");

    // Clear current filters
    await page.click('[data-testid="clear-filters-button"]');
    await helpers.waitForLoadingToComplete();

    // Load saved preset
    await page.click('[data-testid="filter-presets-dropdown"]');
    await page.click('[data-testid="preset-senior-react-developers"]');
    await helpers.waitForLoadingToComplete();

    // Verify preset was applied
    await expect(
      page.locator('[data-testid="filter-chip-skills"]')
    ).toContainText("React, TypeScript");
    await expect(
      page.locator('[data-testid="filter-chip-experience"]')
    ).toContainText("5+ years");
    await expect(
      page.locator('[data-testid="filter-chip-location"]')
    ).toContainText("Remote");
  });

  test("should handle advanced search with boolean operators", async ({
    page,
  }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Switch to advanced search mode
    await page.click('[data-testid="advanced-search-toggle"]');

    // Test AND operator
    await page.fill(
      '[data-testid="advanced-search-input"]',
      'skills:"JavaScript" AND experience:">5"'
    );
    await page.click('[data-testid="advanced-search-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify results match AND criteria
    const candidateRows = page.locator('[data-testid="candidate-row"]');
    if ((await candidateRows.count()) > 0) {
      const firstCandidate = candidateRows.first();
      await expect(
        firstCandidate.locator('[data-testid="candidate-skills"]')
      ).toContainText("JavaScript");
      const experience = await firstCandidate
        .locator('[data-testid="candidate-experience"]')
        .textContent();
      expect(parseInt(experience || "0")).toBeGreaterThan(5);
    }

    // Test OR operator
    await page.fill(
      '[data-testid="advanced-search-input"]',
      'location:"San Francisco" OR location:"New York"'
    );
    await page.click('[data-testid="advanced-search-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify results match OR criteria
    if ((await candidateRows.count()) > 0) {
      const locations = await candidateRows
        .locator('[data-testid="candidate-location"]')
        .allTextContents();
      const validLocations = locations.some(
        (loc) => loc.includes("San Francisco") || loc.includes("New York")
      );
      expect(validLocations).toBeTruthy();
    }

    // Test NOT operator
    await page.fill(
      '[data-testid="advanced-search-input"]',
      'skills:"React" NOT skills:"Angular"'
    );
    await page.click('[data-testid="advanced-search-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify results match NOT criteria
    if ((await candidateRows.count()) > 0) {
      const skills = await candidateRows
        .locator('[data-testid="candidate-skills"]')
        .allTextContents();
      const validSkills = skills.every(
        (skill) => skill.includes("React") && !skill.includes("Angular")
      );
      expect(validSkills).toBeTruthy();
    }
  });

  test("should provide search suggestions and autocomplete", async ({
    page,
  }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Test skill autocomplete
    await page.click('[data-testid="search-input"]');
    await page.type('[data-testid="search-input"]', "Java");

    // Verify autocomplete suggestions appear
    await expect(
      page.locator('[data-testid="search-suggestions"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="suggestion-javascript"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="suggestion-java"]')).toBeVisible();

    // Select suggestion
    await page.click('[data-testid="suggestion-javascript"]');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue(
      "JavaScript"
    );

    // Test location autocomplete
    await page.clear('[data-testid="search-input"]');
    await page.type('[data-testid="search-input"]', "San");
    await expect(
      page.locator('[data-testid="suggestion-san-francisco"]')
    ).toBeVisible();
    await page.click('[data-testid="suggestion-san-francisco"]');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue(
      "San Francisco, CA"
    );
  });

  test("should handle pagination with search and filters", async ({ page }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Apply search that returns multiple pages of results
    await page.fill('[data-testid="search-input"]', "Engineer");
    await page.click('[data-testid="search-button"]');
    await helpers.waitForLoadingToComplete();

    // Verify pagination controls
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    const totalResults = await page
      .locator('[data-testid="total-results"]')
      .textContent();
    expect(totalResults).toMatch(/\d+ results/);

    // Navigate to next page
    if (await page.locator('[data-testid="next-page-button"]').isEnabled()) {
      await page.click('[data-testid="next-page-button"]');
      await helpers.waitForLoadingToComplete();

      // Verify search is maintained across pages
      await expect(page.locator('[data-testid="search-input"]')).toHaveValue(
        "Engineer"
      );

      // Verify results still match search criteria
      const candidateRows = page.locator('[data-testid="candidate-row"]');
      if ((await candidateRows.count()) > 0) {
        const candidateNames = await candidateRows
          .locator('[data-testid="candidate-name"]')
          .allTextContents();
        const matchesSearch = candidateNames.some((name) =>
          name.toLowerCase().includes("engineer")
        );
        expect(matchesSearch).toBeTruthy();
      }
    }

    // Test page size changes
    await page.selectOption('[data-testid="page-size-select"]', "50");
    await helpers.waitForLoadingToComplete();

    // Verify page size change maintains search
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue(
      "Engineer"
    );
    const newRowCount = await page
      .locator('[data-testid="candidate-row"]')
      .count();
    expect(newRowCount).toBeLessThanOrEqual(50);
  });

  test("should export filtered search results", async ({ page }) => {
    await helpers.navigateToPage("/candidates");
    await helpers.waitForLoadingToComplete();

    // Apply specific filters
    await page.fill('[data-testid="search-input"]', "JavaScript");
    await page.click('[data-testid="search-button"]');
    await helpers.waitForLoadingToComplete();

    await page.click('[data-testid="filters-toggle"]');
    await page.click('[data-testid="experience-filter"]');
    await page.fill('[data-testid="min-experience"]', "3");
    await page.click('[data-testid="apply-filters-button"]');
    await helpers.waitForLoadingToComplete();

    // Export filtered results
    await page.click('[data-testid="export-results-button"]');

    // Verify export options
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="export-csv-option"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="export-excel-option"]')
    ).toBeVisible();

    // Select export format and fields
    await page.click('[data-testid="export-csv-option"]');
    await page.check('[data-testid="include-contact-info"]');
    await page.check('[data-testid="include-skills"]');
    await page.check('[data-testid="include-experience"]');

    // Confirm export
    await page.click('[data-testid="confirm-export-button"]');
    await helpers.verifyToast("Export started", "success");

    // Verify export includes filter information
    await expect(page.locator('[data-testid="export-summary"]')).toContainText(
      "JavaScript"
    );
    await expect(page.locator('[data-testid="export-summary"]')).toContainText(
      "3+ years experience"
    );
  });
});
