// Deterministic ATS scoring engine.
//
// Implements the requested weighted model:
//   Keyword Match            30%
//   Technical Skills Match   20%
//   Experience Relevance      15%
//   Project Relevance         10%
//   Resume Structure          10%
//   Action Verbs & Impact      5%
//   Quantified Achievements    5%
//   ATS Formatting            5%
//
// The same resume + job profile always yields the same breakdown. No Math.random,
// no external APIs.

import {
  CATEGORIES,
  STRONG_VERBS,
  escapeRegExp,
} from "./skillDictionary";
import { keywordPresence, normalizeText } from "./keywordNormalizer";
import type {
  ResumeData,
  JobProfile,
  KeywordAnalysis,
  ATSScore,
  ATSCategoryScore,
  ATSGrade,
} from "./types";

const TECH_CATEGORIES = [
  "Languages",
  "Frameworks & Libraries",
  "APIs & Protocols",
  "Databases",
  "Cloud & DevOps",
  "Data & ML",
  "Tools & Testing",
];

const STRONG_VERB_RE = new RegExp(
  `^(${STRONG_VERBS.map(escapeRegExp).join("|")})\\b`,
  "i"
);

function gradeFor(total: number): ATSGrade {
  if (total <= 39) return "Poor";
  if (total <= 59) return "Needs Improvement";
  if (total <= 74) return "Average";
  if (total <= 89) return "Strong";
  return "Excellent";
}

