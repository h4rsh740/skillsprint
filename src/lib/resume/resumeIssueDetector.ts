// Local resume problem detector.
//
// Inspects the structured resume plus the ATS result and returns a list of
// issues, each tagged with a severity (Critical / High / Medium / Low) and a
// concrete "why" + "recommended change". Deterministic.

import { STRONG_VERBS, WEAK_VERBS, escapeRegExp } from "./skillDictionary";
import type { ResumeData, JobProfile, KeywordAnalysis, ATSScore, ResumeIssue } from "./types";

const STRONG_VERB_RE = new RegExp(`^(${STRONG_VERBS.map(escapeRegExp).join("|")})\\b`, "i");
const WEAK_VERB_RE = new RegExp(`^(${WEAK_VERBS.map(escapeRegExp).join("|")})\\b`, "i");
const GENERIC_OBJECTIVE_RE = /\b(seeking|opportunity|looking for a|career goal|to obtain|desire)\b/i;

function allBullets(resume: ResumeData): string[] {
  const out: string[] = [];
  resume.experience.forEach((e) => out.push(...e.bullets));
  resume.projects.forEach((p) => out.push(...p.bullets));
  return out.filter((b) => b.trim().length > 0);
}

function isDeveloperRole(job: JobProfile): boolean {
  const t = job.title.toLowerCase();
  return /\b(develop|engineer|programmer|dev|sde|architect|tech)\b/.test(t);
}

