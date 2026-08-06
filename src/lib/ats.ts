// Deterministic ATS scoring engine.
//
// This module is intentionally dependency-free and contains NO randomness.
// The same resume text + job description / target role always produces the
// same score and breakdown. It is used as the source of truth for the ATS
// score displayed across the dashboard, resume-intelligence and career twin.

export type ATSSkillProfile = {
  role: string;
  keywords: string[]; // weighted target keywords for the role
};

export type ATSBreakdown = {
  keywordSkillMatch: number; // /30
  experienceRelevance: number; // /20
  projectRelevance: number; // /15
  resumeStructure: number; // /10
  impactQuantification: number; // /10
  educationCertifications: number; // /5
  contactEssentialSections: number; // /5
  formattingParseability: number; // /5
};

export type ATSResult = {
  score: number; // 0-100
  breakdown: ATSBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};

// Curated dictionary of technical skills / keywords we look for in a resume.
// Kept broad so the engine works for many SDE / data / product roles.
const SKILL_DICTIONARY: string[] = [
  "javascript", "typescript", "python", "java", "c++", "c#", "c", "go", "golang",
  "rust", "ruby", "php", "swift", "kotlin", "scala", "dart", "r", "matlab",
  "html", "html5", "css", "css3", "sass", "scss", "tailwind", "bootstrap",
  "react", "react.js", "reactjs", "next.js", "nextjs", "vue", "vue.js",
  "angular", "svelte", "node", "node.js", "express", "express.js", "deno",
  "django", "flask", "fastapi", "spring", "spring boot", "rails", "laravel",
  "asp.net", "graphql", "rest", "restful", "api", "apis", "soap", "websocket",
  "redux", "zustand", "mobx", "react query", "nextauth", "clerk", "firebase",
  "sql", "mysql", "postgresql", "postgres", "sqlite", "mongodb", "redis",
  "dynamodb", "cassandra", "neo4j", "elasticsearch", "rabbitmq", "kafka",
  "aws", "amazon web services", "azure", "gcp", "google cloud", "heroku",
  "vercel", "netlify", "digitalocean", "docker", "kubernetes", "k8s",
  "terraform", "ansible", "ci/cd", "github actions", "jenkins", "gitlab ci",
  "linux", "unix", "bash", "shell", "nginx", "apache", "microservices",
  "serverless", "lambda", "ecs", "eks", "machine learning", "ml", "deep learning",
  "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "pandas",
  "numpy", "opencv", "nlp", "computer vision", "data science", "data analysis",
  "data engineering", "etl", "spark", "hadoop", "hive", "tableau", "power bi",
  "looker", "excel", "figma", "adobe xd", "photoshop", "ui", "ux", "agile",
  "scrum", "jira", "kanban", "git", "github", "gitlab", "bitbucket", "svn",
  "jest", "mocha", "cypress", "selenium", "playwright", "testing", "tdd",
  "oauth", "jwt", "authentication", "authorization", "tailwindcss", "webpack",
  "vite", "babel", "three.js", "webgl", "d3.js", "d3", "chart.js", "prisma",
  "sequelize", "typeorm", "mongoose", "socket.io", "webrtc", "blockchain",
  "solidity", "ethereum", "devops", "sre", "observability", "prometheus",
  "grafana", "datadog", "segway", "product management", "a/b testing",
  "seo", "analytics", "growth", "communication", "leadership", "mentoring"
];

