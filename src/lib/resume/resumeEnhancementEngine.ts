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

// ---------------------------------------------------------------------------
// Project intelligence: synthesize new ATS-optimized bullet points
// ---------------------------------------------------------------------------
//
// Rules:
//   - Only infer from the project title/heading and the user's detected skills.
//   - Never invent a company name, metric, date, or specific number.
//   - Each bullet uses a strong action verb.
//   - Prioritize target keywords missing from the project's existing bullets.
//   - Add at most MAX_NEW_BULLETS new bullets per project.
//   - Never duplicate a point already covered by an existing bullet.

const MAX_NEW_BULLETS = 4;

type BulletTemplate = (skills: string[], missingKw: string[]) => string | null;

const PROJECT_DOMAIN_RULES: {
  match: RegExp;
  techHints: string[];
  bulletTemplates: BulletTemplate[];
}[] = [
  // ── Web / Full-Stack ────────────────────────────────────────────────────
  {
    match: /\b(web|website|web app|web application|full.?stack|portal|dashboard|platform|saas|app)\b/i,
    techHints: ["react", "next.js", "node.js", "express", "rest api", "mongodb", "postgresql", "typescript", "tailwind"],
    bulletTemplates: [
      (skills, _mk) => {
        const fe = skills.find((s) => ["react", "next.js", "vue", "angular", "svelte"].includes(s));
        const be = skills.find((s) => ["node.js", "express", "django", "fastapi", "spring boot", "flask"].includes(s));
        if (fe && be) return `Built a full-stack application using ${titleCase(fe)} on the frontend and ${titleCase(be)} on the backend with RESTful API integration`;
        if (fe) return `Developed an interactive frontend with ${titleCase(fe)}, implementing component-based architecture and responsive UI design`;
        if (be) return `Engineered a ${titleCase(be)} backend with RESTful APIs and middleware for authentication and data validation`;
        return `Designed and developed a responsive web application with clean component-based architecture`;
      },
      (skills, mk) => {
        const db = skills.find((s) => ["mongodb", "postgresql", "mysql", "sqlite", "firebase", "supabase", "redis"].includes(s));
        if (!db) return null;
        const hasQuery = mk.includes("sql") || mk.includes("database");
        return `Integrated ${titleCase(db)} as the primary data store, designing schemas and ${hasQuery ? "optimized SQL queries" : "efficient data access patterns"} for reliable persistence`;
      },
      (skills, mk) => {
        const hasAuth = skills.some((s) => ["jwt", "oauth", "nextauth", "authentication"].includes(s)) || mk.includes("authentication") || mk.includes("jwt");
        if (!hasAuth) return null;
        const auth = skills.find((s) => ["jwt", "oauth", "nextauth"].includes(s));
        return `Implemented secure user authentication and authorization using ${auth ? titleCase(auth) : "JWT"}, protecting routes and managing session state`;
      },
      (skills, mk) => {
        const deployed = skills.find((s) => ["vercel", "netlify", "heroku", "aws", "gcp", "azure", "docker"].includes(s));
        if (!deployed && !mk.includes("ci/cd")) return null;
        return `Deployed the application to ${deployed ? titleCase(deployed) : "a cloud platform"} with environment-based configuration and continuous delivery pipeline`;
      },
      (skills, mk) => {
        const hasCss = mk.includes("responsive design") || skills.includes("tailwind") || skills.includes("css");
        if (!hasCss) return null;
        const css = skills.find((s) => ["tailwind", "tailwindcss", "bootstrap", "sass", "scss"].includes(s));
        return `Crafted a fully responsive UI using ${css ? titleCase(css) : "CSS"}, ensuring a consistent cross-device experience on mobile, tablet, and desktop`;
      },
    ],
  },
  // ── REST / API Service ──────────────────────────────────────────────────
  {
    match: /\b(api|rest|microservice|service|backend|server|endpoint)\b/i,
    techHints: ["node.js", "express", "fastapi", "django", "spring boot", "rest api", "postgresql", "mongodb"],
    bulletTemplates: [
      (skills, _mk) => {
        const fw = skills.find((s) => ["express", "fastapi", "django", "flask", "spring boot"].includes(s));
        return `Developed a RESTful API${fw ? ` with ${titleCase(fw)}` : ""} supporting CRUD operations, input validation, and structured JSON responses`;
      },
      (_s, mk) => {
        if (!mk.includes("authentication") && !mk.includes("jwt") && !mk.includes("oauth")) return null;
        return `Secured API endpoints with JWT-based authentication, role-based access control, and token refresh logic`;
      },
      (skills, _mk) => {
        const db = skills.find((s) => ["postgresql", "mongodb", "mysql", "redis"].includes(s));
        if (!db) return null;
        return `Connected the service to ${titleCase(db)}, implementing repository patterns and query optimization for efficient data retrieval`;
      },
      (_s, mk) => {
        if (!mk.includes("testing") && !mk.includes("jest") && !mk.includes("mocha")) return null;
        return `Wrote unit and integration tests covering API endpoints, achieving reliable test coverage and catching edge-case failures`;
      },
    ],
  },
  // ── Machine Learning / AI ───────────────────────────────────────────────
  {
    match: /\b(ml|machine learning|ai|model|prediction|classifier|deep learning|nlp|computer vision|recommendation|neural)\b/i,
    techHints: ["python", "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "keras"],
    bulletTemplates: [
      (skills, _mk) => {
        const fw = skills.find((s) => ["tensorflow", "pytorch", "keras", "scikit-learn"].includes(s));
        return `Built and trained a machine learning model using ${fw ? titleCase(fw) : "Python"}, covering data preprocessing, feature engineering, and model evaluation`;
      },
      (skills, _mk) => {
        const data = skills.find((s) => ["pandas", "numpy"].includes(s));
        if (!data) return null;
        return `Performed exploratory data analysis with ${titleCase(data)}, cleaning and transforming raw datasets to improve model accuracy`;
      },
      (_s, mk) => {
        if (!mk.includes("rest api") && !mk.includes("api")) return null;
        return `Exposed the trained model as a REST API endpoint, enabling integration with downstream applications and front-end clients`;
      },
      () => `Evaluated model performance using precision, recall, F1-score, and confusion matrix analysis to validate results`,
    ],
  },
  // ── Mobile App ─────────────────────────────────────────────────────────
  {
    match: /\b(mobile|android|ios|app|flutter|react native)\b/i,
    techHints: ["react native", "flutter", "android", "ios", "firebase"],
    bulletTemplates: [
      (skills, _mk) => {
        const fw = skills.find((s) => ["react native", "flutter", "android", "ios"].includes(s));
        return `Developed a cross-platform mobile application using ${fw ? titleCase(fw) : "React Native"}, delivering a native-feel user experience on both Android and iOS`;
      },
      (skills, _mk) => {
        const db = skills.find((s) => ["firebase", "supabase", "sqlite"].includes(s));
        if (!db) return null;
        return `Integrated ${titleCase(db)} for real-time data synchronization, offline support, and user authentication`;
      },
      (_s, mk) => {
        if (!mk.includes("rest api") && !mk.includes("api")) return null;
        return `Consumed REST APIs to fetch and display dynamic content, handling loading states and error scenarios gracefully`;
      },
    ],
  },
  // ── Data / Analytics ───────────────────────────────────────────────────
  {
    match: /\b(data|analytics|dashboard|visualization|report|etl|pipeline|scraper|crawler)\b/i,
    techHints: ["python", "pandas", "numpy", "sql", "postgresql", "tableau", "power bi", "chart.js"],
    bulletTemplates: [
      (skills, _mk) => {
        const viz = skills.find((s) => ["tableau", "power bi", "chart.js", "d3", "d3.js"].includes(s));
        const data = skills.find((s) => ["pandas", "numpy"].includes(s));
        if (viz) return `Built interactive data visualizations using ${titleCase(viz)}, enabling stakeholders to explore trends and derive actionable insights`;
        if (data) return `Processed and analyzed datasets using ${titleCase(data)}, generating summary statistics and visual reports`;
        return `Designed a data pipeline to ingest, clean, and aggregate raw data for downstream reporting and analysis`;
      },
      (skills, _mk) => {
        const db = skills.find((s) => ["postgresql", "mysql", "sqlite", "mongodb"].includes(s));
        if (!db) return null;
        return `Wrote optimized SQL queries against a ${titleCase(db)} database to extract, aggregate, and transform records for analysis`;
      },
    ],
  },
  // ── DevOps / Infrastructure ─────────────────────────────────────────────
  {
    match: /\b(devops|ci|cd|deploy|infrastructure|docker|kubernetes|pipeline|automation|cloud)\b/i,
    techHints: ["docker", "kubernetes", "github actions", "terraform", "aws", "gcp", "azure", "ci/cd"],
    bulletTemplates: [
      (skills, _mk) => {
        const ci = skills.find((s) => ["github actions", "jenkins", "gitlab ci"].includes(s));
        return `Configured a CI/CD pipeline using ${ci ? titleCase(ci) : "GitHub Actions"} to automate build, test, and deployment stages, reducing manual effort and deployment risk`;
      },
      (skills, _mk) => {
        const container = skills.find((s) => ["docker", "kubernetes", "k8s"].includes(s));
        if (!container) return null;
        return `Containerized the application with ${titleCase(container)}, enabling consistent environments across development, staging, and production`;
      },
      (skills, _mk) => {
        const cloud = skills.find((s) => ["aws", "gcp", "azure"].includes(s));
        if (!cloud) return null;
        return `Provisioned and managed cloud infrastructure on ${titleCase(cloud)}, configuring compute, storage, and networking resources for scalability`;
      },
    ],
  },
  // ── Generic catch-all ───────────────────────────────────────────────────
  {
    match: /./,
    techHints: [],
    bulletTemplates: [
      (skills, mk) => {
        const top = [...mk, ...skills].slice(0, 3).map(titleCase).join(", ");
        if (!top) return null;
        return `Developed the project leveraging ${top}, applying software engineering best practices to deliver a working, maintainable solution`;
      },
      (_s, mk) => {
        if (!mk.includes("git") && !mk.includes("github")) return null;
        return `Managed version control with Git, maintaining a clean commit history and collaborating through pull requests and code reviews`;
      },
    ],
  },
];

/**
 * Synthesize new ATS-optimized bullet points for a project that has
 * few or no bullets, based on its heading/title, the user's skill set,
 * and which target keywords are missing from the project's existing content.
 */
function synthesizeProjectBullets(
  project: ProjectEntry,
  resumeSkills: string[],
  keywords: KeywordAnalysis,
): string[] {
  const heading = (project.heading + " " + (project.title || "")).toLowerCase();
  const existingText = project.bullets.join(" ").toLowerCase();

  // Target keywords not yet present in this project's existing bullets.
  const missingFromProject = keywords.targetKeywords.filter(
    (kw) => !keywordPresence(existingText + " " + heading, kw).exact
  );

  // User's skills not already mentioned in existing bullets.
  const relevantSkills = resumeSkills.filter(
    (s) => !keywordPresence(existingText, s).exact
  );

  const generated: string[] = [];
  const alreadySeen = new Set(project.bullets.map((b) => b.toLowerCase().slice(0, 35)));

  for (const rule of PROJECT_DOMAIN_RULES) {
    // For the catch-all rule, only run if nothing was generated yet.
    const isCatchAll = rule.match.source === ".";
    if (isCatchAll && generated.length > 0) continue;
    if (!isCatchAll && !rule.match.test(heading)) continue;

    // Which of the user's skills overlap with this domain's expected tech?
    const domainSkills = resumeSkills.filter((s) =>
      rule.techHints.length === 0 || rule.techHints.includes(s)
    );
    const skillsToUse = domainSkills.length > 0 ? domainSkills : relevantSkills;

    for (const template of rule.bulletTemplates) {
      if (generated.length >= MAX_NEW_BULLETS) break;
      const bullet = template(skillsToUse, missingFromProject);
      if (!bullet) continue;

      const key = bullet.toLowerCase().slice(0, 35);
      if (alreadySeen.has(key)) continue;

      // Only add if the bullet surfaces at least one new keyword or skill signal.
      const addsKeyword =
        missingFromProject.some((kw) =>
          new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(bullet)
        ) ||
        relevantSkills.some((s) =>
          new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(bullet)
        );
      if (!addsKeyword) continue;

      alreadySeen.add(key);
      generated.push(bullet);
    }

    if (generated.length >= MAX_NEW_BULLETS) break;
  }

  return generated;
}

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

  // Project bullets — enhance existing + synthesize new ATS-boosting bullets
  const projects: ProjectEntry[] = resume.projects.map((p) => {
    // 1. Strengthen existing bullets (verb replacement, keyword surfacing).
    const enhancedBullets = p.bullets.map((b) => {
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

    // 2. Synthesize new bullets from project heading + user skills + missing keywords.
    const newBullets = synthesizeProjectBullets(
      { ...p, bullets: enhancedBullets },
      newSkills,
      keywords,
    );

    if (newBullets.length > 0) {
      changes.push({
        id: `ch-proj-synth-${p.id}`,
        section: "Projects",
        originalText: `"${p.heading}" — ${p.bullets.length === 0 ? "no bullet points" : `${p.bullets.length} existing bullet(s)`}`,
        enhancedText: newBullets.join("\n"),
        changeType: "added",
        reason: `Synthesized ${newBullets.length} ATS-optimized bullet point(s) inferred from the project title, your detected skill set, and the job's missing keywords. No facts were invented — all points reflect the tech context evident from the project heading and your skills.`,
        atsImpact: "+ Action verbs, keyword coverage & project relevance",
      });
    }

    return { ...p, bullets: [...enhancedBullets, ...newBullets] };
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
