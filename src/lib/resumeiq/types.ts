export interface ExperienceEntry {
  company: string;
  position: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
}

export interface ProjectEntry {
  name: string;
  description?: string;
  bullets: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  bullets?: string[];
}

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  certifications: string[];
  achievements: string[];
  rawText: string;
}

export type EnhancedResume = Omit<ResumeData, "rawText"> & {
  rawText?: string;
};

export interface JobInput {
  jobTitle: string;
  jobDescription: string;
  additionalSkills: string[];
}

export interface KeywordAnalysis {
  matched: string[];
  missing: string[];
  weak: string[];
}

export interface AtsResult {
  score: number;
  breakdown: {
    keywordMatch: number;
    technicalSkills: number;
    experienceRelevance: number;
    projectRelevance: number;
    resumeStructure: number;
    actionVerbs: number;
    quantifiedAchievements: number;
    formattingCompatibility: number;
  };
}

export interface ResumeIssue {
  id: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  section: string;
  title: string;
  description: string;
  whyItMatters: string;
  recommendation: string;
}

export interface ResumeChange {
  id: string;
  section: string;
  original: string;
  enhanced: string;
  changeType: "Added" | "Improved" | "Keyword Optimized" | "Reorganized" | "Condensed";
  reason: string;
  targetKeywords: string[];
  atsImpact?: "Low" | "Medium" | "High" | string;
}

export interface AnalysisBundle {
  keywords: KeywordAnalysis;
  ats: AtsResult;
  issues: ResumeIssue[];
  screeningChance: number;
  positiveFactors: string[];
  negativeFactors: string[];
}

export interface RecommendationEntry {
  title: string;
  description: string;
  relatedKeyword?: string;
}

export interface EnhanceResponse {
  enhancedResume: EnhancedResume;
  changes: ResumeChange[];
  recommendations: RecommendationEntry[];
}
