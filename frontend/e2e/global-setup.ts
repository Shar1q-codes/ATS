import { chromium, FullConfig } from "@playwright/test";
import { TestDatabase } from "./utils/test-database";
import { TestDataSeeder } from "./utils/test-data-seeder";

async function globalSetup(config: FullConfig) {
  console.log("🚀 Starting global E2E test setup...");

  // Initialize test database
  const testDb = new TestDatabase();
  await testDb.initialize();

  // Seed test data
  const seeder = new TestDataSeeder(testDb);
  await seeder.seedTestData();

  // Create a browser instance for authentication setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Pre-authenticate test users and save auth states
  await setupAuthStates(page);

  await browser.close();

  console.log("✅ Global E2E test setup completed");
}

async function setupAuthStates(page: any) {
  const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

  // Setup admin user auth state
  await page.goto(`${baseURL}/login`);
  await page.fill('[data-testid="email-input"]', "admin@test.com");
  await page.fill('[data-testid="password-input"]', "testpassword123");
  await page.click('[data-testid="login-button"]');
  await page.waitForURL("**/dashboard");
  await page.context().storageState({ path: "e2e/auth-states/admin.json" });

  // Setup recruiter user auth state
  await page.goto(`${baseURL}/login`);
  await page.fill('[data-testid="email-input"]', "recruiter@test.com");
  await page.fill('[data-testid="password-input"]', "testpassword123");
  await page.click('[data-testid="login-button"]');
  await page.waitForURL("**/dashboard");
  await page.context().storageState({ path: "e2e/auth-states/recruiter.json" });

  // Setup hiring manager auth state
  await page.goto(`${baseURL}/login`);
  await page.fill('[data-testid="email-input"]', "hiring-manager@test.com");
  await page.fill('[data-testid="password-input"]', "testpassword123");
  await page.click('[data-testid="login-button"]');
  await page.waitForURL("**/dashboard");
  await page
    .context()
    .storageState({ path: "e2e/auth-states/hiring-manager.json" });
}

export default globalSetup;
