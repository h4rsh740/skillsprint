// Local job-keyword extraction and comparison.
//
// Extracts the set of target keywords from a job profile (title, description
// and an explicit skills list), then compares them against the resume text to
// produce matched / missing / weak / recommended sets — broken down by
// category. Deterministic, no external APIs.

import {
  SKILLS,
  SKILL_SET,
  ROLE_PROFILES,
  CATEGORIES,
  STOPWORDS,
  ALIASES,
} from "./skillDictionary";
import {
  normalizeText,
  canonicalize,
  keywordPresence,
  extractSkillsFromText,
} from "./keywordNormalizer";
import type { JobProfile, KeywordAnalysis, ResumeData } from "./types";

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

// Resolve a free-form title to a curated role profile, if one matches.
function resolveRoleProfile(title: string): string[] | null {
  const t = normalizeText(title);
  for (const key of Object.keys(ROLE_PROFILES)) {
    if (t.includes(key)) return ROLE_PROFILES[key];
  }
  return null;
}

// Scan free text for any dictionary skills (used for the job description).
function extractFromDescription(text: string): string[] {
  const lower = normalizeText(text);
  const hits: string[] = [];
  for (const canonical of SKILLS) {
    const forms = [canonical, ...Object.keys(ALIASES).filter((a) => ALIASES[a] === canonical)];
    for (const form of forms) {
      const re = new RegExp(`(^|[^a-z0-9+])(${form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})([^a-z0-9+]|$)`, "i");
      if (re.test(lower)) {
        hits.push(canonical);
        break;
      }
    }
  }
  return dedupe(hits);
}

// Extract candidate keywords from the explicit skills box (comma / newline separated).
function extractFromSkillsBox(skillsText: string): string[] {
  const raw = (skillsText || "")
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const token of raw) {
    const canon = canonicalize(token);
    if (SKILL_SET.has(canon)) out.push(canon);
    else if (token.length >= 2) out.push(normalizeText(token)); // keep unknown but plausible custom keywords
  }
  return dedupe(out);
}

// Tokenize the description for "custom" (non-dictionary) keywords worth tracking.
function extractCustomTokens(text: string): string[] {
  const lower = normalizeText(text);
  const tokens = lower.match(/[a-z][a-z0-9+#]+(?:\.[a-z]+)?/g) || [];
  const counts = new Map<string, number>();
  for (const tok of tokens) {
    if (STOPWORDS.has(tok)) continue;
    if (tok.length < 3) continue;
    if (SKILL_SET.has(tok) || ALIASES[tok]) continue;
    counts.set(tok, (counts.get(tok) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, c]) => c >= 2)
    .map(([t]) => t)
    .slice(0, 20);
}

export function buildTargetKeywords(job: JobProfile): string[] {
  const roleKeywords = resolveRoleProfile(job.title) || [];
  const descKeywords = extractFromDescription(job.description);
  const boxKeywords = extractFromSkillsBox(job.skillsText);
  const custom = extractCustomTokens(job.description).filter(
    (c) => !roleKeywords.includes(c) && !descKeywords.includes(c) && !boxKeywords.includes(c)
  );
  return dedupe([...roleKeywords, ...boxKeywords, ...descKeywords, ...custom]).slice(0, 40);
}

// Compare target keywords against the resume; produce a full KeywordAnalysis.
export function analyzeKeywords(resume: ResumeData, job: JobProfile): KeywordAnalysis {
  const target = buildTargetKeywords(job);
  const resumeText = resume.rawText;

  const matched: string[] = [];
  const missing: string[] = [];
  const weak: string[] = [];

  for (const kw of target) {
    const presence = keywordPresence(resumeText, kw);
    if (presence.exact) matched.push(kw);
    else if (presence.alias) weak.push(kw);
    else missing.push(kw);
  }

  // Recommended = missing keywords framed as suggestions (never fabricated as existing).
  const recommended = [...missing];

  const byCategory: Record<string, { matched: string[]; missing: string[] }> = {};
  for (const [cat, skills] of Object.entries(CATEGORIES)) {
    const inCat = (k: string) => skills.includes(k);
    byCategory[cat] = {
      matched: matched.filter(inCat),
      missing: missing.filter(inCat),
    };
  }

  return {
    targetKeywords: target,
    matched,
    missing,
    weak,
    recommended,
    byCategory,
  };
}

// Re-export for convenience.
export { extractSkillsFromText };
