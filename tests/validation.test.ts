import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCandidateEvidenceGraph } from "../src/lib/evidence/index";
import {
  buildCandidateGroundTruth,
  validateClaim,
  validateTwinSWOT,
} from "../src/lib/validation/index";

describe("AI Claim Validation & Confidence — Phase 4 Verification", () => {
  it("rejects unsupported AI claims with clear explanatory status", () => {
    // Candidate only knows React and JavaScript
    const evidence = buildCandidateEvidenceGraph({
      resume: {
        skills: ["React", "JavaScript"],
      },
    });

    const groundTruth = buildCandidateGroundTruth({
      evidenceGraph: evidence,
      companies: ["Acme Corp"],
      projects: ["Personal Blog"],
    });

    // AI claims Kubernetes experience
    const claim = "Candidate has extensive production Kubernetes and Docker container experience.";
    const result = validateClaim(claim, groundTruth);

    assert.equal(result.status, "REJECTED");
    assert.equal(result.evidenceFound, false);
    assert.equal(result.confidence, "LOW");
    assert.ok(result.sanitizedClaim.includes("could not be verified"));
    assert.ok(result.reason?.includes("supporting evidence"));
  });

  it("verifies grounded AI claims when supporting evidence exists", () => {
    const evidence = buildCandidateEvidenceGraph({
      resume: {
        skills: ["React"],
        projects: [
          {
            title: "Dashboard",
            bullets: ["Built performant React user interface"],
          },
        ],
      },
      github: {
        languages: [{ name: "TypeScript", percentage: 70 }],
      },
    });

    const groundTruth = buildCandidateGroundTruth({
      evidenceGraph: evidence,
    });

    const claim = "Candidate demonstrates solid React implementation skill.";
    const result = validateClaim(claim, groundTruth);

    assert.equal(result.status, "VERIFIED");
    assert.equal(result.evidenceFound, true);
    assert.ok(result.supportingEvidenceIds.length > 0);
  });

  it("downgrades claims when skill is only a profile mention without code or project proof", () => {
    const evidence = buildCandidateEvidenceGraph({
      profile: {
        skills: ["Rust"],
      },
    });

    const groundTruth = buildCandidateGroundTruth({
      evidenceGraph: evidence,
    });

    const claim = "Candidate has Rust programming expertise.";
    const result = validateClaim(claim, groundTruth);

    assert.equal(result.status, "DOWNGRADED");
    assert.equal(result.confidence, "LOW");
    assert.ok(result.sanitizedClaim.includes("Unverified - profile mention only"));
  });

  it("sanitizes Career Twin SWOT by filtering invented strengths into unverified warnings", () => {
    const evidence = buildCandidateEvidenceGraph({
      resume: {
        skills: ["React", "CSS"],
      },
    });

    const groundTruth = buildCandidateGroundTruth({
      evidenceGraph: evidence,
    });

    const rawSWOT = {
      strengths: [
        "Strong React foundational taste",
        "Expertise in Kubernetes cluster management", // Invented by AI!
      ],
      weaknesses: ["Limited test coverage"],
      opportunities: ["Full stack opportunities"],
      threats: ["Market competition"],
    };

    const { sanitizedSWOT, report } = validateTwinSWOT(rawSWOT, groundTruth);

    assert.equal(report.isValid, false, "Report should flag invalid AI claim");
    assert.equal(report.rejectedClaims.length, 1);
    assert.equal(report.rejectedClaims[0].subject, "Kubernetes");
    assert.equal(sanitizedSWOT.strengths.length, 1);
    assert.ok(sanitizedSWOT.strengths[0].includes("React"));
    assert.ok(sanitizedSWOT.weaknesses.some((w) => w.includes("Kubernetes")));
  });
});
