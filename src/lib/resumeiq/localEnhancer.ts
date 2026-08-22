import type {
  EnhancedResume, JobInput, KeywordAnalysis, ResumeData, ResumeChange,
} from "./types";
import { textContainsKeyword } from "./keywords";

/**
 * Local, offline resume enhancer (used when OpenRouter/Gemini are unavailable).
 *
 * SAFE rewrites only — no invented companies, metrics, dates, skills or facts.
 * It: strengthens weak/passive openers with strong action verbs, integrates
 * job-matched keywords already evidenced in the resume into bullets & summary,
 * reorganizes skills to surface matched keywords, and tightens phrasing.
 * Output is still passed through the anti-hallucination validator downstream.
 */

// Weak opener phrase -> replacement. The remainder of the bullet is kept as-is.
const WEAK_OPENER: Record<string, string> = {
  "responsible for": "Led",
  "was responsible for": "Led",
  "responsible to": "Owned",
  "worked on": "Developed",
  "worked with": "Built",
  "was working on": "Developed",
  "helped": "Supported",
  "assisted": "Contributed to",
  "was involved in": "Drove",
  "involved in": "Drove",
  "handled": "Managed",
  "was tasked with": "Delivered",
  "tasked with": "Delivered",
  "did": "Executed",
  "made": "Produced",
  "used": "Applied",
  "participated in": "Contributed to",
  "created": "Built",
};

const GENERIC_OBJECTIVE = [
  "seeking a challenging", "looking for an opportunity", "to obtain a position",
  "utilize my skills", "hardworking individual", "team player looking",
  "a highly motivated", "dynamic individual",
];

const ACTION_VERBS = new Set(
  ["developed", "built", "led", "designed", "implemented", "created", "engineered",
   "architected", "optimized", "automated", "delivered", "launched", "managed",
   "spearheaded", "streamlined", "reduced", "improved", "increased", "deployed",
   "integrated", "migrated", "refactored", "collaborated", "mentored", "drove"]
);

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function strongVerbFor(bulletLower: string): string {
  if (/(design|ui|ux|interface)/.test(bulletLower)) return "Designed";
  if (/(test|qa|bug|automate)/.test(bulletLower)) return "Automated";
  if (/(deploy|ship|release|ci\/cd)/.test(bulletLower)) return "Deployed";
  if (/(api|backend|server|integration)/.test(bulletLower)) return "Built";
  if (/(performance|speed|optimi|latency)/.test(bulletLower)) return "Optimized";
  if (/(team|lead|mentor|coordinate)/.test(bulletLower)) return "Led";
  if (/(data|analy|report)/.test(bulletLower)) return "Analyzed";
  if (/(user|customer|client)/.test(bulletLower)) return "Delivered";
  return "Developed";
}

function isGenericSummary(text: string): boolean {
  const low = text.toLowerCase();
  return GENERIC_OBJECTIVE.some((g) => low.includes(g)) || low.split(/\s+/).length < 12;
}

function rewriteBullet(
  bullet: string,
  matched: string[],
  resumeText: string
): { text: string; changed: boolean; keywordsAdded: string[] } {
  let text = bullet.trim().replace(/\s+/g, " ");
  let changed = false;
  const keywordsAdded: string[] = [];

  // 1) Replace weak openers.
  const lowerStart = text.toLowerCase();
  for (const [weak, strong] of Object.entries(WEAK_OPENER)) {
    if (lowerStart.startsWith(weak)) {
      text = strong + text.slice(weak.length);
      changed = true;
      break;
    }
  }

  // 2) If it still doesn't open with a strong verb or proper noun, prepend one.
  text = text.trim();
  const firstRaw = text.split(/\s+/)[0] || "";
  const firstWord = firstRaw.toLowerCase().replace(/[^a-z]/g, "");
  const startsProper = /^[A-Z]/.test(firstRaw) && firstWord.length > 1;
  if (!ACTION_VERBS.has(firstWord) && !startsProper) {
    text = `${strongVerbFor(text.toLowerCase())} ${text}`;
    changed = true;
  }

  text = capitalize(text.trim());

  // 3) Integrate up to two matched keywords already evidenced in the resume.
  for (const kw of matched) {
    if (keywordsAdded.length >= 2) break;
    if (kw.split(/\s+/).length > 2) continue;
    if (textContainsKeyword(text, kw)) continue;
    if (!textContainsKeyword(resumeText, kw)) continue;
    text = `${text} using ${kw}`;
    keywordsAdded.push(kw);
    changed = true;
  }

  return { text, changed, keywordsAdded };
}

function buildSummary(jobTitle: string, matched: string[]): string {
  const top = matched.slice(0, 4);
  if (top.length >= 2) {
    return `${jobTitle} with hands-on experience in ${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}.`;
  }
  if (top.length === 1) return `${jobTitle} with hands-on experience in ${top[0]}.`;
  return `${jobTitle} with relevant hands-on experience.`;
}

