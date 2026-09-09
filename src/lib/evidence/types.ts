export type EvidenceSource =
  | "RESUME"
  | "GITHUB"
  | "PROJECT"
  | "PORTFOLIO"
  | "INTERVIEW"
  | "USER_INPUT";

export type EvidenceClassification =
  | "DIRECT"       // Direct proof in code, production bullet, or verified interview
  | "INFERRED"     // Inferred from a higher-level framework/tooling (e.g. Next.js -> React)
  | "WEAK"         // Bare profile mention without corroborating code or project
  | "MISSING"      // Required/claimed skill with zero discoverable evidence
  | "CONFLICTING"; // Claimed skill contradicts real code analysis or low interview score

export type EvidenceStrength = "STRONG" | "MODERATE" | "WEAK";
export type EvidenceConfidence = "HIGH" | "MEDIUM" | "LOW";

export type SkillCategory =
  | "frontend"
  | "backend"
  | "devops"
  | "database"
  | "testing"
  | "ai_ml"
  | "system_design"
  | "general";

export interface EvidenceItem {
  id: string;
  source: EvidenceSource;
  type: string;
  skill: string;
  normalizedSkill: string;
  description: string;
  strength: EvidenceStrength;
  confidence: EvidenceConfidence;
  classification: EvidenceClassification;
  url?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface SkillEvidenceSummary {
  skill: string;
  normalizedSkill: string;
  category: SkillCategory;
  confidence: EvidenceConfidence;
  overallClassification: EvidenceClassification;
  score: number; // 0-100 deterministic skill strength score
  evidence: EvidenceItem[];
  missingEvidence?: string[];
  summary: string;
}

export interface CandidateRawInputs {
  resume?: {
    rawText?: string;
    skills?: string[];
    experience?: Array<{ role?: string; company?: string; bullets: string[] }>;
    projects?: Array<{ title?: string; description?: string; bullets: string[] }>;
    atsScore?: number;
    certifications?: Array<{ text: string }>;
  } | null;
  github?: {
    username?: string;
    publicRepos?: number;
    languages?: Array<{ name: string; percentage: number }>;
    repositoryHealth?: Array<{ name: string; signal: string; insight: string }>;
    commitStreak?: number;
    cicdActive?: boolean;
    issuesResolved?: number;
    pullRequestsCount?: number;
    readmeQuality?: string;
    stars?: number;
    pinnedRepos?: any;
  } | null;
  projects?: Array<{
    name: string;
    technologies: string[];
    difficulty?: string;
    learningOutcome?: string;
    businessValue?: string;
  }> | null;
  portfolio?: {
    portfolioUrl?: string;
    designScore?: number;
    performanceScore?: number;
    seoScore?: number;
    suggestions?: string[];
  } | null;
  interviews?: Array<{
    technicalScore?: number;
    communicationScore?: number;
    confidenceScore?: number;
    overallScore?: number;
    topic?: string;
    suggestions?: string[];
  }> | null;
  profile?: {
    targetRole?: string;
    skills?: string[];
    cgpa?: string | number;
    education?: string;
  } | null;
  targetRoleRequirements?: string[];
}

export interface CandidateEvidenceGraph {
  skills: Record<string, SkillEvidenceSummary>;
  allEvidence: EvidenceItem[];
  sourcesCount: Record<EvidenceSource, number>;
  totalVerifiedSkills: number;
  conflictingSkills: string[];
  missingSkills: string[];
  directSkills: string[];
  inferredSkills: string[];
  weakSkills: string[];
  overallConfidence: EvidenceConfidence;
  extractedAt: string;
}
