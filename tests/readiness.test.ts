import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCandidateEvidenceGraph } from "../src/lib/evidence/index";
import { extractTargetRoleProfile, compareEvidenceToRole } from "../src/lib/role-intelligence/index";
import { computeExplainableReadiness } from "../src/lib/readiness/index";

describe("Explainable Career Readiness — Phase 3 Verification", () => {
  it("explains WHY a score is assigned using verified evidence and dimensions", () => {
    const evidence = buildCandidateEvidenceGraph({
      resume: {
        skills: ["React", "TypeScript"],
        projects: [
          {
            title: "Fullstack App",
            bullets: ["Built React + TypeScript application with Tailwind CSS"],
          },
        ],
        atsScore: 78,
      },
      github: {
        languages: [
          { name: "TypeScript", percentage: 65 },
          { name: "CSS", percentage: 20 },
        ],
        cicdActive: true,
      },
    });

    const targetRole = extractTargetRoleProfile({
      title: "Frontend Developer",
      requiredSkills: ["React", "TypeScript", "Testing"],
    });

    const roleReadiness = compareEvidenceToRole(evidence, targetRole);

    const readiness = computeExplainableReadiness({
      evidenceGraph: evidence,
      roleReadiness,
      resumeAnalysis: {
        atsScore: 78,
        resumeScore: 78,
        impactScore: 80,
      },
      githubAnalysis: {
        githubScore: 82,
        cicdActive: true,
      },
      targetRoleTitle: "Frontend Developer",
    });

    assert.ok(readiness.overallScore > 0, "Score should be calculated");
    assert.ok(readiness.contributingFactors.length >= 4, "Should have contributing factors");
    assert.ok(readiness.strengths.length > 0, "Strengths should be populated from real evidence");
    assert.ok(readiness.weaknesses.length > 0, "Weaknesses should identify missing testing evidence");
    assert.ok(readiness.whyThisScore.includes(String(readiness.overallScore)), "whyThisScore must explain the exact number");
    assert.ok(readiness.highestImpactImprovement.title.length > 0, "Highest impact improvement must exist");
  });

  it("handles missing dimensions honestly without inventing fake scores", () => {
    // Zero resume, zero github, zero interview
    const emptyEvidence = buildCandidateEvidenceGraph({});

    const readiness = computeExplainableReadiness({
      evidenceGraph: emptyEvidence,
      targetRoleTitle: "Junior Developer",
    });

    // Interview dimension should be marked MISSING_DATA and contribute 0 points
    const interviewDim = readiness.dimensions["interviewReadiness"];
    assert.ok(interviewDim);
    assert.equal(interviewDim.status, "MISSING_DATA");
    assert.equal(interviewDim.isRealData, false);
    assert.equal(interviewDim.weightedScore, 0);

    // Highest impact action should prompt user to connect primary evidence
    assert.ok(readiness.highestImpactImprovement.title.includes("Resume") || readiness.highestImpactImprovement.title.includes("GitHub"));
  });
});
