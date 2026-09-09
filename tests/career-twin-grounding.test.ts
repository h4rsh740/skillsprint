import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCandidateEvidenceGraph } from "../src/lib/evidence/index";
import { extractTargetRoleProfile, compareEvidenceToRole } from "../src/lib/role-intelligence/index";
import { generateCareerTwin } from "../src/actions/career-twin";

describe("Phase 2: Career Twin & Target Role Grounding", () => {
  it("classifies target-role gap severity and populates currentEvidence for each requirement", () => {
    const evidence = buildCandidateEvidenceGraph({
      resume: {
        skills: ["React", "TypeScript"],
        projects: [
          {
            title: "Portfolio Web App",
            bullets: ["Developed frontend using React and TypeScript with unit tests"],
          },
        ],
      },
      github: {
        languages: [
          { name: "TypeScript", percentage: 70 },
          { name: "CSS", percentage: 15 },
        ],
      },
      profile: {
        targetRole: "Frontend Engineer",
        skills: ["react", "typescript"],
      },
    });

    const targetRole = extractTargetRoleProfile({
      title: "Frontend Engineer",
      requiredSkills: ["React", "TypeScript", "Docker"],
      preferredSkills: ["GraphQL"],
    });

    const roleReadiness = compareEvidenceToRole(evidence, targetRole);

    // React should be MATCHED with NONE gap severity
    const reactMatch = roleReadiness.requirements.find((r) => r.requirement.normalizedName === "react");
    assert.ok(reactMatch);
    assert.equal(reactMatch.classification, "MATCHED");
    assert.equal(reactMatch.gapSeverity, "NONE");
    assert.ok(reactMatch.currentEvidence && reactMatch.currentEvidence.length > 0);

    // Docker is a required skill with zero evidence -> MISSING with CRITICAL gap severity
    const dockerMatch = roleReadiness.requirements.find((r) => r.requirement.normalizedName === "docker");
    assert.ok(dockerMatch);
    assert.equal(dockerMatch.classification, "MISSING");
    assert.equal(dockerMatch.gapSeverity, "CRITICAL");
    assert.ok(dockerMatch.currentEvidence?.includes("None detected"));

    // GraphQL is a preferred skill with zero evidence -> MISSING with MODERATE gap severity
    const graphqlMatch = roleReadiness.requirements.find((r) => r.requirement.normalizedName === "graphql");
    assert.ok(graphqlMatch);
    assert.equal(graphqlMatch.classification, "MISSING");
    assert.equal(graphqlMatch.gapSeverity, "MODERATE");
  });

  it("grounds Career Twin placement readiness in evidence and provides explicit limitations", async () => {
    const formData = new FormData();
    formData.append("cgpa", "8.5");
    formData.append("targetRole", "Full Stack Developer");
    formData.append("skills", "React, TypeScript, Node.js");

    const twin = await generateCareerTwin(formData);

    // Placement readiness must be a deterministic number between 0 and 100
    assert.ok(typeof twin.placementReadiness === "number");
    assert.ok(twin.placementReadiness >= 0 && twin.placementReadiness <= 100);

    // Placement confidence must be an explicit confidence tier
    assert.ok(["HIGH", "MEDIUM", "LOW"].includes(twin.placementConfidence || ""));

    // Placement explanation and limitations must be explicitly disclosed
    assert.ok(twin.placementWhy && twin.placementWhy.includes("Deterministic alignment"));
    assert.ok(twin.placementLimitations && twin.placementLimitations.includes("does not provide actuarial hiring guarantees"));
    assert.ok(twin.salaryLimitations && twin.salaryLimitations.includes("Salary projections represent indicative"));

    // Grounded claims must be populated with evidence and confidence
    assert.ok(twin.groundedClaims && twin.groundedClaims.length >= 2);
    for (const claim of twin.groundedClaims) {
      assert.ok(claim.claim && claim.claim.length > 0);
      assert.ok(claim.evidence && claim.evidence.length > 0);
      assert.ok(["HIGH", "MEDIUM", "LOW"].includes(claim.confidence));
    }
  });

  it("handles empty / missing candidate skills without fabricating high-confidence placement claims", async () => {
    const formData = new FormData();
    formData.append("cgpa", "6.5");
    formData.append("targetRole", "Distributed Systems Engineer");
    formData.append("skills", "");

    const twin = await generateCareerTwin(formData);

    // With zero skills provided, readiness must not claim 100 or high confidence
    assert.ok(twin.placementReadiness !== undefined && twin.placementReadiness <= 75);
    assert.ok(twin.placementConfidence === "LOW" || twin.placementConfidence === "MEDIUM");
    assert.ok(twin.placementLimitations && twin.placementLimitations.length > 0);
  });
});