export function detectIssues(
  resume: ResumeData,
  job: JobProfile,
  keywords: KeywordAnalysis,
  score: ATSScore
): ResumeIssue[] {
  const issues: ResumeIssue[] = [];
  const bullets = allBullets(resume);
  const push = (
    severity: ResumeIssue["severity"],
    title: string,
    why: string,
    recommendation: string,
    section?: string
  ) => issues.push({ id: `issue-${issues.length}`, severity, title, why, recommendation, section });

  const weakBullets = bullets.filter((b) => WEAK_VERB_RE.test(b.trim())).length;
  const strongBullets = bullets.filter((b) => STRONG_VERB_RE.test(b.trim())).length;
  const longBullets = bullets.filter((b) => b.trim().length > 240).length;
  const quantified = score.categories.find((c) => c.key === "quantified")?.score ?? 0;
  const structure = score.categories.find((c) => c.key === "resumeStructure")?.score ?? 0;

  // Contact
  if (!resume.personalInfo.email && !resume.personalInfo.phone) {
    push("Critical", "Missing contact information", "Recruiters and ATS cannot reach you without contact details.", "Add a professional email and phone number near the top of the resume.", "Contact");
  } else if (!resume.personalInfo.email || !resume.personalInfo.phone) {
    push("High", "Incomplete contact information", "Missing email or phone reduces recruiter reachability.", "Include both a professional email and a phone number.", "Contact");
  }

  // GitHub / portfolio for dev roles
  if (isDeveloperRole(job) && !resume.personalInfo.github && !resume.personalInfo.linkedin) {
    push("Medium", "No GitHub or LinkedIn link", "Developer roles expect publicly verifiable work; a missing link is a missed signal.", "Add your GitHub and/or LinkedIn URL to the contact section.", "Contact");
  }

  // Summary
  if (!resume.sectionsPresent.summary || !resume.summary) {
    push("High", "Missing professional summary", "A summary gives recruiters and ATS an immediate snapshot of your fit.", "Add a 2-3 sentence professional summary that names your role and top skills.", "Summary");
  } else if (resume.summary.length < 120) {
    push("Medium", "Weak professional summary", "A very short summary misses the chance to surface target keywords.", "Expand the summary to 2-3 sentences covering your role, key skills and impact areas.", "Summary");
  } else if (GENERIC_OBJECTIVE_RE.test(resume.summary)) {
    push("Low", "Generic objective-style summary", "Objective statements focus on what you want rather than what you offer.", "Reframe the summary around the value and outcomes you deliver for employers.", "Summary");
  }

  // Keyword gaps
  const keywordCoverage = keywords.targetKeywords.length
    ? keywords.matched.length / keywords.targetKeywords.length
    : 1;
  if (keywords.missing.length >= Math.max(3, keywords.targetKeywords.length * 0.5)) {
    push(
      "High",
      "Major target-keyword gaps",
      `Only ${keywords.matched.length} of ${keywords.targetKeywords.length} target keywords appear in the resume.`,
      `Incorporate the missing keywords where you have genuine experience: ${keywords.missing.slice(0, 6).join(", ")}.`,
      "Keywords"
    );
  } else if (keywords.missing.length > 0) {
    push(
      "Medium",
      "Missing target keywords",
      `${keywords.missing.length} relevant keyword(s) from the job description are absent.`,
      `Where you have the experience, add: ${keywords.missing.slice(0, 6).join(", ")}.`,
      "Keywords"
    );
  }

  // Skill mismatch
  if (keywordCoverage < 0.3 && keywords.targetKeywords.length > 0) {
    push("High", "Skill mismatch with target role", "The resume's skills barely overlap with the target job profile.", "Target the resume to the role, or consider building the missing skills before applying.", "Skills");
  }

  // Weak bullets / passive language
  if (bullets.length > 0 && weakBullets / bullets.length > 0.3) {
    push("Medium", "Passive or weak language", `${weakBullets} bullet(s) begin with weak verbs (e.g. "worked on", "made").`, 'Start bullets with strong action verbs like "Developed", "Built", "Optimized".', "Experience");
  } else if (strongBullets === 0 && bullets.length > 0) {
    push("Medium", "No action-oriented bullets", "None of the bullets lead with a strong achievement verb.", 'Rewrite bullets to start with verbs such as "Engineered", "Delivered", "Automated".', "Experience");
  }

  // Quantified achievements
  if (quantified < 3) {
    push("High", "Missing measurable achievements", "Without metrics, impact is hard for recruiters and ATS to gauge.", "Add real numbers (%, scale, time saved) to at least 2-3 bullets. Never invent metrics.", "Experience");
  }

  // Structure
  if (structure < 6) {
    push("Medium", "Weak or non-standard section structure", "Missing or non-standard headings hurt ATS parsing and scannability.", "Use clear headings: Professional Summary, Technical Skills, Experience, Projects, Education.", "Structure");
  }

  // Projects
  if (resume.projects.length === 0) {
    push("Medium", "No projects section", "Projects prove applied skills, especially for students and career switchers.", "Add 2-3 projects with the tech stack and your specific contribution.", "Projects");
  } else {
    const weakProjects = resume.projects.filter((p) => p.bullets.length === 0 || p.bullets.join(" ").length < 40).length;
    if (weakProjects > 0) {
      push("Medium", "Thin project descriptions", "Some projects lack bullets describing your contribution and impact.", "Add 2-3 outcome-focused bullets per project describing what you built and how.", "Projects");
    }
  }

  // Long bullets
  if (longBullets > 0) {
    push("Low", "Overly long bullet points", `${longBullets} bullet(s) are very long and hard to scan.`, "Break long bullets into shorter, one-idea-per-line statements.", "Experience");
  }

  // Repeated words
  const tokenCounts = new Map<string, number>();
  for (const b of bullets) {
    for (const w of b.toLowerCase().match(/[a-z]{4,}/g) || []) tokenCounts.set(w, (tokenCounts.get(w) || 0) + 1);
  }
  const repeated = Array.from(tokenCounts.entries()).filter(([, c]) => c >= 4).map(([w]) => w);
  if (repeated.length > 0) {
    push("Low", "Repeated words across bullets", `Words like "${repeated.slice(0, 3).join(", ")}" recur heavily, reducing variety.`, "Vary vocabulary; use synonyms and different action verbs to keep bullets fresh.", "Experience");
  }

  // Irrelevant skill breadth vs match
  if (resume.skills.length >= 12 && keywordCoverage < 0.4) {
    push("Low", "Skills not tailored to the role", "Many listed skills are unrelated to the target role, diluting relevance.", "Prioritize skills that match the job description; group unrelated ones lower.", "Skills");
  }

  return issues;
}
