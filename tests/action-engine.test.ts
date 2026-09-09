import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCandidateEvidenceGraph } from "../src/lib/evidence/index";
import { extractTargetRoleProfile, compareEvidenceToRole } from "../src/lib/role-intelligence/index";
import { selectHighestImpactAction } from "../src/lib/action-engine/index";

describe("Highest-Impact Action Engine — Phase 6 Verification", () => {
  it("selects missing target-role requirement as P0 critical next best action", () => {
    // Candidate has React and TypeScript, but lacks Testing and Docker
    const evidence = buildCandidateEvidenceGraph({
      resume: {
        skills: ["React", "TypeScript"],
        projects: [{ bullets: ["Built responsive React web app with TypeScript"] }],
      },
      github: {
        languages: [{ name: "TypeScript", percentage: 80 }],
        cicdActive: false,
      },
    });

    const targetRole = extractTargetRoleProfile({
      title: "Frontend Developer",
      requiredSkills: ["React", "TypeScript", "Testing", "Docker"],
    });

    const roleReadiness = compareEvidenceToRole(evidence, targetRole);

    const actionPlan = selectHighestImpactAction({
      evidenceGraph: evidence,
      roleReadiness,
      targetRoleTitle: "Frontend Developer",
      hasResume: true,
      hasGithub: true,
      hasInterview: true,
    });

    assert.ok(actionPlan.primaryAction, "Primary action must be determined");
    assert.equal(actionPlan.primaryAction.priority, "P0_CRITICAL");
    assert.ok(
      actionPlan.primaryAction.gapSkill === "Automated Testing" ||
      actionPlan.primaryAction.gapSkill === "Docker",
      "Should target either missing Testing or Docker"
    );
    assert.ok(actionPlan.primaryAction.completionCriteria.length > 0);
    assert.ok(actionPlan.primaryAction.estimatedImpact.label.includes("ESTIMATED"));
    assert.equal(actionPlan.primaryAction.verificationMethod, "GITHUB_RESCAN");
  });

  it("adapts dynamically when new evidence is provided (Rescan Loop)", () => {
    // 1. Initial State: Candidate lacks Testing
    const beforeEvidence = buildCandidateEvidenceGraph({
      resume: { skills: ["React", "TypeScript"] },
      github: { languages: [{ name: "TypeScript", percentage: 90 }] },
    });

    const targetRole = extractTargetRoleProfile({
      title: "Frontend Developer",
      requiredSkills: ["React", "TypeScript", "Testing", "Docker"],
    });

    const beforeReadiness = compareEvidenceToRole(beforeEvidence, targetRole);
    const beforePlan = selectHighestImpactAction({
      evidenceGraph: beforeEvidence,
      roleReadiness: beforeReadiness,
      targetRoleTitle: "Frontend Developer",
      hasResume: true,
      hasGithub: true,
      hasInterview: true,
    });

    // 2. Candidate ACTS: commits tests to repository!
    // Rescan produces new evidence:
    const afterEvidence = buildCandidateEvidenceGraph({
      resume: { skills: ["React", "TypeScript"] },
      github: {
        languages: [{ name: "TypeScript", percentage: 85 }],
        cicdActive: true, // Now has CI/CD and testing active
      },
      projects: [
        {
          name: "Project with Jest",
          technologies: ["Jest", "TypeScript"], // Testing evidence added!
        },
      ],
    });

    const afterReadiness = compareEvidenceToRole(afterEvidence, targetRole);
    const afterPlan = selectHighestImpactAction({
      evidenceGraph: afterEvidence,
      roleReadiness: afterReadiness,
      targetRoleTitle: "Frontend Developer",
      hasResume: true,
      hasGithub: true,
      hasInterview: true,
    });

    // After rescan: Testing is now verified! Next best action shifts to Docker!
    assert.equal(afterPlan.primaryAction.gapSkill, "Docker");
    assert.notEqual(afterPlan.primaryAction.id, beforePlan.primaryAction.id);
  });
});
