import { test, expect } from "@playwright/test";

test.describe("Simple E2E Validation", () => {
  test("should be able to run basic test", async ({ page }) => {
    // This is a simple test to verify E2E infrastructure works
    await page.goto("https://example.com");
    await expect(page).toHaveTitle(/Example/);
  });
});
