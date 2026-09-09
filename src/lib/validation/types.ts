import { CandidateEvidenceGraph } from "../evidence/types";

export type ClaimVerificationStatus = "VERIFIED" | "DOWNGRADED" | "REJECTED";
export type ClaimConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface ClaimVerificationResult {
  originalClaim: string;
  sanitizedClaim: string;
  status: ClaimVerificationStatus;
  confidence: ClaimConfidence;
  subject: string;
  evidenceFound: boolean;
  reason?: string;
  supportingEvidenceIds: string[];
}

export interface CandidateGroundTruth {
  companies: string[];
  projects: string[];
  certifications: string[];
  verifiedSkills: string[];
  metrics: string[];
  evidenceGraph: CandidateEvidenceGraph;
}

export interface CareerTwinValidationReport {
  isValid: boolean;
  originalStrengthsCount: number;
  verifiedStrengthsCount: number;
  rejectedClaims: ClaimVerificationResult[];
  downgradedClaims: ClaimVerificationResult[];
  verifiedClaims: ClaimVerificationResult[];
  overallConfidence: ClaimConfidence;
}