function rewriteSummary(
  summary: string,
  jobTitle: string,
  matched: string[]
): { text: string; changed: boolean } {
  if (!summary || !summary.trim() || isGenericSummary(summary)) {
    return { text: buildSummary(jobTitle, matched), changed: true };
  }

  let text = summary.trim();
  let changed = false;

  for (const g of GENERIC_OBJECTIVE) {
    if (text.toLowerCase().includes(g)) {
      const idx = text.toLowerCase().indexOf(g);
      let after = text.slice(idx + g.length).replace(/^[,\s]+/, "");
      const toIdx = after.toLowerCase().indexOf(" to ");
      if (toIdx !== -1) after = after.slice(0, toIdx).trim();
      const before = text.slice(0, idx).replace(/[,\s]+$/, "");
      text = (before + (before && after ? " " : "") + after).trim();
      changed = true;
    }
  }
  text = text.replace(/\s{2,}/g, " ").trim();

  if (!textContainsKeyword(text, jobTitle)) {
    text = `${jobTitle} with ${text.charAt(0).toLowerCase() === text.charAt(0) ? text : capitalize(text)}`;
    changed = true;
  }
  for (const kw of matched.slice(0, 3)) {
    if (kw.split(/\s+/).length > 2) continue;
    if (textContainsKeyword(text, kw)) continue;
    if (!textContainsKeyword(text, kw)) continue;
    text = `${capitalize(text.replace(/\.$/, ""))} with a focus on ${kw}.`;
    changed = true;
    break;
  }
  return { text: capitalize(text), changed };
}

export function enhanceLocally(
  resume: ResumeData,
  job: JobInput,
  keywords: KeywordAnalysis
): {
  enhancedResume: EnhancedResume;
  changes: ResumeChange[];
  recommendations: string[];
} {
  const changes: ResumeChange[] = [];
  const resumeText = resume.rawText;
  const matched = keywords.matched;

  const summaryOut = rewriteSummary(resume.summary, job.jobTitle, matched);
  if (summaryOut.changed && summaryOut.text) {
    changes.push({
      id: "loc-summary",
      section: "Summary",
      original: resume.summary || "(none)",
      enhanced: summaryOut.text,
      changeType: "Improved",
      reason: "Rebuilt the professional summary around the target job title and relevant keywords for ATS alignment.",
      targetKeywords: matched.slice(0, 3),
      atsImpact: "Medium",
    });
  }

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const kw of matched) {
    const key = kw.toLowerCase();
    if (!seen.has(key)) { seen.add(key); ordered.push(kw); }
  }
  for (const s of resume.skills) {
    const key = s.toLowerCase().trim();
    if (!seen.has(key)) { seen.add(key); ordered.push(s.trim()); }
  }
  if (ordered.length !== resume.skills.length || matched.length) {
    changes.push({
      id: "loc-skills",
      section: "Technical Skills",
      original: resume.skills.join(", "),
      enhanced: ordered.join(", "),
      changeType: "Reorganized",
      reason: "Reordered skills so the most job-relevant, matched keywords appear first for ATS parsers.",
      targetKeywords: matched.slice(0, 6),
      atsImpact: "Medium",
    });
  }

  const experience = resume.experience.map((e, ei) => {
    const bullets = e.bullets.map((b) => {
      const r = rewriteBullet(b, matched, resumeText);
      if (r.changed) {
        changes.push({
          id: `loc-exp-${ei}-${changes.length}`,
          section: "Experience",
          original: b,
          enhanced: r.text,
          changeType: r.keywordsAdded.length ? "Keyword Optimized" : "Improved",
          reason: r.keywordsAdded.length
            ? `Strengthened the bullet and integrated the job keyword "${r.keywordsAdded.join(", ")}" already present in your experience.`
            : "Replaced a weak/passive opener with a strong action verb and clarified the outcome.",
          targetKeywords: r.keywordsAdded,
          atsImpact: r.keywordsAdded.length ? "Medium" : "Low",
        });
      }
      return r.text;
    });
    return { ...e, bullets };
  });

  const projects = resume.projects.map((p, pi) => {
    const bullets = p.bullets.map((b) => {
      const r = rewriteBullet(b, matched, resumeText);
      if (r.changed) {
        changes.push({
          id: `loc-proj-${pi}-${changes.length}`,
          section: "Projects",
          original: b,
          enhanced: r.text,
          changeType: r.keywordsAdded.length ? "Keyword Optimized" : "Improved",
          reason: r.keywordsAdded.length
            ? `Strengthened the bullet and integrated the job keyword "${r.keywordsAdded.join(", ")}" already present in your project.`
            : "Replaced a weak/passive opener with a strong action verb and clarified the outcome.",
          targetKeywords: r.keywordsAdded,
          atsImpact: r.keywordsAdded.length ? "Medium" : "Low",
        });
      }
      return r.text;
    });
    return { ...p, bullets };
  });

  const enhancedResume: EnhancedResume = {
    ...resume,
    summary: summaryOut.text || resume.summary,
    skills: ordered.length ? ordered : resume.skills,
    experience,
    projects,
  };

  const recommendations = keywords.missing.slice(0, 8).map(
    (m) => `Consider adding the missing keyword "${m}" only if you genuinely have experience with it.`
  );
  if (keywords.missing.length === 0) {
    recommendations.push("Strong keyword coverage — focus on quantifying achievements with metrics.");
  }
  if (resume.skills.length < 8) {
    recommendations.push("Expand your skills section with more specific tools you have used.");
  }

  return { enhancedResume, changes, recommendations };
}
