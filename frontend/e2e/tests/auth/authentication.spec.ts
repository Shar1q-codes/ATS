import { test, expect } from "@playwright/test";
import { TestHelpers } from "../../utils/test-helpers";
import { testUsers } from "../../fixtures/test-data";

test.describe("Authentication Flow", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test("should register a new user successfully", async ({ page }) => {
    await page.goto("/register");

    // Fill registration form
    await helpers.fillForm({
      "first-name": "Test",
      "last-name": "User",
      email: "newuser@test.com",
      password: "testpassword123",
      "confirm-password": "testpassword123",
    });

    // Select role
    await page.selectOption('[data-testid="role-select"]', "recruiter");

    // Submit form
    await page.click('[data-testid="register-button"]');

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard");

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-name"]')).toContainText(
      "Test User"
    );

    // Verify success toast
    await helpers.verifyToast("Registration successful", "success");
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill login form
    await helpers.fillForm({
      email: testUsers.recruiter.email,
      password: testUsers.recruiter.password,
    });

    // Submit form
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard");

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-name"]')).toContainText(
      "Recruiter User"
    );

    // Verify dashboard elements are visible
    await expect(
      page.locator('[data-testid="dashboard-header"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill login form with invalid credentials
    await helpers.fillForm({
      email: "invalid@test.com",
      password: "wrongpassword",
    });

    // Submit form
    await page.click('[data-testid="login-button"]');

    // Verify error message
    await helpers.verifyToast("Invalid email or password", "error");

    // Verify user stays on login page
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("should logout successfully", async ({ page }) => {
    // Login first
    await helpers.login();

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();

    // Logout
    await helpers.logout();

    // Verify redirect to login page
    await expect(page).toHaveURL(/.*\/login/);

    // Verify user menu is not visible
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
  });

  test("should redirect to login when accessing protected route without authentication", async ({
    page,
  }) => {
    // Try to access protected route without authentication
    await page.goto("/dashboard");

    // Should redirect to login
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("should maintain session after page refresh", async ({ page }) => {
    // Login
    await helpers.login();

    // Verify logged in state
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();

    // Refresh page
    await page.reload();

    // Verify user is still logged in
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test("should handle role-based access control", async ({ page }) => {
    // Login as recruiter
    await helpers.login(
      testUsers.recruiter.email,
      testUsers.recruiter.password
    );

    // Try to access admin-only route
    await page.goto("/admin/users");

    // Should redirect or show access denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
  });

  test("should validate form inputs", async ({ page }) => {
    await page.goto("/register");

    // Try to submit empty form
    await page.click('[data-testid="register-button"]');

    // Verify validation errors
    await expect(
      page.locator('[data-testid="first-name-error"]')
    ).toContainText("First name is required");
    await expect(page.locator('[data-testid="email-error"]')).toContainText(
      "Email is required"
    );
    await expect(page.locator('[data-testid="password-error"]')).toContainText(
      "Password is required"
    );

    // Test invalid email format
    await helpers.fillForm({
      email: "invalid-email",
    });
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText(
      "Invalid email format"
    );

    // Test password mismatch
    await helpers.fillForm({
      password: "password123",
      "confirm-password": "different123",
    });
    await page.click('[data-testid="register-button"]');
    await expect(
      page.locator('[data-testid="confirm-password-error"]')
    ).toContainText("Passwords do not match");
  });

  test("should handle password reset flow", async ({ page }) => {
    await page.goto("/login");

    // Click forgot password link
    await page.click('[data-testid="forgot-password-link"]');
    await page.waitForURL("**/forgot-password");

    // Enter email
    await helpers.fillForm({
      email: testUsers.recruiter.email,
    });

    // Submit form
    await page.click('[data-testid="reset-password-button"]');

    // Verify success message
    await helpers.verifyToast("Password reset email sent", "success");
  });

  test("should complete full user registration to login workflow", async ({
    page,
  }) => {
    // Complete registration flow
    await page.goto("/register");

    const newUser = {
      firstName: "New",
      lastName: "User",
      email: "newuser@example.com",
      password: "securepassword123",
    };

    await helpers.fillForm({
      "first-name": newUser.firstName,
      "last-name": newUser.lastName,
      email: newUser.email,
      password: newUser.password,
      "confirm-password": newUser.password,
    });

    await page.selectOption('[data-testid="role-select"]', "recruiter");
    await page.click('[data-testid="register-button"]');

    // Verify registration success and automatic login
    await page.waitForURL("**/dashboard");
    await expect(page.locator('[data-testid="user-name"]')).toContainText(
      `${newUser.firstName} ${newUser.lastName}`
    );

    // Logout
    await helpers.logout();

    // Login with new credentials
    await helpers.login(newUser.email, newUser.password);

    // Verify successful login
    await expect(page.locator('[data-testid="user-name"]')).toContainText(
      `${newUser.firstName} ${newUser.lastName}`
    );
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test("should handle session timeout and re-authentication", async ({
    page,
  }) => {
    // Login first
    await helpers.login();

    // Mock expired token response
    await helpers.mockApiResponse(
      "**/api/auth/verify",
      { error: "Token expired" },
      401
    );

    // Try to access protected resource
    await page.goto("/candidates");

    // Should redirect to login due to expired token
    await page.waitForURL("**/login");
    await helpers.verifyToast("Session expired. Please login again.", "info");

    // Re-login
    await helpers.login();

    // Should be able to access protected resource
    await expect(page).toHaveURL(/.*\/dashboard/);
  });
});