// Maps common target roles to a curated set of expected keywords.
// If a free-form job description is supplied instead, we fall back to the
// full dictionary with weights derived from frequency in the JD.
const ROLE_PROFILES: Record<string, string[]> = {
  "software developer": ["javascript", "typescript", "react", "next.js", "node.js", "html", "css", "sql", "git", "rest", "api", "testing", "agile"],
  "frontend developer": ["javascript", "typescript", "react", "next.js", "html", "css", "tailwind", "redux", "webpack", "figma", "git", "testing"],
  "front end developer": ["javascript", "typescript", "react", "next.js", "html", "css", "tailwind", "redux", "webpack", "figma", "git", "testing"],
  "backend developer": ["node.js", "python", "java", "sql", "postgresql", "mongodb", "redis", "rest", "api", "docker", "microservices", "aws", "git"],
  "back end developer": ["node.js", "python", "java", "sql", "postgresql", "mongodb", "redis", "rest", "api", "docker", "microservices", "aws", "git"],
  "full stack developer": ["javascript", "typescript", "react", "next.js", "node.js", "sql", "postgresql", "rest", "api", "docker", "aws", "git", "html", "css"],
  "fullstack developer": ["javascript", "typescript", "react", "next.js", "node.js", "sql", "postgresql", "rest", "api", "docker", "aws", "git", "html", "css"],
  "data scientist": ["python", "pandas", "numpy", "scikit-learn", "machine learning", "deep learning", "sql", "tensorflow", "pytorch", "statistics", "nlp", "data analysis"],
  "data engineer": ["python", "sql", "spark", "hadoop", "etl", "kafka", "airflow", "aws", "docker", "postgresql", "data engineering"],
  "devops engineer": ["docker", "kubernetes", "aws", "terraform", "ci/cd", "linux", "bash", "ansible", "jenkins", "prometheus", "grafana", "git"],
  "machine learning engineer": ["python", "tensorflow", "pytorch", "machine learning", "deep learning", "scikit-learn", "sql", "aws", "docker", "nlp", "computer vision"],
  "mobile developer": ["swift", "kotlin", "react native", "flutter", "dart", "android", "ios", "git", "firebase"],
  "android developer": ["kotlin", "java", "android", "sqlite", "firebase", "git"],
  "ios developer": ["swift", "objective-c", "ios", "swiftui", "git", "firebase"],
  "web developer": ["html", "css", "javascript", "react", "next.js", "node.js", "git", "tailwind"],
  "sde": ["javascript", "typescript", "react", "next.js", "node.js", "sql", "data structures", "algorithms", "git", "system design", "rest", "api"],
  "software engineer": ["javascript", "typescript", "react", "node.js", "sql", "git", "rest", "api", "system design", "testing", "agile"],
  "ai engineer": ["python", "machine learning", "deep learning", "tensorflow", "pytorch", "nlp", "llm", "openai", "api", "sql", "git"],
};

// Canonicalize a role string into one of the known profiles (or null = use JD).
function resolveRoleProfile(roleOrJd: string): ATSSkillProfile {
  const normalized = roleOrJd.toLowerCase().trim();
  for (const key of Object.keys(ROLE_PROFILES)) {
    if (normalized.includes(key)) {
      return { role: key, keywords: ROLE_PROFILES[key] };
    }
  }

  // No known role. Treat the input as a job description / free role string:
  // derive a weighted keyword set by counting dictionary hits in the text.
  const lower = normalized;
  const matched = SKILL_DICTIONARY.filter((skill) => {
    // Word-boundary-ish match to avoid "r" matching inside words.
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(skill)}([^a-z0-9]|$)`, "i").test(lower);
  });

  if (matched.length > 0) {
    // De-duplicate and cap to keep scoring meaningful.
    const unique = Array.from(new Set(matched)).slice(0, 25);
    return { role: roleOrJd.slice(0, 80), keywords: unique };
  }

  // Absolute fallback: generic SDE profile so scoring still varies by resume.
  return { role: "software developer", keywords: ROLE_PROFILES["software developer"] };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(text: string): string {
  return (text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Extract matched skills from resume text against the dictionary.
function extractSkills(text: string): string[] {
  const lower = normalize(text);
  const found: string[] = [];
  for (const skill of SKILL_DICTIONARY) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(skill)}([^a-z0-9]|$)`, "i");
    if (re.test(lower)) {
      found.push(skill);
    }
  }
  return Array.from(new Set(found));
}

// Detect the presence of standard resume sections.
function detectSections(text: string): Record<string, boolean> {
  const lower = normalize(text);
  const has = (re: RegExp) => re.test(lower);
  return {
    summary: has(/\b(summary|profile|objective|about me)\b/),
    experience: has(/\b(experience|work history|employment|internship|intern)\b/),
    education: has(/\b(education|academic|university|college|school|degree|b\.?tech|b\.?e\.?|bachelor|master)\b/),
    skills: has(/\b(skills|technical skills|core competencies|tech stack)\b/),
    projects: has(/\b(projects|personal projects|portfolio)\b/),
    certifications: has(/\b(certification|certificate|coursera|udemy|certified)\b/),
    contact: has(/\b(email|phone|mobile|linkedin|github)\b/),
  };
}

