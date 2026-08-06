// Shared data models for the local Resume ATS Analyzer + AI Enhancer.
//
// IMPORTANT: This feature is fully deterministic and uses NO external AI APIs.
// Every score and enhancement is derived from the resume text and the target
// job profile using rule-based logic. No randomness is used anywhere.

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location?: string;
  github?: string;
  linkedin?: string;
}

export interface ExperienceEntry {
  id: string;
  heading: string; // raw first line (company / role)
  role?: string;
  company?: string;
  date?: string;
  bullets: string[];
}

export interface ProjectEntry {
  id: string;
  heading: string;
  title?: string;
  description?: string;
  bullets: string[];
}

export interface EducationEntry {
  id: string;
  text: string;
  institution?: string;
  degree?: string;
  date?: string;
}

export interface CertificationEntry {
  id: string;
  text: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  achievements: string[];
  // Which standard sections were detected in the original resume.
  sectionsPresent: Record<string, boolean>;
  rawText: string;
}

export interface JobProfile {
  title: string;
  description: string;
  skillsText: string;
}

export interface KeywordCategoryResult {
  matched: string[];
  missing: string[];
}

export interface KeywordAnalysis {
  // Canonical target keywords derived from the job profile + description.
  targetKeywords: string[];
  matched: string[];
  missing: string[];
  // Present only in a weak / abbreviated alias form (e.g. "js" for "javascript").
  weak: string[];
  // Missing keywords framed as recommendations (never fabricated as existing skills).
  recommended: string[];
  byCategory: Record<string, KeywordCategoryResult>;
}

export type ATSChangeType = "added" | "improved" | "keyword" | "removed" | "reordered";

export interface ATSCategoryScore {
  key: string;
  label: string;
  score: number;
  max: number;
  explanation: string;
}

export type ATSGrade = "Poor" | "Needs Improvement" | "Average" | "Strong" | "Excellent";

export interface ATSScore {
  total: number;
  grade: ATSGrade;
  categories: ATSCategoryScore[];
}

export type IssueSeverity = "Critical" | "High" | "Medium" | "Low";

export interface ResumeIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  why: string;
  recommendation: string;
  section?: string;
}

export interface ResumeChange {
  id: string;
  section: string;
  originalText: string;
  enhancedText: string;
  changeType: ATSChangeType;
  reason: string;
  atsImpact: string;
}

export interface EnhancedResume {
  data: ResumeData;
  changes: ResumeChange[];
}

export interface ScreeningChance {
  percent: number;
  disclaimer: string;
  factorsIncreasing: string[];
  factorsDecreasing: string[];
}

export interface ResumeAnalysis {
  original: ResumeData;
  enhanced: EnhancedResume;
  keywords: KeywordAnalysis;
  beforeScore: ATSScore;
  afterScore: ATSScore;
  issues: ResumeIssue[];
  screening: ScreeningChance;
  job: JobProfile;
  fileName: string;
  fileSize: number;
}

export type WorkflowStage =
  | "idle"
  | "uploading"
  | "job"
  | "analyzing"
  | "done"
  | "error";
