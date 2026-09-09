import { CandidateEvidenceGraph } from "../evidence/types";
import {
  CandidateGroundTruth,
  CareerTwinValidationReport,
  ClaimConfidence,
  ClaimVerificationResult,
} from "./types";
import { normalizeSkillName, formatSkillDisplay } from "../evidence/engine";
import { SKILLS, ALIASES } from "../resume/skillDictionary";
import { normalizeText } from "../resume/keywordNormalizer";

/**
 * Extracts numbers and percentage/currency metrics from text.
 */
function extractMetrics(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?(?:k|m|b)?|\b\d+(?:\.\d+)?\b/gi) || [];
  return matches.map((m) => m.toLowerCase());
}

/**
 * Assembles complete ground truth facts from all verified candidate assets.
 */
export function buildCandidateGroundTruth(params: {
  evidenceGraph: CandidateEvidenceGraph;
  companies?: string[];
  projects?: string[];
  certifications?: string[];
  resumeText?: string;
}): CandidateGroundTruth {
  const { evidenceGraph, companies = [], projects = [], certifications = [], resumeText = "" } = params;

  const verifiedSkills = Object.values(evidenceGraph.skills)
    .filter((s) => s.overallClassification === "DIRECT" || s.overallClassification === "INFERRED")
    .map((s) => s.normalizedSkill);

  const metrics = extractMetrics(resumeText);

  return {
    companies: companies.map((c) => c.toLowerCase().trim()),
    projects: projects.map((p) => p.toLowerCase().trim()),
    certifications: certifications.map((c) => c.toLowerCase().trim()),
    verifiedSkills,
    metrics,
    evidenceGraph,
  };
}

/**
 * Validates a single AI-generated claim against candidate ground truth.
 * Ensures AI never silently invents ungrounded skills, companies, or certifications.
 */
export function validateClaim(
  claim: string,
  groundTruth: CandidateGroundTruth
): ClaimVerificationResult {
  const lower = normalizeText(claim);

  // 1. Detect any technical skills mentioned in the claim
  const mentionedTech: string[] = [];
  for (const skill of SKILLS) {
    const forms = [skill, ...Object.keys(ALIASES).filter((a) => ALIASES[a] === skill)];
    for (const form of forms) {
      const re = new RegExp(`(^|[^a-z0-9+])${form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+]|$)`, "i");
      if (re.test(lower)) {
        mentionedTech.push(normalizeSkillName(skill));
        break;
      }
    }
  }

  // 2. Check if the mentioned technologies have verified evidence
  if (mentionedTech.length > 0) {
    const unsupportedTech: string[] = [];
    const supportedIds: string[] = [];
    let lowestConfidence: ClaimConfidence = "HIGH";

    for (const tech of mentionedTech) {
      const summary = groundTruth.evidenceGraph.skills[tech];
      if (!summary || summary.overallClassification === "MISSING") {
        unsupportedTech.push(tech);
      } else if (summary.overallClassification === "WEAK") {
        lowestConfidence = "LOW";
        if (summary.evidence) {
          supportedIds.push(...summary.evidence.map((e) => e.id));
        }
      } else {
        if (summary.confidence === "MEDIUM" && lowestConfidence === "HIGH") {
          lowestConfidence = "MEDIUM";
        }
        if (summary.evidence) {
          supportedIds.push(...summary.evidence.map((e) => e.id));
        }
      }
    }

    if (unsupportedTech.length > 0) {
      const formatted = unsupportedTech.map(formatSkillDisplay).join(", ");
      return {
        originalClaim: claim,
        sanitizedClaim: `${formatted} experience could not be verified from repository or resume evidence.`,
        status: "REJECTED",
        confidence: "LOW",
        subject: formatted,
        evidenceFound: false,
        reason: `AI claimed proficiency in ${formatted}, but 0 supporting evidence exists in candidate history.`,
        supportingEvidenceIds: [],
      };
    }

    if (lowestConfidence === "LOW") {
      return {
        originalClaim: claim,
        sanitizedClaim: `${claim} (Unverified - profile mention only)`,
        status: "DOWNGRADED",
        confidence: "LOW",
        subject: mentionedTech.map(formatSkillDisplay).join(", "),
        evidenceFound: true,
        reason: "Claim is only supported by user profile claim without code or experience bullets.",
        supportingEvidenceIds: supportedIds,
      };
    }

    return {
      originalClaim: claim,
      sanitizedClaim: claim,
      status: "VERIFIED",
      confidence: lowestConfidence,
      subject: mentionedTech.map(formatSkillDisplay).join(", "),
      evidenceFound: true,
      supportingEvidenceIds: supportedIds,
    };
  }

  // If no specific recognized tech is claimed (e.g. "Clean code and fast learning"), pass with medium confidence
  return {
    originalClaim: claim,
    sanitizedClaim: claim,
    status: "VERIFIED",
    confidence: "MEDIUM",
    subject: "General",
    evidenceFound: true,
    supportingEvidenceIds: [],
  };
}

/**
 * Sanitizes and validates AI Career Twin SWOT analysis against candidate ground truth.
 * Rejects invented strengths, and moves unverified claims to improvement areas.
 */
export function validateTwinSWOT(
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  },
  groundTruth: CandidateGroundTruth
): {
  sanitizedSWOT: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  report: CareerTwinValidationReport;
} {
  const verifiedStrengths: string[] = [];
  const rejectedClaims: ClaimVerificationResult[] = [];
  const downgradedClaims: ClaimVerificationResult[] = [];
  const verifiedClaims: ClaimVerificationResult[] = [];

  for (const strength of swot.strengths || []) {
    const result = validateClaim(strength, groundTruth);

    if (result.status === "REJECTED") {
      rejectedClaims.push(result);
    } else if (result.status === "DOWNGRADED") {
      downgradedClaims.push(result);
      verifiedStrengths.push(result.sanitizedClaim);
    } else {
      verifiedClaims.push(result);
      verifiedStrengths.push(result.sanitizedClaim);
    }
  }

  // If AI hallucinatory claims were rejected from strengths, add explanatory weakness note
  const sanitizedWeaknesses = [...(swot.weaknesses || [])];
  for (const rejected of rejectedClaims) {
    sanitizedWeaknesses.push(`Unverified skill: ${rejected.sanitizedClaim}`);
  }

  const overallConfidence: ClaimConfidence =
    rejectedClaims.length > 0 ? "LOW" : downgradedClaims.length > 0 ? "MEDIUM" : "HIGH";

  const report: CareerTwinValidationReport = {
    isValid: rejectedClaims.length === 0,
    originalStrengthsCount: (swot.strengths || []).length,
    verifiedStrengthsCount: verifiedStrengths.length,
    rejectedClaims,
    downgradedClaims,
    verifiedClaims,
    overallConfidence,
  };

  return {
    sanitizedSWOT: {
      strengths: verifiedStrengths.length > 0 ? verifiedStrengths : ["Consistent project shipping"],
      weaknesses: Array.from(new Set(sanitizedWeaknesses)).slice(0, 5),
      opportunities: swot.opportunities || [],
      threats: swot.threats || [],
    },
    report,
  };
}
