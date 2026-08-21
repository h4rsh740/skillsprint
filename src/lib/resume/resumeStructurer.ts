// Heuristic, fully local resume structurer.
//
// Turns raw extracted resume text into a structured ResumeData object. This is
// best-effort and DETERMINISTIC. It NEVER invents companies, degrees, dates or
// skills — anything not present in the text is simply omitted.

import { extractSkillsFromText } from "./keywordNormalizer";
import { normalizeText } from "./keywordNormalizer";
import { SKILL_SET, ALIASES } from "./skillDictionary";
import type { ResumeData, PersonalInfo, ExperienceEntry, ProjectEntry, EducationEntry, CertificationEntry } from "./types";

const HEADING_PATTERNS: Record<string, RegExp> = {
  summary: /^\s*(?:[\d.-]+\s*|[ivxIVX]+\.\s*)?(?:professional\s+|career\s+|personal\s+)?(?:summary|profile|objective|overview|about\s*me|statement)\s*$/i,
  experience: /^\s*(?:[\d.-]+\s*|[ivxIVX]+\.\s*)?(?:work\s+|professional\s+|employment\s+|career\s+|relevant\s+)?(?:experience|history|employment|positions?\s*held|background)\s*$/i,
  education: /^\s*(?:[\d.-]+\s*|[ivxIVX]+\.\s*)?(?:education|academic\s+background|academics|qualifications?|schooling)\s*$/i,
  skills: /^\s*(?:[\d.-]+\s*|[ivxIVX]+\.\s*)?(?:technical\s+|core\s+|key\s+|professional\s+)?(?:skills|proficiencies|technologies|tech\s*stack|expertise|tools?|programming\s*languages?)\s*$/i,
  projects: /^\s*(?:[\d.-]+\s*|[ivxIVX]+\.\s*)?(?:personal\s+|academic\s+|key\s+|side\s+|selected\s+)?(?:projects?|portfolio|accomplishments)\s*$/i,
  certifications: /^\s*(?:[\d.-]+\s*|[ivxIVX]+\.\s*)?(?:certifications?|certificates?|credentials?|courses|licenses)\s*$/i,
  achievements: /^\s*(?:[\d.-]+\s*|[ivxIVX]+\.\s*)?(?:achievements?|awards?|honors?|recognitions?|accomplishments?)\s*$/i,
};

// Bullet indicators: -, *, •, –, ·, ▸, ▶, ○, ◦, →, » + numbered lists
const BULLET_RE = /^\s*([-*•–·▸▶○◦→»]|\d+[.):]|[a-z][.)])\s+/;
const YEAR_RANGE_RE = /\b(19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|present|current|now|ongoing|till date|to date)\b/i;
const ROLE_WORD_RE = /\b(engineer|developer|intern|analyst|designer|manager|consultant|architect|lead|programmer|administrator|specialist|researcher|devops|scientist|technician|founder|co-founder|director)\b/i;

function cleanLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/[\u00a0\u2009\u200a]/g, " ").trim())
    .filter((l) => l.length > 0);
}

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return false;
  if (/[.!?]$/.test(trimmed)) return false;

  // Headings do not contain role/company separator punctuation like hyphens, pipes, commas, or email @ signs
  if (/[-|,@#]/.test(trimmed)) return false;

  // A heading should not contain common prose verbs or prepositions that imply it's a bullet/sentence
  if (/\b(developed|built|managed|created|designed|implemented|assisted|worked|using|with|from|through)\b/i.test(trimmed)) return false;

  // Direct match in case-insensitive check
  const lower = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const KNOWN_WORDS = [
    "skills", "technical skills", "experience", "work experience", "professional experience",
    "projects", "education", "certifications", "achievements", "awards", "summary",
    "professional summary", "about me", "profile", "objective", "career objective",
    "internships", "internship", "activities", "extracurriculars", "courses",
    "tools", "technologies", "tech stack", "languages", "programming languages",
    "contact", "references", "publications", "interests", "hobbies", "employment history",
    "employment", "academic background", "credentials", "projects portfolio",
  ];

  return KNOWN_WORDS.some((h) => lower === h || lower.startsWith(h + " ") || lower.endsWith(" " + h));
}

function isBullet(line: string): boolean {
  return BULLET_RE.test(line);
}

function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseContact(text: string): PersonalInfo {
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phoneMatch = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  const linkedinMatch = text.match(/linkedin\.com\/[\w-]+/i);
  const locationMatch = text.match(/(?:[A-Z][a-z]+(?:[, ]+[A-Z][a-z]+){1,2})/);
  return {
    name: "",
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0].trim() : "",
    github: githubMatch ? githubMatch[0] : undefined,
    linkedin: linkedinMatch ? linkedinMatch[0] : undefined,
    location: locationMatch ? locationMatch[0] : undefined,
  };
}

