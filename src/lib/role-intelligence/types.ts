export type RequirementClassification =
  | "MATCHED"        // Supported by DIRECT evidence (verified in code/projects/resume)
  | "PARTIAL"        // Supported by INFERRED evidence or foundational skills
  | "WEAK_EVIDENCE"  // Claimed or minor mention with low confidence
  | "MISSING";       // Zero supporting evidence found

export type SeniorityLevel = "Intern" | "Junior" | "Mid-Level" | "Senior" | "Lead";

export interface NormalizedRoleRequirement {
  name: string;
  normalizedName: string;
  importance: "REQUIRED" | "PREFERRED";
  category: "skill" | "tool" | "responsibility" | "education" | "experience" | "project_expectation";
  minimumYears?: number;
  description?: string;
}

export interface TargetRoleProfile {
  title: string;
  seniority: SeniorityLevel;
  experienceYearsRequired: number;
  educationRequirements: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  tools: string[];
  responsibilities: string[];
  projectExpectations: string[];
  rawText?: string;
}

export interface RequirementMatchDetail {
  requirement: NormalizedRoleRequirement;
  classification: RequirementClassification;
  evidenceConfidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  score: number; // 0 - 100 match for this requirement
  evidenceSummary: string;
  supportingEvidenceIds: string[];
  recommendation?: string;
}

export interface RoleReadinessAnalysis {
  roleTitle: string;
  seniority: SeniorityLevel;
  overallReadinessScore: number; // 0 - 100 deterministic
  confidence: "HIGH" | "MEDIUM" | "LOW";
  matchedCount: number;
  partialCount: number;
  weakEvidenceCount: number;
  missingCount: number;
  requirements: RequirementMatchDetail[];
  matchedRequirements: RequirementMatchDetail[];
  partialRequirements: RequirementMatchDetail[];
  weakEvidenceRequirements: RequirementMatchDetail[];
  missingRequirements: RequirementMatchDetail[];
  strengths: string[];
  criticalGaps: string[];
  highestImpactAction: string;
  disclaimer: string;
}
