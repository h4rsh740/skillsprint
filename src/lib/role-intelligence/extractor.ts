import { TargetRoleProfile, SeniorityLevel } from "./types";
import { normalizeSkillName, formatSkillDisplay } from "../evidence/engine";
import { ROLE_PROFILES, SKILLS, ALIASES } from "../resume/skillDictionary";
import { normalizeText } from "../resume/keywordNormalizer";

const DEFAULT_ROLE_TOOLING: Record<string, string[]> = {
  frontend: ["git", "vite", "webpack", "npm", "figma", "postman"],
  backend: ["docker", "git", "postman", "postgresql", "redis"],
  fullstack: ["docker", "git", "postman", "postgresql", "redis", "figma"],
  devops: ["docker", "kubernetes", "github actions", "terraform", "linux"],
  mobile: ["git", "android studio", "xcode", "figma"],
  data: ["python", "sql", "pandas", "jupyter", "tableau"],
};

export function extractSeniority(text: string, title?: string): SeniorityLevel {
  const check = (t: string): SeniorityLevel | null => {
    const lower = t.toLowerCase();
    if (lower.includes("intern") || lower.includes("internship")) return "Intern";
    if (/\b(lead|architect|principal|staff)\b/i.test(lower)) return "Lead";
    if (/\b(senior|sr\.?)\b/i.test(lower)) return "Senior";
    if (/\b(junior|jr\.?|entry|fresher|graduate)\b/i.test(lower)) return "Junior";
    return null;
  };

  if (title) {
    const fromTitle = check(title);
    if (fromTitle) return fromTitle;
  }

  const fromFull = check(text);
  if (fromFull) return fromFull;

  return "Mid-Level";
}

