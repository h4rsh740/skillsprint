import { CandidateEvidenceGraph } from "../evidence/types";
import {
  NormalizedRoleRequirement,
  RequirementClassification,
  RequirementMatchDetail,
  RoleReadinessAnalysis,
  TargetRoleProfile,
} from "./types";
import { normalizeSkillName } from "../evidence/engine";

const DISCLAIMER =
  "Deterministic evidence-based readiness evaluation. Match scores are strictly computed against verified candidate evidence and do not represent a hiring guarantee.";

export function compareEvidenceToRole(
  evidenceGraph: CandidateEvidenceGraph,
  targetRole: TargetRoleProfile
): RoleReadinessAnalysis {
  const matchDetails: RequirementMatchDetail[] = [];

  const matched: RequirementMatchDetail[] = [];
  const partial: RequirementMatchDetail[] = [];
  const weakEvidence: RequirementMatchDetail[] = [];
  const missing: RequirementMatchDetail[] = [];

  const requiredSkills = Array.isArray(targetRole?.requiredSkills) ? targetRole.requiredSkills : [];
  const preferredSkills = Array.isArray(targetRole?.preferredSkills) ? targetRole.preferredSkills : [];

  // 1. Process Required Skills
  for (const rawSkill of requiredSkills) {
    if (!rawSkill || typeof rawSkill !== "string") continue;
    const canonical = normalizeSkillName(rawSkill);
    const summary = evidenceGraph.skills[canonical];

    const req: NormalizedRoleRequirement = {
      name: rawSkill,
      normalizedName: canonical,
      importance: "REQUIRED",
      category: "skill",
    };

    if (!summary || summary.overallClassification === "MISSING") {
      const item: RequirementMatchDetail = {
        requirement: req,
        classification: "MISSING",
        evidenceConfidence: "NONE",
        score: 0,
        gapSeverity: "CRITICAL",
        currentEvidence: "None detected in repository code, project artifacts, or parsed resume.",
        evidenceSummary: `No code, project, or resume evidence found for required skill ${rawSkill}.`,
        supportingEvidenceIds: [],
        recommendation: `Build a concrete project utilizing ${rawSkill} with unit tests and repository evidence.`,
      };
      missing.push(item);
      matchDetails.push(item);
    } else if (summary.overallClassification === "DIRECT" && summary.score >= 70) {
      const item: RequirementMatchDetail = {
        requirement: req,
        classification: "MATCHED",
        evidenceConfidence: summary.confidence,
        score: summary.score,
        gapSeverity: "NONE",
        currentEvidence: summary.summary,
        evidenceSummary: summary.summary,
        supportingEvidenceIds: summary.evidence.map((e) => e.id),
      };
      matched.push(item);
      matchDetails.push(item);
    } else if (summary.overallClassification === "INFERRED" || (summary.overallClassification === "DIRECT" && summary.score < 70)) {
      const item: RequirementMatchDetail = {
        requirement: req,
        classification: "PARTIAL",
        evidenceConfidence: summary.confidence,
        score: summary.score,
        gapSeverity: "MODERATE",
        currentEvidence: summary.summary,
        evidenceSummary: summary.summary,
        supportingEvidenceIds: summary.evidence.map((e) => e.id),
        recommendation: `Elevate ${rawSkill} from indirect or introductory usage into explicit production projects.`,
      };
      partial.push(item);
      matchDetails.push(item);
    } else {
      // WEAK or CONFLICTING
      const item: RequirementMatchDetail = {
        requirement: req,
        classification: "WEAK_EVIDENCE",
        evidenceConfidence: "LOW",
        score: summary.score,
        gapSeverity: "CRITICAL",
        currentEvidence: summary.summary,
        evidenceSummary: summary.summary,
        supportingEvidenceIds: summary.evidence.map((e) => e.id),
        recommendation: `Provide verifiable repository commits or technical interview demonstrations for ${rawSkill}.`,
      };
      weakEvidence.push(item);
      matchDetails.push(item);
    }
  }

  // 2. Process Preferred Skills
  for (const rawSkill of preferredSkills) {
    if (!rawSkill || typeof rawSkill !== "string") continue;
    const canonical = normalizeSkillName(rawSkill);
    const summary = evidenceGraph.skills[canonical];

    const req: NormalizedRoleRequirement = {
      name: rawSkill,
      normalizedName: canonical,
      importance: "PREFERRED",
      category: "skill",
    };

    if (!summary || summary.overallClassification === "MISSING") {
      const item: RequirementMatchDetail = {
        requirement: req,
        classification: "MISSING",
        evidenceConfidence: "NONE",
        score: 0,
        gapSeverity: "MODERATE",
        currentEvidence: "None detected in candidate portfolio.",
        evidenceSummary: `Preferred skill ${rawSkill} not present in candidate evidence portfolio.`,
        supportingEvidenceIds: [],
        recommendation: `Consider learning ${rawSkill} as an auxiliary strength.`,
      };
      missing.push(item);
      matchDetails.push(item);
    } else if (summary.overallClassification === "DIRECT") {
      const item: RequirementMatchDetail = {
        requirement: req,
        classification: "MATCHED",
        evidenceConfidence: summary.confidence,
        score: summary.score,
        gapSeverity: "NONE",
        currentEvidence: summary.summary,
        evidenceSummary: summary.summary,
        supportingEvidenceIds: summary.evidence.map((e) => e.id),
      };
      matched.push(item);
      matchDetails.push(item);
    } else if (summary.overallClassification === "INFERRED") {
      const item: RequirementMatchDetail = {
        requirement: req,
        classification: "PARTIAL",
        evidenceConfidence: summary.confidence,
        score: summary.score,
        gapSeverity: "MINOR",
        currentEvidence: summary.summary,
        evidenceSummary: summary.summary,
        supportingEvidenceIds: summary.evidence.map((e) => e.id),
      };
      partial.push(item);
      matchDetails.push(item);
    } else {
      const item: RequirementMatchDetail = {
        requirement: req,
        classification: "WEAK_EVIDENCE",
        evidenceConfidence: "LOW",
        score: summary.score,
        gapSeverity: "MINOR",
        currentEvidence: summary.summary,
        evidenceSummary: summary.summary,
        supportingEvidenceIds: summary.evidence.map((e) => e.id),
      };
      weakEvidence.push(item);
      matchDetails.push(item);
    }
  }

  // 3. Deterministic Readiness Score Computation
  const requiredDetails = matchDetails.filter((m) => m.requirement.importance === "REQUIRED");
  const preferredDetails = matchDetails.filter((m) => m.requirement.importance === "PREFERRED");

  const avgRequiredScore =
    requiredDetails.length > 0
      ? requiredDetails.reduce((acc, cur) => acc + cur.score, 0) / requiredDetails.length
      : 70;

  const avgPreferredScore =
    preferredDetails.length > 0
      ? preferredDetails.reduce((acc, cur) => acc + cur.score, 0) / preferredDetails.length
      : 50;

  // Weighted formula:
  // 75% required skills alignment + 25% preferred skills alignment
  const overallReadinessScore = Math.min(
    100,
    Math.max(0, Math.round(avgRequiredScore * 0.75 + avgPreferredScore * 0.25))
  );

  // Derive strengths and critical gaps
  const strengths = matched.map(
    (m) => `${m.requirement.name}: Verified with direct evidence (${m.score}/100)`
  );

  const criticalGaps = missing
    .filter((m) => m.requirement.importance === "REQUIRED")
    .map((m) => m.requirement.name);

  // Highest Impact Next Action
  let highestImpactAction = "Maintain strong git commit cadence and keep portfolio updated.";
  if (criticalGaps.length > 0) {
    const topGap = criticalGaps[0];
    highestImpactAction = `Build and deploy a project highlighting verified ${topGap} usage with automated tests.`;
  } else if (weakEvidence.length > 0) {
    const topWeak = weakEvidence[0].requirement.name;
    highestImpactAction = `Strengthen repository evidence for ${topWeak} by committing active code and test cases.`;
  } else if (partial.length > 0) {
    const topPartial = partial[0].requirement.name;
    highestImpactAction = `Solidify ${topPartial} proficiency by turning inferred usage into explicit project deliverables.`;
  }

  return {
    roleTitle: targetRole.title,
    seniority: targetRole.seniority,
    overallReadinessScore,
    confidence: evidenceGraph.overallConfidence,
    matchedCount: matched.length,
    partialCount: partial.length,
    weakEvidenceCount: weakEvidence.length,
    missingCount: missing.length,
    requirements: matchDetails,
    matchedRequirements: matched,
    partialRequirements: partial,
    weakEvidenceRequirements: weakEvidence,
    missingRequirements: missing,
    strengths,
    criticalGaps,
    highestImpactAction,
    disclaimer: DISCLAIMER,
  };
}
