export type ActionPriority = "P0_CRITICAL" | "P1_HIGH" | "P2_MEDIUM";

export type ActionCategory =
  | "EVIDENCE_CLOSURE"
  | "TESTING_COVERAGE"
  | "CODE_VERIFICATION"
  | "RESUME_ALIGNMENT"
  | "INTERVIEW_BENCHMARK";

export type VerificationMethod =
  | "GITHUB_RESCAN"
  | "RESUME_RESCAN"
  | "INTERVIEW_RETAKE"
  | "PORTFOLIO_AUDIT";

export interface EstimatedImpact {
  points: number;
  label: string; // explicitly marked "ESTIMATED"
  basis: string;
}

export interface NextBestAction {
  id: string;
  title: string;
  category: ActionCategory;
  priority: ActionPriority;
  targetRole: string;
  targetSkill: string;
  gapSkill: string;
  targetRequirement?: string;
  evidence: string;
  repository?: string;
  reason: string;
  whyThisAction: string;
  estimatedEffort?: string;
  prerequisites?: string[];
  evidenceToProduce: string[];
  completionCriteria: string[];
  estimatedImpact: EstimatedImpact;
  isCompleted: boolean;
  verificationMethod: VerificationMethod;
}

export interface ActionPlanSummary {
  primaryAction: NextBestAction;
  secondaryActions: NextBestAction[];
  totalGapsIdentified: number;
  criticalGapsCount: number;
  achievablePointsPotential: number;
}
