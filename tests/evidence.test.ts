import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCandidateEvidenceGraph,
  normalizeSkillName,
  formatSkillDisplay,
} from "../src/lib/evidence/index";

describe("Evidence Engine — Phase 1 Verification", () => {
  it("normalizes skill aliases and canonical names correctly", () => {
    assert.equal(normalizeSkillName("React.js"), "react");
    assert.equal(normalizeSkillName("ts"), "typescript");
    assert.equal(normalizeSkillName("Golang"), "go");
    assert.equal(normalizeSkillName("postgres"), "postgresql");
    assert.equal(formatSkillDisplay("react"), "React");
    assert.equal(formatSkillDisplay("typescript"), "TypeScript");
  });

  it("handles completely empty evidence without crashing and returns safe empty graph", () => {
    const graph = buildCandidateEvidenceGraph({});
    assert.ok(graph);
    assert.equal(graph.allEvidence.length, 0);
    assert.equal(graph.totalVerifiedSkills, 0);
    assert.equal(graph.overallConfidence, "LOW");
    assert.equal(Object.keys(graph.skills).length, 0);
  });

  it("classifies multi-source skills as DIRECT with HIGH confidence and score >= 80", () => {
    const graph = buildCandidateEvidenceGraph({
      resume: {
        skills: ["React", "TypeScript"],
        projects: [
          {
            title: "E-commerce app",
            bullets: ["Engineered responsive UI using React, Next.js, and TypeScript with Tailwind CSS"],
          },
        ],
      },
      github: {
        languages: [
          { name: "TypeScript", percentage: 55 },
          { name: "JavaScript", percentage: 30 },
        ],
        cicdActive: true,
      },
    });

    const tsSkill = graph.skills["typescript"];
    assert.ok(tsSkill, "TypeScript skill summary should exist");
    assert.equal(tsSkill.overallClassification, "DIRECT");
    assert.equal(tsSkill.confidence, "HIGH");
    assert.ok(tsSkill.score >= 80, `Expected score >= 80, got ${tsSkill.score}`);
    assert.ok(tsSkill.evidence.length >= 2, "Should have evidence from both resume and github");

    // Check CI/CD evidence
    const cicdSkill = graph.skills["ci/cd"];
    assert.ok(cicdSkill, "CI/CD skill should be captured from GitHub actions");
    assert.equal(cicdSkill.overallClassification, "DIRECT");
  });

  it("infers foundational skills from framework evidence (Next.js -> React inference)", () => {
    const graph = buildCandidateEvidenceGraph({
      projects: [
        {
          name: "SaaS Dashboard",
          technologies: ["Next.js", "PostgreSQL"],
          difficulty: "Advanced",
        },
      ],
    });

    const reactSkill = graph.skills["react"];
    assert.ok(reactSkill, "React should be inferred from Next.js project");
    assert.equal(reactSkill.overallClassification, "INFERRED");
    assert.equal(reactSkill.confidence, "MEDIUM");

    const sqlSkill = graph.skills["sql"];
    assert.ok(sqlSkill, "SQL should be inferred from PostgreSQL");
    assert.equal(sqlSkill.overallClassification, "INFERRED");
  });

  it("flags claimed profile skills without proof as WEAK with LOW confidence", () => {
    const graph = buildCandidateEvidenceGraph({
      profile: {
        skills: ["Kubernetes", "Rust"],
      },
      resume: {
        skills: ["HTML", "CSS"],
      },
    });

    const k8sSkill = graph.skills["kubernetes"];
    assert.ok(k8sSkill, "Kubernetes should be tracked");
    assert.equal(k8sSkill.overallClassification, "WEAK");
    assert.equal(k8sSkill.confidence, "LOW");
    assert.ok(k8sSkill.score < 50, `Expected low score, got ${k8sSkill.score}`);
  });

  it("identifies target role requirements with 0 evidence as MISSING", () => {
    const graph = buildCandidateEvidenceGraph({
      resume: {
        skills: ["React", "CSS"],
      },
      targetRoleRequirements: ["Docker", "Kubernetes", "AWS"],
    });

    const dockerSkill = graph.skills["docker"];
    assert.ok(dockerSkill, "Docker requirement should be tracked");
    assert.equal(dockerSkill.overallClassification, "MISSING");
    assert.equal(dockerSkill.score, 0);
    assert.ok(graph.missingSkills.includes("Docker"));
  });

  it("detects CONFLICTING evidence when interview evaluation contradicts claimed technical skills", () => {
    const graph = buildCandidateEvidenceGraph({
      profile: {
        skills: ["System Design", "Algorithms"],
      },
      interviews: [
        {
          topic: "Data Structures & Problem Solving",
          technicalScore: 35, // Poor performance
          overallScore: 40,
        },
      ],
    });

    const psSkill = graph.skills["problem-solving"];
    assert.ok(psSkill, "Problem solving evaluation should exist");
    assert.equal(psSkill.overallClassification, "CONFLICTING");
    assert.ok(graph.conflictingSkills.length > 0);
  });
});
