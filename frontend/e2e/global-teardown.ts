import { TestDatabase } from "./utils/test-database";

async function globalTeardown() {
  console.log("🧹 Running global teardown...");

  try {
    const testDb = new TestDatabase();
    await testDb.connect();
    await testDb.clearAllTables();
    await testDb.disconnect();

    console.log("✅ Global teardown completed");
  } catch (error) {
    console.error("❌ Global teardown failed:", error);
  }
}

export default globalTeardown;