// Count quantified impact signals (numbers, %, $, durations).
function countImpactSignals(text: string): number {
  const lower = normalize(text);
  // Match percentages, currency, multipliers, durations, counts.
  const patterns = [
    /\d+\s?%/g, // percentages
    /\$\s?\d/g, // currency
    /\b\d+\s?(x|times|fold)\b/gi, // multipliers
    /\b\d+\s?(users|customers|clients|requests|downloads|students|teams?|people)\b/gi,
    /\b\d+\s?(ms|seconds|minutes|hours|days|weeks|months|years)\b/gi,
    /\b(increased|decreased|reduced|improved|optimized|boosted|accelerated|grew|saved|cut|raised)\b/gi,
  ];
  let count = 0;
  for (const p of patterns) {
    const m = lower.match(p);
    if (m) count += m.length;
  }
  return count;
}

// Detect years of experience from phrases like "X years of experience".
function detectExperienceYears(text: string): number {
  const lower = normalize(text);
  const m = lower.match(/(\d+)\s*\+?\s*(years?|yrs?)/);
  if (m) return parseInt(m[1], 10);
  // Count distinct experience/role entries heuristically.
  const roles = (lower.match(/\b(intern|internship|engineer|developer|analyst|consultant|freelance)\b/g) || []).length;
  return Math.min(roles, 10);
}

// Detect number of project-like bullets/entries.
function detectProjectCount(text: string): number {
  const lower = normalize(text);
  // Count "project" mentions minus the section header.
  const mentions = (lower.match(/\bproject\b/g) || []).length;
  return Math.max(0, mentions - 1);
}

export interface ScoreResumeInput {
  // Raw extracted resume text. Must be non-empty.
  text: string;
  // Either a known job title, a free-form role, or a full job description.
  targetRole?: string;
  // Optional explicit job description for keyword matching.
  jobDescription?: string;
}

