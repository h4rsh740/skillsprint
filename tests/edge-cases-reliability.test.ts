import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCandidateEvidenceGraph } from "../src/lib/evidence/index";
import { extractTargetRoleProfile, compareEvidenceToRole } from "../src/lib/role-intelligence/index";
import { computeExplainableReadiness } from "../src/lib/readiness/index";
import { selectHighestImpactAction } from "../src/lib/action-engine/index";

describe("Phase 3 / 4: Edge-Case & Reliability Benchmark Suite", () => {
  it("handles completely empty profile (fresh candidate) gracefully without crashing or fabricating claims", () => {
    // 1. Evidence Graph with zero inputs
    const evidence = buildCandidateEvidenceGraph({});

    assert.equal(Object.keys(evidence.skills).length, 0, "Skills should be empty");
    assert.equal(evidence.allEvidence.length, 0, "No evidence should exist");
    assert.equal(evidence.overallConfidence, "LOW");

    // 2. Role Readiness against Software Engineer
    const targetRole = extractTargetRoleProfile({ title: "Software Engineer" });
    const roleReadiness = compareEvidenceToRole(evidence, targetRole);

    assert.ok(roleReadiness);
    assert.equal(roleReadiness.matchedCount, 0, "Zero skills matched");
    assert.ok(roleReadiness.missingCount > 0, "All skills should be missing");
    assert.ok(
      roleReadiness.missingRequirements.every((m) => m.gapSeverity === "CRITICAL" || m.gapSeverity === "MODERATE"),
      "Missing requirements should have appropriate gap severity"
    );

    // 3. Explainable Readiness
    const readiness = computeExplainableReadiness({
      evidenceGraph: evidence,
      roleReadiness,
      resumeAnalysis: null,
      githubAnalysis: null,
      portfolioAudit: null,
      interviewSessions: null,
    });

    assert.ok(readiness);
    assert.ok(readiness.overallScore >= 0 && readiness.overallScore <= 100);
    assert.equal(readiness.dimensions.resumeStrength.status, "MISSING_DATA");
    assert.equal(readiness.dimensions.interviewReadiness.status, "MISSING_DATA");

    // 4. Action Engine recommends P0 actions without inventing fake repos
    const actionPlan = selectHighestImpactAction({
      evidenceGraph: evidence,
      roleReadiness,
      targetRoleTitle: "Software Engineer",
      hasResume: false,
      hasGithub: false,
      hasInterview: false,
      repositories: [],
    });

    assert.ok(actionPlan.primaryAction);
    assert.equal(actionPlan.primaryAction.priority, "P0_CRITICAL");
    assert.equal(actionPlan.primaryAction.repository, undefined, "Must not invent fake repository");
    assert.ok(
      actionPlan.primaryAction.category === "RESUME_ALIGNMENT" ||
      actionPlan.primaryAction.category === "CODE_VERIFICATION",
      "Should recommend connecting core evidence"
    );
  });

  it("handles fork-only / zero-code GitHub accounts without fabricating codebase skills", () => {
    // Candidate connected GitHub, but has only forked repos and 0 languages
    const evidence = buildCandidateEvidenceGraph({
      github: {
        languages: [], // Zero language volume
        repositoryHealth: [
          { name: "upstream-library", signal: "Low", insight: "Forked repository without commit activity" },
          { name: "starter-template", signal: "Low", insight: "Forked template" },
        ],
        cicdActive: false,
        readmeQuality: "Low",
      },
      profile: {
        skills: ["Rust"], // Claimed Rust on profile, but 0 code
      },
    });

    // Rust must be classified as WEAK because GitHub has 0 code
    const rustSummary = evidence.skills["rust"];
    assert.ok(rustSummary, "Claimed skill should be tracked");
    assert.equal(rustSummary.overallClassification, "WEAK", "Must be classified as WEAK claim");
    assert.equal(rustSummary.confidence, "LOW");

    // Compare against Backend Role requiring Rust
    const targetRole = extractTargetRoleProfile({
      title: "Backend Engineer",
      requiredSkills: ["Rust"],
    });

    const roleReadiness = compareEvidenceToRole(evidence, targetRole);
    assert.equal(roleReadiness.matchedCount, 0, "Weak claim should NOT be counted as MATCHED");
    assert.equal(roleReadiness.weakEvidenceCount, 1);
    assert.equal(roleReadiness.requirements[0].classification, "WEAK_EVIDENCE");

    // Action engine should target providing verifiable code for Rust in the connected repo
    const actionPlan = selectHighestImpactAction({
      evidenceGraph: evidence,
      roleReadiness,
      targetRoleTitle: "Backend Engineer",
      hasResume: true,
      hasGithub: true,
      hasInterview: true,
      repositories: ["upstream-library"],
    });

    assert.ok(actionPlan.primaryAction);
    assert.equal(actionPlan.primaryAction.repository, "upstream-library");
    assert.ok(actionPlan.primaryAction.title.includes("upstream-library"));
  });

  it("safely handles corrupted and malformed inputs without throwing TypeErrors", () => {
    // Inputs with null, undefined, numbers, and malformed structures
    const evidence = buildCandidateEvidenceGraph({
      resume: {
        skills: [null as any, undefined as any, 12345 as any, "React", ""],
        experience: [{ company: "Tech Corp", bullets: [null as any, "Built TypeScript API", 999 as any] }],
        projects: [{ title: "Project X", bullets: [undefined as any, "Used PostgreSQL"] }],
      },
      github: {
        languages: [
          null as any,
          "Python" as any, // Raw string format from legacy DB
          { name: "JavaScript", percentage: 30 },
          { name: null as any, percentage: 50 },
        ],
      },
      profile: {
        skills: [null as any, "Next.js", ""],
      },
    });

    assert.ok(evidence);
    assert.ok(evidence.skills["react"], "React should be parsed from valid string in skills");
    assert.ok(evidence.skills["typescript"], "TypeScript should be parsed from experience bullet");
    assert.ok(evidence.skills["postgresql"], "PostgreSQL should be parsed from project bullet");
    assert.ok(evidence.skills["python"], "Python should be parsed from string language");
    assert.ok(evidence.skills["javascript"], "JavaScript should be parsed from object language");

    // Role matcher with null / undefined fields
    const malformedRole = {
      title: "Full Stack Engineer",
      seniority: "Mid-Level" as const,
      requiredSkills: [null as any, "React", undefined as any],
      preferredSkills: [null as any, "Docker"],
      minYearsExperience: 2,
    } as any;

    const readiness = compareEvidenceToRole(evidence, malformedRole);
    assert.ok(readiness);
    assert.equal(readiness.roleTitle, "Full Stack Engineer");
    assert.ok(readiness.matchedCount >= 1 || readiness.partialCount >= 1, "React should be recognized as matched or partial");
  });
});
