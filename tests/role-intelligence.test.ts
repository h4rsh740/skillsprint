import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCandidateEvidenceGraph } from "../src/lib/evidence/index";
import {
  extractTargetRoleProfile,
  compareEvidenceToRole,
} from "../src/lib/role-intelligence/index";

describe("Target Role Intelligence — Phase 2 Verification", () => {
  it("extracts and normalizes role requirements from job description", () => {
    const profile = extractTargetRoleProfile({
      title: "Senior Full Stack Engineer",
      description: `
        We are seeking a Senior Full Stack Engineer with 4+ years of experience.
        Responsibilities:
        - Architect and build high-scale web platforms
        - Maintain automated test suites and CI/CD pipelines
        Requirements:
        - Deep proficiency in React, TypeScript, and Node.js
        - Experience with PostgreSQL and Docker
        Nice to have:
        - Experience with Kubernetes and Redis
      `,
      skillsText: "React, TypeScript, Node.js, PostgreSQL, Docker",
    });

    assert.equal(profile.seniority, "Senior");
    assert.equal(profile.experienceYearsRequired, 4);
    assert.ok(profile.requiredSkills.includes("React"));
    assert.ok(profile.requiredSkills.includes("TypeScript"));
    assert.ok(profile.requiredSkills.includes("Docker"));
    assert.ok(profile.responsibilities.length > 0);
  });

  it("accurately classifies MATCHED, PARTIAL, MISSING, and WEAK_EVIDENCE", () => {
    // 1. Candidate evidence:
    // - React: DIRECT from Resume + GitHub
    // - Node.js: INFERRED from Express project
    // - Docker: MISSING
    // - Testing: WEAK (only in profile, no code/bullets)
    const evidence = buildCandidateEvidenceGraph({
      resume: {
        skills: ["React"],
        projects: [
          {
            title: "Web App",
            bullets: ["Built responsive React interface with interactive charts"],
          },
        ],
      },
      github: {
        languages: [{ name: "TypeScript", percentage: 80 }],
        cicdActive: false,
      },
      projects: [
        {
          name: "API Server",
          technologies: ["Express"],
        },
      ],
      profile: {
        skills: ["Automated Testing"],
      },
    });

    // 2. Role requirements
    const targetRole = extractTargetRoleProfile({
      title: "Frontend Developer",
      requiredSkills: ["React", "TypeScript", "Docker"],
      preferredSkills: ["Node.js", "Testing"],
    });

    const analysis = compareEvidenceToRole(evidence, targetRole);

    assert.ok(analysis.overallReadinessScore > 0 && analysis.overallReadinessScore < 100);

    // Verify MATCHED
    const reactMatch = analysis.matchedRequirements.find(
      (m) => m.requirement.normalizedName === "react"
    );
    assert.ok(reactMatch, "React should be MATCHED");
    assert.equal(reactMatch.classification, "MATCHED");

    // Verify PARTIAL (Node.js was inferred from Express)
    const nodeMatch = analysis.partialRequirements.find(
      (m) => m.requirement.normalizedName === "node"
    );
    assert.ok(nodeMatch, "Node should be PARTIAL (inferred from Express)");
    assert.equal(nodeMatch.classification, "PARTIAL");

    // Verify MISSING (Docker has 0 evidence)
    const dockerMatch = analysis.missingRequirements.find(
      (m) => m.requirement.normalizedName === "docker"
    );
    assert.ok(dockerMatch, "Docker should be MISSING");
    assert.equal(dockerMatch.classification, "MISSING");

    // Verify WEAK_EVIDENCE (Testing was only in user profile without code)
    const testingMatch = analysis.weakEvidenceRequirements.find(
      (m) => m.requirement.normalizedName === "testing"
    );
    assert.ok(testingMatch, "Testing should be WEAK_EVIDENCE");
    assert.equal(testingMatch.classification, "WEAK_EVIDENCE");

    // Verify critical gap contains Docker
    assert.ok(analysis.criticalGaps.includes("Docker"));
    assert.ok(analysis.highestImpactAction.includes("Docker"));
  });
});