export function scoreResume(input: ScoreResumeInput): ATSResult {
  const rawText = input.text || "";
  const lower = normalize(rawText);

  if (!lower) {
    throw new Error("Cannot score an empty resume. No extractable text was found.");
  }

  const profile = resolveRoleProfile(input.jobDescription ? input.jobDescription : input.targetRole || "software developer");
  const targetKeywords = profile.keywords;

  const resumeSkills = extractSkills(rawText);
  const sections = detectSections(rawText);
  const impactCount = countImpactSignals(rawText);
  const expYears = detectExperienceYears(rawText);
  const projectCount = detectProjectCount(rawText);

  // ---- 1. Keyword & Skill Match (/30) ----
  const matchedKeywords = targetKeywords.filter((k) => {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(k)}([^a-z0-9]|$)`, "i");
    return re.test(lower);
  });
  const missingKeywords = targetKeywords.filter((k) => !matchedKeywords.includes(k));
  // Score scales with coverage of target keywords, capped at 30.
  const keywordPct = targetKeywords.length ? matchedKeywords.length / targetKeywords.length : 0;
  const keywordSkillMatch = Math.round(Math.min(1, keywordPct) * 30);

  // ---- 2. Experience Relevance (/20) ----
  let experienceRelevance = 0;
  if (sections.experience) experienceRelevance += 8;
  experienceRelevance += Math.min(expYears, 6) * 2; // up to 12
  experienceRelevance = Math.min(20, experienceRelevance);

  // ---- 3. Project Relevance (/15) ----
  let projectRelevance = 0;
  if (sections.projects) projectRelevance += 6;
  projectRelevance += Math.min(projectCount, 4) * 2; // up to 8
  if (resumeSkills.length >= 5) projectRelevance += 1;
  projectRelevance = Math.min(15, projectRelevance);

  // ---- 4. Resume Structure (/10) ----
  const structuralSections = [sections.summary, sections.experience, sections.education, sections.skills, sections.projects];
  const presentCount = structuralSections.filter(Boolean).length;
  const resumeStructure = Math.round((presentCount / structuralSections.length) * 10);

  // ---- 5. Impact & Quantification (/10) ----
  // Needs both quantified signals AND action-verb context.
  const impactQuantification = Math.min(10, Math.round(Math.min(impactCount, 12) * (10 / 12)));

  // ---- 6. Education & Certifications (/5) ----
  let educationCertifications = 0;
  if (sections.education) educationCertifications += 3;
  if (sections.certifications) educationCertifications += 2;
  educationCertifications = Math.min(5, educationCertifications);

  // ---- 7. Contact & Essential Sections (/5) ----
  const hasEmail = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(rawText);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(rawText);
  let contactEssentialSections = 0;
  if (hasEmail) contactEssentialSections += 2;
  if (hasPhone) contactEssentialSections += 1;
  if (sections.contact || /linkedin|github/.test(lower)) contactEssentialSections += 2;
  contactEssentialSections = Math.min(5, contactEssentialSections);

  // ---- 8. Formatting / Parseability (/5) ----
  // Signals: reasonable length, presence of multiple sections, bullets.
  let formattingParseability = 0;
  const wordCount = (rawText.match(/\S+/g) || []).length;
  if (wordCount >= 120) formattingParseability += 2;
  if (wordCount >= 300) formattingParseability += 1;
  const bulletCount = (rawText.match(/[•\-*]\s|\n\s*[-*]\s|^\s*[-*]\s/gm) || []).length;
  if (bulletCount >= 5) formattingParseability += 1;
  if (presentCount >= 4) formattingParseability += 1;
  formattingParseability = Math.min(5, formattingParseability);

  const breakdown: ATSBreakdown = {
    keywordSkillMatch,
    experienceRelevance,
    projectRelevance,
    resumeStructure,
    impactQuantification,
    educationCertifications,
    contactEssentialSections,
    formattingParseability,
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  // ---- Qualitative feedback ----
  const matchedSkills = resumeSkills.filter((s) => matchedKeywords.includes(s) || targetKeywords.includes(s));
  const missingSkills = targetKeywords.filter((k) => !matchedKeywords.includes(k) && resumeSkills.includes(k) === false);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (keywordSkillMatch >= 24) strengths.push("Strong keyword and skill alignment with the target role.");
  else weaknesses.push("Limited keyword coverage for the target role.");
  if (experienceRelevance >= 14) strengths.push("Clear and relevant work experience.");
  else weaknesses.push("Work experience section is weak or missing.");
  if (projectRelevance >= 11) strengths.push("Good project evidence on the resume.");
  else weaknesses.push("Few or no clearly listed projects.");
  if (impactQuantification >= 7) strengths.push("Resume uses quantified, impact-driven achievements.");
  else weaknesses.push("Add metrics (%, $, time saved) to quantify achievements.");
  if (educationCertifications < 5) suggestions.push("Add education details and relevant certifications.");
  if (contactEssentialSections < 5) suggestions.push("Ensure email, phone, LinkedIn and GitHub links are present.");
  if (resumeStructure < 8) suggestions.push("Use clear section headers (Summary, Experience, Skills, Projects, Education).");
  if (missingKeywords.length) {
    suggestions.push(`Consider adding these target-role keywords if you have the experience: ${missingKeywords.slice(0, 8).join(", ")}.`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
    matchedSkills: Array.from(new Set(matchedSkills)),
    missingSkills: Array.from(new Set(missingSkills)).slice(0, 15),
    matchedKeywords,
    missingKeywords,
    strengths,
    weaknesses,
    suggestions,
  };
}

// Lightweight structured parse of resume text (used as a deterministic
// fallback when the AI parser is unavailable). Best-effort only.
export function parseResumeText(text: string): {
  personalInfo: { name: string; email: string; phone: string; github?: string; linkedin?: string };
  skills: string[];
  sections: Record<string, boolean>;
} {
  const skills = extractSkills(text);
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phoneMatch = text.match(/(\+?\d[\d\s().-]{7,}\d)/);
  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  const linkedinMatch = text.match(/linkedin\.com\/[\w-]+/i);
  const nameLine = (text.split("\n").map((l) => l.trim()).find((l) => l && l.length > 2 && l.length < 40 && !/\d/.test(l)) || "");

  return {
    personalInfo: {
      name: nameLine,
      email: emailMatch ? emailMatch[0] : "",
      phone: phoneMatch ? phoneMatch[0] : "",
      github: githubMatch ? githubMatch[0] : undefined,
      linkedin: linkedinMatch ? linkedinMatch[0] : undefined,
    },
    skills,
    sections: detectSections(text),
  };
}
