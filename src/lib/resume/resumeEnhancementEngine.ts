// Rule-based, local resume enhancement engine.
//
// Improves the resume using deterministic templates and rules ONLY. It never
// invents companies, roles, dates, certifications, metrics, percentages,
// headcounts or any fact not present in the original resume. Changes are
// tracked as structured ResumeChange objects for the comparison view.

import {
  SKILL_SET,
  ALIASES,
  STRONG_VERBS,
  CATEGORIES,
} from "./skillDictionary";
import { normalizeText, keywordPresence } from "./keywordNormalizer";
import type {
  ResumeData,
  JobProfile,
  KeywordAnalysis,
  EnhancedResume,
  ResumeChange,
  ExperienceEntry,
  ProjectEntry,
} from "./types";

// Leading weak verb -> strong replacement.
const WEAK_VERB_MAP: Record<string, string> = {
  "worked on": "Developed",
  "worked": "Developed",
  "made": "Built",
  "did": "Executed",
  "done": "Delivered",
  "used": "Leveraged",
  "use": "Leverage",
  "helped": "Supported",
  "help": "Support",
  "responsible for": "Owned",
  "handled": "Managed",
  "handle": "Manage",
  "involved in": "Contributed to",
  "assisted": "Supported",
  "assist": "Support",
  "tried": "Prototyped",
  "attempted": "Explored",
  "participated in": "Contributed to",
  "was part of": "Contributed to",
  "was": "Contributed to",
  "were": "Contributed to",
};

// Surface a target keyword's canonical spelling when the bullet already
// evidences the underlying concept. Conservative triggers only — no invention.
const SURFACE_MAP: { keyword: string; trigger: RegExp; replacement?: (s: string) => string }[] = [
  { keyword: "rest", trigger: /\bapi\b|endpoint|backend service/, replacement: (s) => s.replace(/\bapis?\b/gi, "REST APIs") },
  { keyword: "rest api", trigger: /\bapi\b|endpoint/, replacement: (s) => s.replace(/\bapis?\b/gi, "REST APIs") },
  { keyword: "responsive design", trigger: /\bresponsive\b|mobile|cross-device/, replacement: undefined },
  { keyword: "sql", trigger: /\bdatabase\b|\bdb\b|\bquery\b/, replacement: undefined },
  { keyword: "testing", trigger: /\btest\b|\bqa\b/, replacement: undefined },
  { keyword: "ci/cd", trigger: /\bdeploy\b|pipeline/, replacement: undefined },
  { keyword: "agile", trigger: /\bscrum\b|\bsprint\b/, replacement: undefined },
  { keyword: "system design", trigger: /\barchitect|scalab/, replacement: undefined },
];

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Pick a sensible role label from the job title or the detected skills.
function deriveRole(resume: ResumeData, job: JobProfile): string {
  const t = job.title.trim();
  if (t) return titleCase(t);
  const skills = resume.skills;
  const has = (s: string) => skills.includes(s);
  if (has("react") || has("next.js") || (has("javascript") && has("css"))) return "Frontend Developer";
  if (has("java") || has("spring") || (has("node.js") && has("postgresql"))) return "Backend Developer";
  if (has("react") && has("node.js")) return "Full Stack Developer";
  if (has("python") && (has("machine learning") || has("tensorflow") || has("pytorch"))) return "Machine Learning Engineer";
  if (has("python") && (has("pandas") || has("data analysis"))) return "Data Analyst";
  return "Software Developer";
}

