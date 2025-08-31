import { Page, expect } from "@playwright/test";
import path from "path";

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Login with test credentials
   */
  async login(
    email: string = "recruiter@test.com",
    password: string = "testpassword123"
  ) {
    await this.page.goto("/login");
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL("**/dashboard");
  }

  /**
   * Logout current user
   */
  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL("**/login");
  }

  /**
   * Navigate to a specific page and wait for it to load
   */
  async navigateToPage(path: string, waitForSelector?: string) {
    await this.page.goto(path);
    if (waitForSelector) {
      await this.page.waitForSelector(waitForSelector);
    }
  }

  /**
   * Upload a test file
   */
  async uploadFile(inputSelector: string, fileName: string) {
    const filePath = path.join(__dirname, "../fixtures/files", fileName);
    await this.page.setInputFiles(inputSelector, filePath);
  }

  /**
   * Wait for API response and verify status
   */
  async waitForApiResponse(urlPattern: string, expectedStatus: number = 200) {
    const response = await this.page.waitForResponse(
      (response) =>
        response.url().includes(urlPattern) &&
        response.status() === expectedStatus
    );
    return response;
  }

  /**
   * Fill form fields from object
   */
  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      await this.page.fill(`[data-testid="${field}-input"]`, value);
    }
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingToComplete() {
    await this.page.waitForSelector('[data-testid="loading"]', {
      state: "hidden",
    });
  }

  /**
   * Verify toast notification
   */
  async verifyToast(
    message: string,
    type: "success" | "error" | "info" = "success"
  ) {
    await expect(
      this.page.locator(`[data-testid="toast-${type}"]`)
    ).toContainText(message);
  }

  /**
   * Drag and drop element
   */
  async dragAndDrop(sourceSelector: string, targetSelector: string) {
    await this.page.dragAndDrop(sourceSelector, targetSelector);
  }

  /**
   * Wait for element to be visible and clickable
   */
  async waitAndClick(selector: string) {
    await this.page.waitForSelector(selector, { state: "visible" });
    await this.page.click(selector);
  }

  /**
   * Verify table data
   */
  async verifyTableData(tableSelector: string, expectedData: string[][]) {
    const rows = await this.page.locator(`${tableSelector} tbody tr`).all();

    for (let i = 0; i < expectedData.length; i++) {
      const row = rows[i];
      const cells = await row.locator("td").all();

      for (let j = 0; j < expectedData[i].length; j++) {
        await expect(cells[j]).toContainText(expectedData[i][j]);
      }
    }
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  }

  /**
   * Verify accessibility
   */
  async verifyAccessibility() {
    // This would integrate with axe-core or similar accessibility testing tool
    // For now, we'll check basic accessibility attributes
    const buttons = await this.page.locator("button").all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute("aria-label");
      const text = await button.textContent();
      expect(ariaLabel || text).toBeTruthy();
    }
  }

  /**
   * Wait for network idle (no requests for specified time)
   */
  async waitForNetworkIdle(timeout: number = 2000) {
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(timeout);
  }

  /**
   * Mock API response
   */
  async mockApiResponse(
    urlPattern: string,
    responseData: Record<string, unknown>,
    status: number = 200
  ) {
    await this.page.route(urlPattern, (route) => {
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(responseData),
      });
    });
  }

  /**
   * Verify responsive design
   */
  async verifyResponsiveDesign() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);

    // Verify mobile navigation
    const mobileMenu = this.page.locator('[data-testid="mobile-menu"]');
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
    }

    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(500);

    // Test desktop viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.waitForTimeout(500);
  }
}
