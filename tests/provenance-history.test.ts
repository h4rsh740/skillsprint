import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSkillSprintScores, type SkillSprintContext } from "../src/actions/scores";

describe("Phase 1: History & Provenance Honesty", () => {
  it("establishes an initial baseline without synthetic arithmetic offsets when history is empty", async () => {
    const mockContext: SkillSprintContext = {
      user: { id: "test-user-empty", githubConnected: true },
      dbScores: {
        resume: 70,
        github: 65,
        projects: 60,
        interview: 55,
        marketDemand: 65,
        skillsprintScore: 68,
        history: [], // Empty history
      },
      resume: null,
      github: {
        publicReposCount: 3,
        languagesUsed: ["TypeScript", "Python"],
        contributionStreak: 4,
      },
      linkedin: null,
      interviews: [],
      profile: {
        targetRole: "Full Stack Engineer",
        skills: ["typescript", "react", "node"],
      },
    };

    const result = await getSkillSprintScores(mockContext);

    // Verify history has only the current baseline snapshot and no fabricated previous months
    assert.equal(result.history.length, 1);
    assert.equal(result.history[0].isBaseline, true);
    assert.equal(result.history[0].score, result.skillsprintScore);

    // Verify growth is 0% (honest baseline) instead of arbitrary positive percentages
    assert.equal(result.growthPercentage, 0);
    assert.equal(result.isBaseline, true);

    // Ensure no hardcoded "April" or "May" entries exist
    assert.equal(result.history.some((h) => h.month === "April" || h.month === "May"), false);
  });

  it("accurately maintains genuine historical assessment records and calculates growth against real baseline", async () => {
    const historicalSnapshots = [
      { month: "Jan 2026", score: 50, timestamp: "2026-01-15T10:00:00.000Z" },
      { month: "Feb 2026", score: 60, timestamp: "2026-02-15T10:00:00.000Z" },
    ];

    const mockContext: SkillSprintContext = {
      user: { id: "test-user-history", githubConnected: true },
      dbScores: {
        resume: 75,
        github: 80,
        projects: 70,
        interview: 65,
        marketDemand: 72,
        skillsprintScore: 75,
        history: historicalSnapshots,
      },
      resume: { atsScore: 82, suggestions: { skills: ["react", "typescript"] } },
      github: { publicReposCount: 5, languagesUsed: ["TypeScript", "Go"] },
      linkedin: null,
      interviews: [],
      profile: { targetRole: "Backend Engineer", skills: ["typescript", "go"] },
    };

    const result = await getSkillSprintScores(mockContext);

    assert.ok(result.history.length >= 2);
    assert.equal(result.isBaseline, false);
    assert.equal(result.history[0].score, 50); // Real baseline maintained

    // Growth calculated against baseline (50 -> current score)
    const expectedGrowth = Math.round(((result.skillsprintScore - 50) / 50) * 100);
    assert.equal(result.growthPercentage, expectedGrowth);
  });

  it("correctly classifies provenance as VERIFIED when backed by verified evidence", async () => {
    const mockContext: SkillSprintContext = {
      user: { id: "test-user-verified", githubConnected: true, portfolioAudited: true },
      dbScores: { resume: 80, github: 85, projects: 75, interview: 80, marketDemand: 80, history: [] },
      resume: { atsScore: 85, suggestions: { skills: ["react", "node", "typescript"] } },
      github: {
        publicReposCount: 6,
        languagesUsed: ["TypeScript", "JavaScript", "Python"],
        contributionStreak: 12,
        cicdStatus: "Active GitHub Actions",
        readmeQuality: "High",
      },
      linkedin: { headlineQuality: 80 },
      interviews: [{ overallScore: 82, technicalScore: 85, communicationScore: 80 }],
      profile: { targetRole: "Full Stack Engineer", skills: ["react", "node", "typescript"] },
    };

    const result = await getSkillSprintScores(mockContext);

    // Overall and component provenance should be VERIFIED
    assert.equal(result.provenance, "VERIFIED");
    assert.equal(result.metrics.overall.provenance, "VERIFIED");
    assert.equal(result.metrics.resume.provenance, "VERIFIED");
    assert.equal(result.metrics.github.provenance, "VERIFIED");
    assert.equal(result.metrics.frontend.provenance, "VERIFIED");
    assert.equal(result.metrics.backend.provenance, "VERIFIED");
    assert.equal(result.metrics.problemSolving.provenance, "VERIFIED");
    assert.equal(result.metrics.portfolio.provenance, "VERIFIED");
    assert.ok(result.evidenceCount > 0);
  });

  it("correctly classifies provenance as PROVISIONAL when data is missing or uses fallback defaults", async () => {
    const mockContext: SkillSprintContext = {
      user: { id: "test-user-provisional", githubConnected: false },
      dbScores: { resume: 50, github: 0, projects: 40, interview: 0, marketDemand: 45, history: [] },
      resume: null,
      github: null,
      linkedin: null,
      interviews: [],
      profile: { targetRole: "Software Engineer", skills: [] },
    };

    const result = await getSkillSprintScores(mockContext);

    // When primary inputs are missing, provenance must remain PROVISIONAL
    assert.equal(result.provenance, "PROVISIONAL");
    assert.equal(result.metrics.overall.provenance, "PROVISIONAL");
    assert.equal(result.metrics.resume.provenance, "PROVISIONAL");
    assert.equal(result.metrics.github.provenance, "PROVISIONAL");
    assert.equal(result.metrics.frontend.provenance, "PROVISIONAL");
    assert.equal(result.metrics.backend.provenance, "PROVISIONAL");
    assert.equal(result.metrics.interviewReadiness.provenance, "PROVISIONAL");
    assert.equal(result.metrics.portfolio.provenance, "PROVISIONAL");
  });

  it("labels demo candidates explicitly with DEMO provenance", async () => {
    const mockContext: SkillSprintContext = {
      user: { id: "demo-user", githubConnected: true, isDemo: true },
      dbScores: { resume: 85, github: 90, projects: 80, interview: 85, marketDemand: 85, history: [] },
      resume: { atsScore: 90, suggestions: { skills: ["react", "node"] } },
      github: { publicReposCount: 10, languagesUsed: ["TypeScript"] },
      linkedin: null,
      interviews: [],
      profile: { isDemo: true, targetRole: "Senior Engineer", skills: ["react", "node"] },
    };

    const result = await getSkillSprintScores(mockContext);

    assert.equal(result.provenance, "DEMO");
    assert.equal(result.metrics.overall.provenance, "DEMO");
    assert.equal(result.metrics.resume.provenance, "DEMO");
  });
});