function parseName(lines: string[], contact: PersonalInfo): string {
  for (const line of lines.slice(0, 6)) {
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 40) continue;
    if (/\d/.test(trimmed)) continue;
    if (/@|http|github|linkedin/.test(trimmed.toLowerCase())) continue;
    if (/[.!?:]$/.test(trimmed)) continue;
    const words = trimmed.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) return trimmed;
  }
  return contact.email ? contact.email.split("@")[0].replace(/[._]/g, " ") : "";
}

// A line is a section-entry header if it is not a bullet and looks like a
// "Company - Role" or date line (so multiple entries can be split even when
// the resume has no blank lines between them).
function isHeaderLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 70 || isBullet(t)) return false;
  if (YEAR_RANGE_RE.test(t)) return true;
  if (ROLE_WORD_RE.test(t) && /[-–,|]/.test(t)) return true;
  return false;
}

// Build bullet lists from a section's content lines. Splits into entries by
// blank lines first, then by header lines within each block.
function buildEntries(content: string[]): { heading: string; bullets: string[] }[] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of content) {
    if (line.trim() === "") {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const entries: { heading: string; bullets: string[] }[] = [];
  for (const block of blocks) {
    let entry: { heading: string; bullets: string[] } | null = null;
    for (const line of block) {
      if (isBullet(line)) {
        if (!entry) entry = { heading: "", bullets: [] };
        entry.bullets.push(line.replace(BULLET_RE, "").trim());
      } else if (isHeaderLine(line)) {
        if (entry) {
          if (entry.bullets.length === 0) {
            // Merge consecutive header lines (e.g. "Company - Role" + date).
            entry.heading = `${entry.heading} ${line}`.trim();
          } else {
            entries.push(entry);
            entry = { heading: line, bullets: [] };
          }
        } else {
          entry = { heading: line, bullets: [] };
        }
      } else {
        if (!entry) entry = { heading: line, bullets: [] };
        else if (entry.bullets.length === 0) entry.heading = `${entry.heading} ${line}`.trim();
        // non-bullet detail under an entry with bullets is ignored (header note)
      }
    }
    if (entry) entries.push(entry);
  }

  // Fallback: if nothing was recognized as bullets, treat whole block as prose.
  if (entries.length === 0 && blockHasProse(blocks)) {
    const prose = blocks.flat().filter((l) => !isHeaderLine(l)).join(" ");
    const sentences = splitSentences(prose).slice(0, 8);
    if (sentences.length) entries.push({ heading: blocks.flat().find((l) => isHeaderLine(l)) || "", bullets: sentences });
  }

  return entries.filter((e) => e.heading || e.bullets.length);
}

function blockHasProse(blocks: string[][]): boolean {
  return blocks.some((b) => b.length > 0);
}

function splitSkills(content: string[]): string[] {
  const tokens: string[] = [];
  for (const line of content) {
    const cleaned = line.replace(BULLET_RE, "");
    // Split on commas, semicolons, pipes, newlines, and " / ".
    const parts = cleaned.split(/[,;|/]|\s{2,}/).map((s) => s.trim()).filter(Boolean);
    for (let p of parts) {
      p = p.replace(/\.$/, "").trim();
      if (!p) continue;
      // Keep short tokens only (skills are rarely long phrases).
      if (p.length > 40) {
        // Possibly a sentence; fall back to dictionary scan of the line.
        for (const s of extractSkillsFromText(p)) tokens.push(s);
        continue;
      }
      const canon = normalizeText(p);
      if (SKILL_SET.has(canon) || ALIASES[canon]) tokens.push(canon);
      else tokens.push(canon);
    }
  }
  // De-duplicate preserving order.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export function structureResume(rawText: string): ResumeData {
  const lines = cleanLines(rawText);
  const fullText = lines.join("\n");
  const contact = parseContact(fullText);
  contact.name = parseName(lines, contact);

  // Find section boundaries.
  const sectionIndices: { key: string; index: number }[] = [];
  lines.forEach((line, i) => {
    for (const [key, re] of Object.entries(HEADING_PATTERNS)) {
      if (re.test(line) && looksLikeHeading(line)) {
        sectionIndices.push({ key, index: i });
        break;
      }
    }
  });
  sectionIndices.sort((a, b) => a.index - b.index);

  function sectionContent(key: string): string[] {
    const idx = sectionIndices.findIndex((s) => s.key === key);
    if (idx === -1) return [];
    const start = sectionIndices[idx].index + 1;
    const end = idx + 1 < sectionIndices.length ? sectionIndices[idx + 1].index : lines.length;
    return lines.slice(start, end);
  }

  const summaryContent = sectionContent("summary");
  const summary = summaryContent.join(" ").replace(/\s+/g, " ").trim();

  const experienceRaw = sectionContent("experience");
  const experience: ExperienceEntry[] = buildEntries(experienceRaw).map((e, i) => ({
    id: `exp-${i}`,
    heading: e.heading,
    bullets: e.bullets,
  }));

  const projectsRaw = sectionContent("projects");
  const projects: ProjectEntry[] = buildEntries(projectsRaw).map((e, i) => ({
    id: `proj-${i}`,
    heading: e.heading,
    bullets: e.bullets,
  }));

  const educationRaw = sectionContent("education");
  const education: EducationEntry[] = educationRaw.length
    ? educationRaw.map((l, i) => ({ id: `edu-${i}`, text: l.replace(BULLET_RE, "").trim() }))
    : [];

  const certRaw = sectionContent("certifications");
  const certifications: CertificationEntry[] = certRaw.length
    ? certRaw.map((l, i) => ({ id: `cert-${i}`, text: l.replace(BULLET_RE, "").trim() }))
    : [];

  const achRaw = sectionContent("achievements");
  const achievements: string[] = achRaw.length
    ? achRaw.map((l) => l.replace(BULLET_RE, "").trim()).filter(Boolean)
    : [];

  let skills = splitSkills(sectionContent("skills"));
  if (skills.length === 0) {
    // Fallback: pull dictionary skills from the whole document.
    skills = extractSkillsFromText(fullText);
  }

  const sectionsPresent: Record<string, boolean> = {
    summary: summaryContent.length > 0 && summary.length > 10,
    experience: experience.length > 0,
    education: education.length > 0,
    skills: skills.length > 0,
    projects: projects.length > 0,
    certifications: certifications.length > 0,
    contact:
      Boolean(contact.email) ||
      Boolean(contact.phone) ||
      Boolean(contact.linkedin) ||
      Boolean(contact.github),
  };

  // Section order as it appeared in the original document.
  const sectionOrder = sectionIndices.map((s) => s.key);

  return {
    personalInfo: contact,
    summary,
    skills,
    experience,
    projects,
    education,
    certifications,
    achievements,
    sectionsPresent,
    sectionOrder,
    rawText,
  };
}
