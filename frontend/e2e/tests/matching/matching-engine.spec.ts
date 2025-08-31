import { test, expect } from "@playwright/test";
import { TestDataSeeder } from "../../utils/test-data-seeder";
import { TestHelpers } from "../../utils/test-helpers";

test.describe("Matching Engine Accuracy E2E Tests", () => {
  let testHelpers: TestHelpers;
  let testDataSeeder: TestDataSeeder;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    testDataSeeder = new TestDataSeeder();

    // Login as recruiter
    await testHelpers.loginAsRecruiter();
  });

  test.afterEach(async () => {
    await testDataSeeder.cleanup();
  });

  test("should generate accurate match scores for various candidate profiles", async ({
    page,
  }) => {
    // Seed job and candidate data
    const jobId = await testDataSeeder.createTestJob({
      title: "Senior Software Engineer",
      requirements: [
        {
          type: "skill",
          category: "must",
          description: "JavaScript",
          weight: 9,
        },
        { type: "skill", category: "must", description: "React", weight: 8 },
        {
          type: "experience",
          category: "must",
          description: "5+ years software development",
          weight: 10,
        },
        {
          type: "skill",
          category: "should",
          description: "TypeScript",
          weight: 7,
        },
        { type: "skill", category: "nice", description: "Node.js", weight: 6 },
      ],
    });

    // Create candidates with different skill profiles
    const perfectMatchCandidate = await testDataSeeder.createTestCandidate({
      name: "Perfect Match",
      skills: ["JavaScript", "React", "TypeScript", "Node.js", "Python"],
      experience: 6,
    });

    const partialMatchCandidate = await testDataSeeder.createTestCandidate({
      name: "Partial Match",
      skills: ["JavaScript", "Vue.js", "Python"],
      experience: 4,
    });

    const poorMatchCandidate = await testDataSeeder.createTestCandidate({
      name: "Poor Match",
      skills: ["PHP", "WordPress"],
      experience: 2,
    });

    // Navigate to job applications
    await page.goto(`/jobs/${jobId}/applications`);

    // Test perfect match candidate
    await page.locator('[data-testid="add-candidate-to-job"]').click();
    await page
      .locator('[data-testid="candidate-search"]')
      .fill("Perfect Match");
    await page
      .locator(`[data-testid="candidate-${perfectMatchCandidate}"]`)
      .click();
    await page.locator('[data-testid="add-candidate-submit"]').click();

    // Wait for matching to complete
    await expect(page.locator('[data-testid="match-score"]')).toBeVisible({
      timeout: 10000,
    });

    const perfectScore = await page
      .locator('[data-testid="match-score"]')
      .textContent();
    const perfectScoreNum = parseInt(perfectScore?.match(/\d+/)?.[0] || "0");

    // Perfect match should score 85+
    expect(perfectScoreNum).toBeGreaterThan(85);

    // Check match explanation
    await page.locator('[data-testid="view-match-explanation"]').click();
    await expect(
      page.locator('[data-testid="match-explanation-modal"]')
    ).toBeVisible();

    // Verify explanation contains key requirements
    await expect(
      page.locator('[data-testid="match-explanation"]')
    ).toContainText("JavaScript");
    await expect(
      page.locator('[data-testid="match-explanation"]')
    ).toContainText("React");
    await expect(
      page.locator('[data-testid="strengths-section"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="gaps-section"]')).toBeVisible();

    await page.locator('[data-testid="close-explanation"]').click();

    // Test partial match candidate
    await page.locator('[data-testid="add-candidate-to-job"]').click();
    await page
      .locator('[data-testid="candidate-search"]')
      .fill("Partial Match");
    await page
      .locator(`[data-testid="candidate-${partialMatchCandidate}"]`)
      .click();
    await page.locator('[data-testid="add-candidate-submit"]').click();

    await expect(
      page.locator('[data-testid="match-score"]').nth(1)
    ).toBeVisible({ timeout: 10000 });

    const partialScore = await page
      .locator('[data-testid="match-score"]')
      .nth(1)
      .textContent();
    const partialScoreNum = parseInt(partialScore?.match(/\d+/)?.[0] || "0");

    // Partial match should score 40-70
    expect(partialScoreNum).toBeGreaterThan(40);
    expect(partialScoreNum).toBeLessThan(70);

    // Test poor match candidate
    await page.locator('[data-testid="add-candidate-to-job"]').click();
    await page.locator('[data-testid="candidate-search"]').fill("Poor Match");
    await page
      .locator(`[data-testid="candidate-${poorMatchCandidate}"]`)
      .click();
    await page.locator('[data-testid="add-candidate-submit"]').click();

    await expect(
      page.locator('[data-testid="match-score"]').nth(2)
    ).toBeVisible({ timeout: 10000 });

    const poorScore = await page
      .locator('[data-testid="match-score"]')
      .nth(2)
      .textContent();
    const poorScoreNum = parseInt(poorScore?.match(/\d+/)?.[0] || "0");

    // Poor match should score below 40
    expect(poorScoreNum).toBeLessThan(40);

    // Verify scores are in correct order
    expect(perfectScoreNum).toBeGreaterThan(partialScoreNum);
    expect(partialScoreNum).toBeGreaterThan(poorScoreNum);
  });

  test("should provide consistent explanations for similar candidates", async ({
    page,
  }) => {
    const jobId = await testDataSeeder.createTestJob({
      title: "Frontend Developer",
      requirements: [
        { type: "skill", category: "must", description: "React", weight: 9 },
        { type: "skill", category: "must", description: "CSS", weight: 8 },
        {
          type: "experience",
          category: "must",
          description: "3+ years frontend",
          weight: 8,
        },
      ],
    });

    // Create two similar candidates
    const candidate1 = await testDataSeeder.createTestCandidate({
      name: "React Developer 1",
      skills: ["React", "CSS", "JavaScript", "HTML"],
      experience: 4,
    });

    const candidate2 = await testDataSeeder.createTestCandidate({
      name: "React Developer 2",
      skills: ["React", "CSS", "JavaScript", "Sass"],
      experience: 4,
    });

    await page.goto(`/jobs/${jobId}/applications`);

    // Add both candidates
    for (const candidateId of [candidate1, candidate2]) {
      await page.locator('[data-testid="add-candidate-to-job"]').click();
      await page
        .locator('[data-testid="candidate-search"]')
        .fill(`React Developer`);
      await page.locator(`[data-testid="candidate-${candidateId}"]`).click();
      await page.locator('[data-testid="add-candidate-submit"]').click();
      await page.waitForTimeout(2000); // Wait for processing
    }

    // Get match scores
    const scores = await page
      .locator('[data-testid="match-score"]')
      .allTextContents();
    const score1 = parseInt(scores[0]?.match(/\d+/)?.[0] || "0");
    const score2 = parseInt(scores[1]?.match(/\d+/)?.[0] || "0");

    // Similar candidates should have similar scores (within 10 points)
    expect(Math.abs(score1 - score2)).toBeLessThan(10);

    // Check explanations are consistent
    await page
      .locator('[data-testid="view-match-explanation"]')
      .first()
      .click();
    const explanation1 = await page
      .locator('[data-testid="match-explanation"]')
      .textContent();
    await page.locator('[data-testid="close-explanation"]').click();

    await page.locator('[data-testid="view-match-explanation"]').nth(1).click();
    const explanation2 = await page
      .locator('[data-testid="match-explanation"]')
      .textContent();
    await page.locator('[data-testid="close-explanation"]').click();

    // Both explanations should mention React and CSS
    expect(explanation1).toContain("React");
    expect(explanation1).toContain("CSS");
    expect(explanation2).toContain("React");
    expect(explanation2).toContain("CSS");
  });

  test("should handle edge cases in matching", async ({ page }) => {
    // Test with candidate having no skills
    const jobId = await testDataSeeder.createTestJob({
      title: "Test Job",
      requirements: [
        { type: "skill", category: "must", description: "Python", weight: 8 },
      ],
    });

    const noSkillsCandidate = await testDataSeeder.createTestCandidate({
      name: "No Skills",
      skills: [],
      experience: 0,
    });

    await page.goto(`/jobs/${jobId}/applications`);

    await page.locator('[data-testid="add-candidate-to-job"]').click();
    await page.locator('[data-testid="candidate-search"]').fill("No Skills");
    await page
      .locator(`[data-testid="candidate-${noSkillsCandidate}"]`)
      .click();
    await page.locator('[data-testid="add-candidate-submit"]').click();

    // Should still generate a match score (likely 0 or very low)
    await expect(page.locator('[data-testid="match-score"]')).toBeVisible({
      timeout: 10000,
    });

    const score = await page
      .locator('[data-testid="match-score"]')
      .textContent();
    const scoreNum = parseInt(score?.match(/\d+/)?.[0] || "0");

    expect(scoreNum).toBeLessThan(20);

    // Should still provide explanation
    await page.locator('[data-testid="view-match-explanation"]').click();
    await expect(
      page.locator('[data-testid="match-explanation"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="gaps-section"]')).toContainText(
      "Python"
    );
  });

  test("should respect MUST/SHOULD/NICE constraint priorities", async ({
    page,
  }) => {
    const jobId = await testDataSeeder.createTestJob({
      title: "Constraint Test Job",
      requirements: [
        { type: "skill", category: "must", description: "Java", weight: 10 },
        { type: "skill", category: "should", description: "Spring", weight: 7 },
        { type: "skill", category: "nice", description: "Docker", weight: 5 },
      ],
    });

    // Candidate with only MUST skills
    const mustOnlyCandidate = await testDataSeeder.createTestCandidate({
      name: "Must Only",
      skills: ["Java"],
      experience: 3,
    });

    // Candidate with SHOULD and NICE but no MUST
    const noMustCandidate = await testDataSeeder.createTestCandidate({
      name: "No Must",
      skills: ["Spring", "Docker", "Python"],
      experience: 5,
    });

    await page.goto(`/jobs/${jobId}/applications`);

    // Add both candidates
    for (const [name, candidateId] of [
      ["Must Only", mustOnlyCandidate],
      ["No Must", noMustCandidate],
    ]) {
      await page.locator('[data-testid="add-candidate-to-job"]').click();
      await page.locator('[data-testid="candidate-search"]').fill(name);
      await page.locator(`[data-testid="candidate-${candidateId}"]`).click();
      await page.locator('[data-testid="add-candidate-submit"]').click();
      await page.waitForTimeout(2000);
    }

    const scores = await page
      .locator('[data-testid="match-score"]')
      .allTextContents();
    const mustOnlyScore = parseInt(scores[0]?.match(/\d+/)?.[0] || "0");
    const noMustScore = parseInt(scores[1]?.match(/\d+/)?.[0] || "0");

    // Candidate with MUST skills should score higher than one without
    expect(mustOnlyScore).toBeGreaterThan(noMustScore);
  });
});
