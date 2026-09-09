export type FactorStatus = "STRONG" | "ADEQUATE" | "NEEDS_IMPROVEMENT" | "MISSING_DATA";

export interface ScoreFactor {
  key: string;
  label: string;
  weight: number; // e.g. 0.25 for 25%
  score: number;  // 0-100
  weightedScore: number;
  status: FactorStatus;
  evidenceCount: number;
  evidenceSnippets: string[];
  weaknesses: string[];
  improvementSuggestion: string;
  isRealData: boolean;
}

export interface ExplainableReadiness {
  overallScore: number;
  targetRole: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  dimensions: Record<string, ScoreFactor>;
  contributingFactors: Array<{
    label: string;
    pointsContributed: number;
    description: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  highestImpactImprovement: {
    title: string;
    description: string;
    potentialGain: string;
    evidenceToProduce: string[];
  };
  whyThisScore: string;
  disclaimer: string;
}
