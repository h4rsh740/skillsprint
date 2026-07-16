// Keyword normalization and presence detection.
//
// These helpers power deterministic keyword matching between the resume text
// and the target job keywords. There is no randomness: the same inputs always
// produce the same result.

import {
  SKILL_SET,
  ALIASES,
  CANONICAL_ALIASES,
  escapeRegExp,
} from "./skillDictionary";

export function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'")
    .trim();
}

// Map a raw token to its canonical skill form, or return the normalized token.
export function canonicalize(token: string): string {
  const t = normalizeText(token);
  if (SKILL_SET.has(t)) return t;
  if (ALIASES[t]) return ALIASES[t];
  return t;
}

// Returns a regex that matches any spelling (canonical or alias) of a keyword
// as a whole word/token.
function buildKeywordRegex(canonical: string): RegExp {
  const forms = CANONICAL_ALIASES[canonical] || [canonical];
  // Longest first so multi-word aliases win over single-word ones.
  const ordered = [...forms].sort((a, b) => b.length - a.length);
  const alt = ordered.map((f) => escapeRegExp(f)).join("|");
  return new RegExp(`(^|[^a-z0-9+])(${alt})([^a-z0-9+]|$)`, "i");
}

export interface KeywordPresence {
  exact: boolean; // canonical spelling present
  alias: boolean; // some alias present
}

// Detect whether a keyword (canonical) is present in the supplied text.
export function keywordPresence(text: string, canonical: string): KeywordPresence {
  const forms = CANONICAL_ALIASES[canonical] || [canonical];
  const lower = normalizeText(text);
  let exact = false;
  let alias = false;
  for (const form of forms) {
    const re = new RegExp(`(^|[^a-z0-9+])(${escapeRegExp(form)})([^a-z0-9+]|$)`, "i");
    if (re.test(lower)) {
      if (form === canonical) exact = true;
      else alias = true;
    }
  }
  return { exact, alias };
}

// Find which canonical skills from the dictionary appear in the text.
export function extractSkillsFromText(text: string): string[] {
  const lower = normalizeText(text);
  const found: string[] = [];
  for (const canonical of SKILLS_LIST) {
    if (buildKeywordRegex(canonical).test(lower)) found.push(canonical);
  }
  return found;
}

// Lazily import the SKILLS list to avoid a circular import at module load.
import { SKILLS as SKILLS_LIST } from "./skillDictionary";
