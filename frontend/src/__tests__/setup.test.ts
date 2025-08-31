/**
 * Basic setup test to verify the testing environment is working
 */

describe("Setup Test", () => {
  it("should pass basic test", () => {
    expect(true).toBe(true);
  });

  it("should have access to environment variables", () => {
    expect(process.env.NEXT_PUBLIC_API_URL).toBeDefined();
  });
});