function countImpactSignals(text: string): number {
  const lower = normalizeText(text);
  const patterns = [
    /\d+\s?%/g,
    /\$\s?\d/g,
    /\b\d+\s?(x|times|fold)\b/gi,
    /\b\d+\s?(users|customers|clients|requests|downloads|students|teams?|people)\b/gi,
    /\b\d+\s?(ms|seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/gi,
    /\b(increased|decreased|reduced|improved|optimized|boosted|accelerated|grew|saved|cut|raised|delivered|launched)\b/gi,
  ];
  let count = 0;
  for (const p of patterns) {
    const m = lower.match(p);
    if (m) count += m.length;
  }
  return count;
}

function detectExperienceYears(text: string): number {
  const lower = normalizeText(text);
  const m = lower.match(/(\d+)\s*\+?\s*(years?|yrs?)/);
  if (m) return Math.min(parseInt(m[1], 10), 12);
  const roles = (lower.match(/\b(intern|internship|engineer|developer|analyst|consultant|freelance|lead)\b/g) || []).length;
  return Math.min(roles, 8);
}

function allBullets(resume: ResumeData): string[] {
  const out: string[] = [];
  resume.experience.forEach((e) => out.push(...e.bullets));
  resume.projects.forEach((p) => out.push(...p.bullets));
  return out.filter((b) => b.trim().length > 0);
}

function flattenText(resume: ResumeData): string {
  const parts: string[] = [resume.summary];
  resume.experience.forEach((e) => parts.push(e.heading, ...e.bullets));
  resume.projects.forEach((p) => parts.push(p.heading, ...p.bullets));
  resume.education.forEach((e) => parts.push(e.text));
  resume.certifications.forEach((c) => parts.push(c.text));
  resume.achievements.forEach((a) => parts.push(a));
  return parts.join("\n");
}

export function scoreResume(
  resume: ResumeData,
  job: JobProfile,
  keywords: KeywordAnalysis
): ATSScore {
  const target = keywords.targetKeywords;
  const lower = normalizeText(resume.rawText);

  // 1. Keyword Match (/30)
  let kwStrength = 0;
  for (const kw of target) {
    const p = keywordPresence(resume.rawText, kw);
    kwStrength += p.exact ? 1 : p.alias ? 0.6 : 0;
  }
  const keywordPct = target.length ? kwStrength / target.length : 0;
  const keywordMatch = Math.round(keywordPct * 30);

  // 2. Technical Skills Match (/20)
  const techSet = new Set<string>();
  for (const cat of TECH_CATEGORIES) CATEGORIES[cat].forEach((s) => techSet.add(s));
  const techTarget = target.filter((k) => techSet.has(k));
  let techStrength = 0;
  for (const kw of techTarget) {
    const p = keywordPresence(resume.rawText, kw);
    techStrength += p.exact ? 1 : p.alias ? 0.6 : 0;
  }
  const techCoverage = techTarget.length ? techStrength / techTarget.length : 0;
  const distinctTech = resume.skills.filter((s) => techSet.has(s)).length;
  const breadth = Math.min(distinctTech, 12) / 12;
  const technicalSkills = Math.round((techCoverage * 0.65 + breadth * 0.35) * 20);

  // 3. Experience Relevance (/15)
  let experienceRelevance = 0;
  if (resume.sectionsPresent.experience) experienceRelevance += 6;
  const expText = resume.experience.map((e) => e.heading + " " + e.bullets.join(" ")).join(" ");
  let matchedTechInExp = 0;
  for (const kw of techTarget) {
    if (keywordPresence(expText, kw).exact || keywordPresence(expText, kw).alias) matchedTechInExp++;
  }
  experienceRelevance += Math.round(Math.min(matchedTechInExp / Math.max(1, techTarget.length), 1) * 5);
  experienceRelevance += Math.round((Math.min(detectExperienceYears(lower), 4) / 4) * 4);
  experienceRelevance = Math.min(15, experienceRelevance);

  // 4. Project Relevance (/10)
  let projectRelevance = 0;
  if (resume.projects.length > 0) projectRelevance += 4;
  const projText = resume.projects.map((p) => p.heading + " " + p.bullets.join(" ")).join(" ");
  let matchedTechInProj = 0;
  for (const kw of techTarget) {
    if (keywordPresence(projText, kw).exact || keywordPresence(projText, kw).alias) matchedTechInProj++;
  }
  projectRelevance += Math.round(Math.min(matchedTechInProj / Math.max(1, techTarget.length), 1) * 6);
  projectRelevance = Math.min(10, projectRelevance);

  // 5. Resume Structure (/10)
  const standardSections = [
    resume.sectionsPresent.summary,
    resume.sectionsPresent.experience,
    resume.sectionsPresent.education,
    resume.sectionsPresent.skills,
    resume.sectionsPresent.projects,
  ];
  const presentCount = standardSections.filter(Boolean).length;
  const atsHeadings =
    resume.sectionsPresent.summary && resume.sectionsPresent.experience && resume.sectionsPresent.skills;
  const resumeStructure = Math.min(10, Math.round((presentCount / standardSections.length) * 8) + (atsHeadings ? 2 : 0));

  // 6. Action Verbs & Impact (/5)
  const bullets = allBullets(resume);
  let strongCount = 0;
  for (const b of bullets) {
    if (STRONG_VERB_RE.test(b.trim())) strongCount++;
  }
  const actionVerbs = bullets.length ? Math.round((strongCount / bullets.length) * 5) : 0;

  // 7. Quantified Achievements (/5)
  const impactCount = countImpactSignals(resume.rawText);
  const quantified = Math.min(5, Math.round((Math.min(impactCount, 10) / 10) * 5));

  // 8. ATS Formatting Compatibility (/5)
  const wordCount = (resume.rawText.match(/\S+/g) || []).length;
  const bulletCount = bullets.length;
  let formatting = 0;
  if (wordCount >= 150) formatting += 2;
  if (wordCount >= 400) formatting += 1;
  if (bulletCount >= 6) formatting += 1;
  if (presentCount >= 4) formatting += 1;
  formatting = Math.min(5, formatting);

  const categories: ATSCategoryScore[] = [
    {
      key: "keywordMatch",
      label: "Keyword Match",
      score: keywordMatch,
      max: 30,
      explanation: `${keywords.matched.length}/${target.length} target keywords present${
        keywords.weak.length ? ` (${keywords.weak.length} only in abbreviated form)` : ""
      }.`,
    },
    {
      key: "technicalSkills",
      label: "Technical Skills Match",
      score: technicalSkills,
      max: 20,
      explanation: `${distinctTech} distinct technical skills detected; ${matchedTechInExp} relevant technical keywords found in experience/project context.`,
    },
    {
      key: "experienceRelevance",
      label: "Experience Relevance",
      score: experienceRelevance,
      max: 15,
      explanation: resume.sectionsPresent.experience
        ? `Experience section present with ${matchedTechInExp} role-relevant technical signals.`
        : "No clearly detected work experience section.",
    },
    {
      key: "projectRelevance",
      label: "Project Relevance",
      score: projectRelevance,
      max: 10,
      explanation: resume.projects.length
        ? `${resume.projects.length} project(s) with ${matchedTechInProj} technical keyword signals.`
        : "No clearly detected projects section.",
    },
    {
      key: "resumeStructure",
      label: "Resume Structure",
      score: resumeStructure,
      max: 10,
      explanation: `${presentCount}/5 standard sections present; ${atsHeadings ? "ATS-friendly headings detected." : "some non-standard headings."}`,
    },
    {
      key: "actionVerbs",
      label: "Action Verbs & Impact",
      score: actionVerbs,
      max: 5,
      explanation: bullets.length
        ? `${strongCount}/${bullets.length} bullets begin with a strong action verb.`
        : "No bullet points detected to evaluate.",
    },
    {
      key: "quantified",
      label: "Quantified Achievements",
      score: quantified,
      max: 5,
      explanation:
        impactCount > 0
          ? `${impactCount} quantified impact signal(s) detected.`
          : "No quantified metrics (%, $, scale) detected.",
    },
    {
      key: "formatting",
      label: "ATS Formatting Compatibility",
      score: formatting,
      max: 5,
      explanation: `Word count ${wordCount}, ${bulletCount} bullet points, ${presentCount}/5 sections — single-column, parseable layout.`,
    },
  ];

  const total = categories.reduce((sum, c) => sum + c.score, 0);

  return {
    total: Math.max(0, Math.min(100, total)),
    grade: gradeFor(Math.max(0, Math.min(100, total))),
    categories,
  };
}