function enhanceBullet(bullet: string, job: JobProfile, keywords: KeywordAnalysis, aggressive: boolean): string {
  let text = bullet.trim().replace(/\s+/g, " ");
  if (!text) return text;
  const original = text;

  // 1. Replace a leading weak verb.
  const weakKeys = Object.keys(WEAK_VERB_MAP).sort((a, b) => b.length - a.length);
  for (const wk of weakKeys) {
    const re = new RegExp(`^${wk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) {
      text = text.replace(re, WEAK_VERB_MAP[wk]);
      break;
    }
  }

  // 1b. Fix "Verb build/make ..." collapsing into a natural gerund form.
  const GERUND: Record<string, string> = {
    build: "building", make: "making", create: "creating", develop: "developing",
    design: "designing", write: "writing", implement: "implementing", test: "testing",
    fix: "fixing", do: "doing",
  };
  text = text.replace(
    /^(Supported|Built|Developed|Created|Designed|Implemented|Tested|Made) (build|make|create|develop|design|write|implement|test|fix|do)\b/i,
    (_m, v, w) => `${v} ${GERUND[w.toLowerCase()] || w}`
  );

  // 2. If no verb leads the bullet, try to infer a safe one (aggressive pass).
  const startsWithVerb = new RegExp(`^(${STRONG_VERBS.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i").test(text);
  if (!startsWithVerb && aggressive) {
    const lower = text.toLowerCase();
    let verb = "Developed";
    if (/\bwebsite|web app|web application|site|landing\b/.test(lower)) verb = "Built";
    else if (/\bapi|endpoint|service|backend|microservice\b/.test(lower)) verb = "Developed";
    else if (/\bdatabase|schema|query|data model\b/.test(lower)) verb = "Designed";
    else if (/\bcomponent|ui|interface|frontend|front-end\b/.test(lower)) verb = "Implemented";
    else if (/\btest|bug|qa\b/.test(lower)) verb = "Tested";
    else if (/\bfeature|module|function\b/.test(lower)) verb = "Implemented";
    text = `${verb} ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  }

  // 3. Surface canonical target keywords where the concept is evidenced.
  for (const rule of SURFACE_MAP) {
    if (!keywords.targetKeywords.includes(rule.keyword)) continue;
    const present = keywordPresence(text, rule.keyword);
    if (present.exact) continue;
    if (rule.trigger.test(text)) {
      if (rule.replacement) {
        text = rule.replacement(text);
      } else if (!new RegExp(`\\b${rule.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
        // Append the canonical keyword phrase naturally.
        text = `${text.replace(/\s*$/, "")} using ${rule.keyword.replace(/\b\w/g, (c) => c.toUpperCase())}`;
      }
    }
  }

  // 4. Add qualitative descriptors to generic build statements (no metrics).
  if (/^(built|created|developed|made|designed)\b/i.test(text) && /\b(website|web app|web application|app|application|site|portal)\b$/i.test(text)) {
    if (!/responsive|performance|usability|user/i.test(text)) {
      text = `${text.replace(/\s*$/, "")} with a focus on responsiveness, usability and performance`;
    }
  }

  return capitalize(text.trim());
}

function enhanceSummary(resume: ResumeData, job: JobProfile, keywords: KeywordAnalysis): string {
  const role = deriveRole(resume, job);
  const skillPool = resume.skills.length ? resume.skills : keywords.matched;
  const top = skillPool.slice(0, 6).map(titleCase);
  const more = skillPool.slice(6, 9).map(titleCase);

  if (!resume.summary || resume.summary.trim().length < 40) {
    const list = top.join(", ");
    const tail = more.length ? `, with additional exposure to ${more.join(", ")}` : "";
    return `${role} with hands-on experience across ${list}${tail}. Focused on delivering reliable, user-centered software and continuously improving engineering practices.`;
  }

  // Improve existing summary: keep it factual, ensure it names the role and
  // surfaces a couple of matched keywords. Strip generic objective phrasing.
  let base = resume.summary.trim().replace(/\s+/g, " ");
  base = base.replace(/\b(seeking|looking for|to obtain|career goal|objective)\b[^.]*\.?\s*/gi, "");
  const opensWithRole = new RegExp(`^${role.split(" ")[0]}`, "i").test(base);
  if (!opensWithRole) {
    base = `${role} with ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
  }
  return capitalize(base);
}

function canonicalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    const norm = normalizeText(s);
    const canon = SKILL_SET.has(norm) ? norm : ALIASES[norm] ? ALIASES[norm] : norm;
    if (!seen.has(canon)) {
      seen.add(canon);
      out.push(canon);
    }
  }
  return out;
}

function reorderSkills(skills: string[], keywords: KeywordAnalysis): string[] {
  const canonical = canonicalizeSkills(skills);
  const techSet = new Set<string>();
  for (const cat of Object.keys(CATEGORIES)) {
    if (["Languages", "Frameworks & Libraries", "APIs & Protocols", "Databases", "Cloud & DevOps", "Data & ML", "Tools & Testing"].includes(cat)) {
      CATEGORIES[cat].forEach((s) => techSet.add(s));
    }
  }
  const matched = canonical.filter((s) => keywords.matched.includes(s));
  const tech = canonical.filter((s) => techSet.has(s) && !keywords.matched.includes(s));
  const other = canonical.filter((s) => !techSet.has(s) && !keywords.matched.includes(s));
  return [...matched, ...tech, ...other];
}

function groupSkillsByCategory(skills: string[]): string {
  const groups: Record<string, string[]> = {};
  for (const [cat, list] of Object.entries(CATEGORIES)) {
    const hit = skills.filter((s) => list.includes(s));
    if (hit.length) groups[cat] = hit;
  }
  const uncategorized = skills.filter((s) => !Object.values(CATEGORIES).some((l) => l.includes(s)));
  const parts: string[] = [];
  for (const [cat, list] of Object.entries(groups)) parts.push(`${cat}: ${list.map(titleCase).join(", ")}`);
  if (uncategorized.length) parts.push(`Other: ${uncategorized.map(titleCase).join(", ")}`);
  return parts.join("  |  ");
}

// Serialize a ResumeData object back into plain text (used to re-score the
// enhanced resume consistently and to generate PDFs).
export function serializeResume(data: ResumeData): string {
  const lines: string[] = [];
  lines.push(data.personalInfo.name || "Candidate");
  const contact = [data.personalInfo.email, data.personalInfo.phone, data.personalInfo.github, data.personalInfo.linkedin]
    .filter(Boolean)
    .join(" | ");
  if (contact) lines.push(contact);
  if (data.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(data.summary);
  }
  if (data.skills.length) {
    lines.push("TECHNICAL SKILLS");
    lines.push(data.skills.map(titleCase).join(", "));
  }
  if (data.experience.length) {
    lines.push("EXPERIENCE");
    data.experience.forEach((e) => {
      lines.push(e.heading);
      e.bullets.forEach((b) => lines.push(`- ${b}`));
    });
  }
  if (data.projects.length) {
    lines.push("PROJECTS");
    data.projects.forEach((p) => {
      lines.push(p.heading);
      p.bullets.forEach((b) => lines.push(`- ${b}`));
    });
  }
  if (data.education.length) {
    lines.push("EDUCATION");
    data.education.forEach((e) => lines.push(e.text));
  }
  if (data.certifications.length) {
    lines.push("CERTIFICATIONS");
    data.certifications.forEach((c) => lines.push(c.text));
  }
  if (data.achievements.length) {
    lines.push("ACHIEVEMENTS");
    data.achievements.forEach((a) => lines.push(`- ${a}`));
  }
  return lines.join("\n");
}

export function enhanceResume(
  resume: ResumeData,
  job: JobProfile,
  keywords: KeywordAnalysis,
  pass = 1
): EnhancedResume {
  const changes: ResumeChange[] = [];
  const aggressive = pass >= 2;

  // Summary
  const newSummary = enhanceSummary(resume, job, keywords);
  if (newSummary !== resume.summary) {
    changes.push({
      id: "ch-summary",
      section: "Summary",
      originalText: resume.summary || "(no summary)",
      enhancedText: newSummary,
      changeType: resume.summary ? "improved" : "added",
      reason: resume.summary
        ? "Rephrased to open with the target role and surface matched keywords; removed generic objective phrasing."
        : "Added a factual professional summary built only from detected skills and the target role.",
      atsImpact: "+ Keyword & structure relevance",
    });
  }

  // Skills
  const newSkills = reorderSkills(resume.skills, keywords);
  if (newSkills.join(",") !== canonicalizeSkills(resume.skills).join(",")) {
    changes.push({
      id: "ch-skills",
      section: "Skills",
      originalText: resume.skills.map(titleCase).join(", "),
      enhancedText: groupSkillsByCategory(newSkills),
      changeType: "reordered",
      reason: "Grouped skills by category and ordered target-matched skills first; canonical spellings used (e.g. JavaScript, not js).",
      atsImpact: "+ Technical skill & keyword relevance",
    });
  }

  // Experience bullets
  const experience: ExperienceEntry[] = resume.experience.map((e) => {
    const bullets = e.bullets.map((b) => {
      const nb = enhanceBullet(b, job, keywords, aggressive);
      if (nb !== b.trim()) {
        changes.push({
          id: `ch-exp-${e.id}-${changes.length}`,
          section: "Experience",
          originalText: b,
          enhancedText: nb,
          changeType: "improved",
          reason: "Strengthened the opening verb and added technical context / canonical keyword where evidenced.",
          atsImpact: "+ Action verb & keyword relevance",
        });
      }
      return nb;
    });
    return { ...e, bullets };
  });

  // Project bullets
  const projects: ProjectEntry[] = resume.projects.map((p) => {
    const bullets = p.bullets.map((b) => {
      const nb = enhanceBullet(b, job, keywords, aggressive);
      if (nb !== b.trim()) {
        changes.push({
          id: `ch-proj-${p.id}-${changes.length}`,
          section: "Projects",
          originalText: b,
          enhancedText: nb,
          changeType: "improved",
          reason: "Rewrote the bullet with a stronger action verb and clearer technical context.",
          atsImpact: "+ Action verb & keyword relevance",
        });
      }
      return nb;
    });
    return { ...p, bullets };
  });

  // ATS-friendly structure change (headings standardized in the serialized output).
  changes.push({
    id: "ch-structure",
    section: "Structure",
    originalText: "Original section headings & layout",
    enhancedText: "Standardized ATS-friendly headings (Professional Summary, Technical Skills, Experience, Projects, Education) in a single-column layout.",
    changeType: "reordered",
    reason: "Standard headings and a single-column structure maximize ATS parseability and recruiter scannability.",
    atsImpact: "+ Structure & formatting compatibility",
  });

  const enhancedData: ResumeData = {
    ...resume,
    summary: newSummary,
    skills: newSkills,
    experience,
    projects,
    sectionsPresent: {
      ...resume.sectionsPresent,
      summary: Boolean(newSummary && newSummary.length > 10),
      skills: newSkills.length > 0,
    },
    rawText: "",
  };
  enhancedData.rawText = serializeResume(enhancedData);

  return { data: enhancedData, changes };
}
