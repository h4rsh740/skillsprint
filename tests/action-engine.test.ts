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

  it("grounds recommendations in real connected repository and populates enriched fields", () => {
    const evidence = buildCandidateEvidenceGraph({
      resume: { skills: ["Node.js", "Express"] },
      github: { languages: [{ name: "JavaScript", percentage: 100 }] },
    });

    const targetRole = extractTargetRoleProfile({
      title: "Backend Engineer",
      requiredSkills: ["Node.js", "Docker"],
    });

    const roleReadiness = compareEvidenceToRole(evidence, targetRole);

    // Provide a real connected repository
    const actionPlan = selectHighestImpactAction({
      evidenceGraph: evidence,
      roleReadiness,
      targetRoleTitle: "Backend Engineer",
      hasResume: true,
      hasGithub: true,
      hasInterview: true,
      repositories: ["order-processing-service"],
    });

    assert.ok(actionPlan.primaryAction);
    assert.equal(actionPlan.primaryAction.repository, "order-processing-service");
    assert.ok(actionPlan.primaryAction.title.includes("order-processing-service"));
    assert.ok(actionPlan.primaryAction.reason.includes("order-processing-service"));
    assert.equal(actionPlan.primaryAction.targetSkill, "Docker");
    assert.ok(actionPlan.primaryAction.evidence.includes("order-processing-service"));
    assert.ok(actionPlan.primaryAction.estimatedEffort);
    assert.ok(Array.isArray(actionPlan.primaryAction.prerequisites));
    assert.ok(
      actionPlan.primaryAction.prerequisites!.some((p) => p.includes("order-processing-service")),
      "Prerequisites should mention the specific repo"
    );
  });

  it("never fabricates or invents fake repository names when repositories are omitted", () => {
    const evidence = buildCandidateEvidenceGraph({
      resume: { skills: ["Python"] },
      github: { languages: [{ name: "Python", percentage: 100 }] },
    });

    const targetRole = extractTargetRoleProfile({
      title: "Data Engineer",
      requiredSkills: ["Python", "Docker"],
    });

    const roleReadiness = compareEvidenceToRole(evidence, targetRole);

    const actionPlan = selectHighestImpactAction({
      evidenceGraph: evidence,
      roleReadiness,
      targetRoleTitle: "Data Engineer",
      hasResume: true,
      hasGithub: true,
      hasInterview: true,
      // No repositories provided
      repositories: [],
    });

    assert.ok(actionPlan.primaryAction);
    assert.equal(actionPlan.primaryAction.repository, undefined, "Must not invent a repository name");
    assert.equal(actionPlan.primaryAction.title, "Containerize Web Application with Docker");
    assert.ok(!actionPlan.primaryAction.title.includes("undefined"));
  });
});
