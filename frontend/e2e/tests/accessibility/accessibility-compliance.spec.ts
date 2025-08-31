import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { TestHelpers } from "../../utils/test-helpers";

test.describe("Accessibility Compliance (WCAG 2.1 AA)", () => {
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    await testHelpers.loginAsRecruiter();
  });

  test("should pass accessibility audit on dashboard page", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should pass accessibility audit on candidates page", async ({
    page,
  }) => {
    await page.goto("/candidates");

    // Wait for page to fully load
    await expect(page.locator('[data-testid="candidates-page"]')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should pass accessibility audit on job management page", async ({
    page,
  }) => {
    await page.goto("/jobs");

    await expect(page.locator('[data-testid="jobs-page"]')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should pass accessibility audit on applications pipeline", async ({
    page,
  }) => {
    await page.goto("/applications");

    await expect(
      page.locator('[data-testid="applications-page"]')
    ).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should pass accessibility audit on analytics dashboard", async ({
    page,
  }) => {
    await page.goto("/analytics");

    await expect(
      page.locator('[data-testid="analytics-dashboard"]')
    ).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should have proper keyboard navigation", async ({ page }) => {
    await page.goto("/candidates");

    // Test tab navigation through main elements
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();

    // Navigate through candidate list
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Should be able to activate focused element with Enter
    await page.keyboard.press("Enter");

    // Check if modal or page navigation occurred
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/candidates/);
  });

  test("should have proper ARIA labels and roles", async ({ page }) => {
    await page.goto("/applications");

    // Check Kanban board has proper ARIA labels
    const kanbanBoard = page.locator('[data-testid="kanban-board"]');
    await expect(kanbanBoard).toHaveAttribute("role", "region");
    await expect(kanbanBoard).toHaveAttribute("aria-label");

    // Check stage columns have proper labels
    const stageColumns = page.locator('[data-testid^="stage-column-"]');
    const columnCount = await stageColumns.count();

    for (let i = 0; i < columnCount; i++) {
      const column = stageColumns.nth(i);
      await expect(column).toHaveAttribute("role", "region");
      await expect(column).toHaveAttribute("aria-label");
    }

    // Check candidate cards have proper roles
    const candidateCards = page.locator('[data-testid^="candidate-card-"]');
    if ((await candidateCards.count()) > 0) {
      await expect(candidateCards.first()).toHaveAttribute("role", "button");
      await expect(candidateCards.first()).toHaveAttribute("aria-label");
    }
  });

  test("should support screen reader navigation", async ({ page }) => {
    await page.goto("/candidates/new");

    // Check form has proper labels
    const nameInput = page.locator('[data-testid="candidate-name"]');
    await expect(nameInput).toHaveAttribute("aria-label");

    const emailInput = page.locator('[data-testid="candidate-email"]');
    await expect(emailInput).toHaveAttribute("aria-label");

    // Check file upload has proper description
    const fileUpload = page.locator('[data-testid="resume-upload"]');
    await expect(fileUpload).toHaveAttribute("aria-describedby");

    // Check error messages are properly associated
    await page.locator('[data-testid="candidate-form-submit"]').click();

    const errorMessage = page.locator('[data-testid="form-error"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toHaveAttribute("role", "alert");
      await expect(errorMessage).toHaveAttribute("aria-live", "polite");
    }
  });

  test("should have sufficient color contrast", async ({ page }) => {
    await page.goto("/dashboard");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2aa"])
      .include(".text-")
      .analyze();

    // Check specifically for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.id === "color-contrast"
    );

    expect(contrastViolations).toEqual([]);
  });

  test("should handle focus management in modals", async ({ page }) => {
    await page.goto("/candidates");

    // Open candidate detail modal
    const candidateCard = page
      .locator('[data-testid^="candidate-card-"]')
      .first();
    if (await candidateCard.isVisible()) {
      await candidateCard.click();

      // Focus should be trapped in modal
      const modal = page.locator('[data-testid="candidate-detail-modal"]');
      await expect(modal).toBeVisible();

      // First focusable element should be focused
      const firstFocusable = modal
        .locator(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        .first();
      await expect(firstFocusable).toBeFocused();

      // Tab should cycle through modal elements only
      await page.keyboard.press("Tab");
      const focusedElement = page.locator(":focus");
      const isInsideModal = (await modal.locator(":focus").count()) > 0;
      expect(isInsideModal).toBe(true);

      // Escape should close modal
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible();
    }
  });

  test("should provide alternative text for images", async ({ page }) => {
    await page.goto("/candidates");

    // Check all images have alt text
    const images = page.locator("img");
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const altText = await image.getAttribute("alt");
      expect(altText).not.toBeNull();
      expect(altText).not.toBe("");
    }
  });

  test("should support high contrast mode", async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });

    await page.goto("/dashboard");

    // Check that elements are still visible and functional
    await expect(
      page.locator('[data-testid="dashboard-header"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();

    // Test navigation still works
    await page.locator('[data-testid="nav-candidates"]').click();
    await expect(page).toHaveURL(/\/candidates/);
  });

  test("should support reduced motion preferences", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/applications");

    // Drag and drop should still work but without animations
    const sourceCard = page.locator('[data-testid^="candidate-card-"]').first();
    const targetColumn = page.locator('[data-testid="stage-column-screening"]');

    if ((await sourceCard.isVisible()) && (await targetColumn.isVisible())) {
      await sourceCard.dragTo(targetColumn);

      // Card should move without animation delays
      await expect(
        targetColumn.locator('[data-testid^="candidate-card-"]')
      ).toBeVisible({ timeout: 1000 });
    }
  });
});