export function extractExperienceYears(text: string): number {
  const match = text.match(/(\d+)\+?\s*(?:to\s*(\d+)\+?)?\s*years?(?:\s*of)?\s*(?:experience|exp)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

export function extractEducationRequirements(text: string): string[] {
  const lower = text.toLowerCase();
  const reqs: string[] = [];
  if (lower.includes("bachelor") || lower.includes("b.tech") || lower.includes("b.e.") || lower.includes("bs in cs") || lower.includes("computer science")) {
    reqs.push("Bachelor's degree in Computer Science, Engineering, or equivalent experience");
  }
  if (lower.includes("master") || lower.includes("m.tech") || lower.includes("ms in cs")) {
    reqs.push("Master's degree preferred");
  }
  return reqs;
}

export function extractResponsibilities(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const responsibilities: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const lLower = line.toLowerCase();
    if (
      lLower.includes("responsibilit") ||
      lLower.includes("what you will do") ||
      lLower.includes("role overview") ||
      lLower.includes("duties")
    ) {
      inSection = true;
      continue;
    }
    if (inSection && (lLower.includes("requirement") || lLower.includes("qualification") || lLower.includes("benefits"))) {
      inSection = false;
      continue;
    }
    if (inSection) {
      const cleaned = line.replace(/^[-*•\d.]+\s*/, "").trim();
      if (cleaned.length > 15 && cleaned.length < 200) {
        responsibilities.push(cleaned);
      }
    }
  }

  return responsibilities.slice(0, 6);
}

export function extractProjectExpectations(text: string): string[] {
  const lower = text.toLowerCase();
  const expectations: string[] = [];

  if (lower.includes("full-stack") || lower.includes("end-to-end")) {
    expectations.push("End-to-end full-stack feature delivery with production deployment");
  }
  if (lower.includes("test") || lower.includes("ci/cd") || lower.includes("automated")) {
    expectations.push("Automated unit and integration testing with continuous integration");
  }
  if (lower.includes("scale") || lower.includes("high-throughput") || lower.includes("distributed")) {
    expectations.push("Scalable system architecture and resilient API design");
  }
  if (lower.includes("responsive") || lower.includes("performance") || lower.includes("accessible")) {
    expectations.push("High-performance responsive UI complying with web standards");
  }

  if (expectations.length === 0) {
    expectations.push("Working software repository demonstrating clean architecture and git discipline");
  }

  return expectations;
}

/**
 * Parses raw text or structured job input into a comprehensive TargetRoleProfile.
 */
export function extractTargetRoleProfile(params: {
  title: string;
  description?: string;
  skillsText?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  experienceYears?: number;
}): TargetRoleProfile {
  const title = params.title || "Software Engineer";
  const desc = params.description || "";
  const fullText = `${title}\n${desc}\n${params.skillsText || ""}`;

  const seniority = extractSeniority(fullText, title);
  const experienceYearsRequired = params.experienceYears ?? extractExperienceYears(fullText);
  const educationRequirements = extractEducationRequirements(fullText);
  const responsibilities = extractResponsibilities(desc);
  const projectExpectations = extractProjectExpectations(fullText);

  // Derive skills from dictionary and curated role profiles
  const rawExplicitReq = params.requiredSkills || [];
  const rawExplicitPref = params.preferredSkills || [];

  const requiredSkillsSet = new Set<string>();
  const preferredSkillsSet = new Set<string>();

  for (const s of rawExplicitReq) {
    const norm = normalizeSkillName(s);
    if (norm) requiredSkillsSet.add(norm);
  }
  for (const s of rawExplicitPref) {
    const norm = normalizeSkillName(s);
    if (norm) preferredSkillsSet.add(norm);
  }

  // Check role profiles from resume dictionary
  const titleNorm = normalizeText(title);
  for (const [key, profileSkills] of Object.entries(ROLE_PROFILES)) {
    if (titleNorm.includes(key)) {
      for (const skill of profileSkills) {
        const norm = normalizeSkillName(skill);
        if (norm) requiredSkillsSet.add(norm);
      }
    }
  }

  // If skills text was provided (comma separated)
  if (params.skillsText) {
    const tokens = params.skillsText.split(/[,;\n]/).map((t) => t.trim());
    for (const tok of tokens) {
      const norm = normalizeSkillName(tok);
      if (norm) requiredSkillsSet.add(norm);
    }
  }

  // Scan description for mentions of recognized tech
  const descLower = normalizeText(desc);
  for (const skill of SKILLS) {
    const forms = [skill, ...Object.keys(ALIASES).filter((a) => ALIASES[a] === skill)];
    for (const form of forms) {
      const re = new RegExp(`(^|[^a-z0-9+])${form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+]|$)`, "i");
      if (re.test(descLower)) {
        const canon = normalizeSkillName(skill);
        if (!requiredSkillsSet.has(canon)) {
          preferredSkillsSet.add(canon);
        }
        break;
      }
    }
  }

  // Ensure reasonable baseline if description was very sparse
  if (requiredSkillsSet.size === 0) {
    if (titleNorm.includes("front") || titleNorm.includes("react") || titleNorm.includes("ui")) {
      requiredSkillsSet.add("react");
      requiredSkillsSet.add("javascript");
      requiredSkillsSet.add("typescript");
      preferredSkillsSet.add("tailwind");
      preferredSkillsSet.add("next.js");
    } else if (titleNorm.includes("back") || titleNorm.includes("node") || titleNorm.includes("python")) {
      requiredSkillsSet.add("node");
      requiredSkillsSet.add("sql");
      requiredSkillsSet.add("docker");
      preferredSkillsSet.add("redis");
    } else {
      requiredSkillsSet.add("javascript");
      requiredSkillsSet.add("git");
      preferredSkillsSet.add("docker");
    }
  }

  // Resolve tools
  const toolsSet = new Set<string>();
  const techArchetype = titleNorm.includes("front")
    ? "frontend"
    : titleNorm.includes("back")
    ? "backend"
    : titleNorm.includes("devops")
    ? "devops"
    : titleNorm.includes("data")
    ? "data"
    : "fullstack";

  const defaultTools = DEFAULT_ROLE_TOOLING[techArchetype] || DEFAULT_ROLE_TOOLING.fullstack;
  for (const t of defaultTools) {
    toolsSet.add(formatSkillDisplay(t));
  }

  return {
    title,
    seniority,
    experienceYearsRequired,
    educationRequirements,
    requiredSkills: Array.from(requiredSkillsSet).map(formatSkillDisplay),
    preferredSkills: Array.from(preferredSkillsSet)
      .filter((s) => !requiredSkillsSet.has(s))
      .map(formatSkillDisplay),
    tools: Array.from(toolsSet),
    responsibilities,
    projectExpectations,
    rawText: fullText,
  };
}
