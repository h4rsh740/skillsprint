import {
  CandidateRawInputs,
  CandidateEvidenceGraph,
  EvidenceClassification,
  EvidenceConfidence,
  EvidenceItem,
  EvidenceSource,
  EvidenceStrength,
  SkillCategory,
  SkillEvidenceSummary,
} from "./types";
import { canonicalize, normalizeText } from "../resume/keywordNormalizer";
import { SKILL_SET, ALIASES } from "../resume/skillDictionary";

// Common inferential relations: Sub-skill / framework -> Parent / foundational skill
const INFERRED_RELATIONS: Record<string, string[]> = {
  "next.js": ["react", "javascript"],
  "react": ["javascript"],
  "react.js": ["react", "javascript"],
  "vue": ["javascript"],
  "vue.js": ["javascript"],
  "angular": ["typescript", "javascript"],
  "typescript": ["javascript"],
  "fastapi": ["python", "apis"],
  "django": ["python"],
  "flask": ["python"],
  "express": ["node", "javascript", "apis"],
  "express.js": ["node", "javascript", "apis"],
  "spring boot": ["java", "apis"],
  "postgresql": ["sql"],
  "postgres": ["sql"],
  "mysql": ["sql"],
  "prisma": ["sql", "database"],
  "mongodb": ["database"],
  "docker": ["devops"],
  "kubernetes": ["docker", "devops"],
  "jest": ["testing"],
  "cypress": ["testing"],
  "playwright": ["testing"],
  "vitest": ["testing"],
  "github actions": ["ci/cd", "devops"],
};

const SKILL_CATEGORY_MAP: Record<string, SkillCategory> = {
  javascript: "frontend",
  typescript: "frontend",
  react: "frontend",
  "react.js": "frontend",
  "next.js": "frontend",
  vue: "frontend",
  "vue.js": "frontend",
  angular: "frontend",
  html: "frontend",
  html5: "frontend",
  css: "frontend",
  css3: "frontend",
  tailwind: "frontend",
  tailwindcss: "frontend",
  redux: "frontend",
  python: "backend",
  node: "backend",
  "node.js": "backend",
  express: "backend",
  "express.js": "backend",
  django: "backend",
  flask: "backend",
  fastapi: "backend",
  java: "backend",
  "spring boot": "backend",
  go: "backend",
  golang: "backend",
  rust: "backend",
  sql: "database",
  postgresql: "database",
  postgres: "database",
  mysql: "database",
  mongodb: "database",
  redis: "database",
  prisma: "database",
  docker: "devops",
  kubernetes: "devops",
  "ci/cd": "devops",
  "github actions": "devops",
  aws: "devops",
  gcp: "devops",
  azure: "devops",
  testing: "testing",
  jest: "testing",
  cypress: "testing",
  playwright: "testing",
  vitest: "testing",
  "machine learning": "ai_ml",
  ml: "ai_ml",
  pytorch: "ai_ml",
  tensorflow: "ai_ml",
  llm: "ai_ml",
  rag: "ai_ml",
  "system design": "system_design",
  microservices: "system_design",
};

export function categorizeSkill(normalized: string): SkillCategory {
  if (SKILL_CATEGORY_MAP[normalized]) return SKILL_CATEGORY_MAP[normalized];
  if (normalized.includes("test") || normalized.includes("qa")) return "testing";
  if (normalized.includes("data") || normalized.includes("ai") || normalized.includes("ml")) return "ai_ml";
  if (normalized.includes("cloud") || normalized.includes("deploy")) return "devops";
  if (normalized.includes("db") || normalized.includes("sql")) return "database";
  return "general";
}

const CANONICAL_FOLDS: Record<string, string> = {
  "react.js": "react",
  "node.js": "node",
  "vue.js": "vue",
  "postgres": "postgresql",
  "golang": "go",
  "k8s": "kubernetes",
  "ts": "typescript",
  "js": "javascript",
  "py": "python",
  "automated testing": "testing",
  "unit testing": "testing",
  "integration testing": "testing",
};

/**
 * Normalizes skill strings to canonical lowercase format.
 */
export function normalizeSkillName(raw: string): string {
  const norm = normalizeText(raw);
  const canon = canonicalize(norm);
  return CANONICAL_FOLDS[canon] || canon;
}

/**
 * Formats a canonical skill for display.
 */
export function formatSkillDisplay(canonical: string): string {
  const map: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    react: "React",
    "react.js": "React",
    "next.js": "Next.js",
    "node.js": "Node.js",
    node: "Node.js",
    postgresql: "PostgreSQL",
    postgres: "PostgreSQL",
    mysql: "MySQL",
    mongodb: "MongoDB",
    redis: "Redis",
    docker: "Docker",
    kubernetes: "Kubernetes",
    "ci/cd": "CI/CD",
    "github actions": "GitHub Actions",
    aws: "AWS",
    gcp: "GCP",
    html: "HTML5",
    html5: "HTML5",
    css: "CSS3",
    css3: "CSS3",
    tailwind: "Tailwind CSS",
    tailwindcss: "Tailwind CSS",
    sql: "SQL",
    python: "Python",
    java: "Java",
    "spring boot": "Spring Boot",
    fastapi: "FastAPI",
    testing: "Automated Testing",
    jest: "Jest",
    cypress: "Cypress",
    playwright: "Playwright",
    "system design": "System Design",
    "machine learning": "Machine Learning",
    llm: "LLMs / Generative AI",
    rag: "RAG Systems",
  };
  return map[canonical] || canonical.charAt(0).toUpperCase() + canonical.slice(1);
}

let evidenceCounter = 0;
function createEvidenceId(): string {
  evidenceCounter += 1;
  return `ev-${Date.now()}-${evidenceCounter}`;
}

/**
 * Build the Candidate Evidence Graph deterministically from all available signals.
 */
export function buildCandidateEvidenceGraph(inputs: CandidateRawInputs): CandidateEvidenceGraph {
  const evidenceList: EvidenceItem[] = [];
  const sourcesCount: Record<EvidenceSource, number> = {
    RESUME: 0,
    GITHUB: 0,
    PROJECT: 0,
    PORTFOLIO: 0,
    INTERVIEW: 0,
    USER_INPUT: 0,
  };

  const skillEvidenceBuckets = new Map<string, EvidenceItem[]>();

  function registerEvidence(item: Omit<EvidenceItem, "id">) {
    const fullItem: EvidenceItem = {
      ...item,
      id: createEvidenceId(),
      createdAt: item.createdAt || new Date().toISOString(),
    };
    evidenceList.push(fullItem);
    sourcesCount[fullItem.source] = (sourcesCount[fullItem.source] || 0) + 1;

    const key = fullItem.normalizedSkill;
    const existing = skillEvidenceBuckets.get(key) || [];
    existing.push(fullItem);
    skillEvidenceBuckets.set(key, existing);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Ingest Resume Signals
  // ──────────────────────────────────────────────────────────────────────────
  if (inputs.resume) {
    const { skills = [], experience = [], projects = [], rawText = "", certifications = [] } = inputs.resume;

    // A. Explicit Resume Skills
    for (const raw of skills) {
      const canonical = normalizeSkillName(raw);
      if (!canonical) continue;
      registerEvidence({
        source: "RESUME",
        type: "RESUME_SKILLS_SECTION",
        skill: formatSkillDisplay(canonical),
        normalizedSkill: canonical,
        description: `Listed in resume technical skills section (${raw.trim()})`,
        strength: "MODERATE",
        confidence: "MEDIUM",
        classification: "DIRECT",
      });
    }

    // B. Resume Project and Experience Bullets (demonstrating application)
    const allBullets: string[] = [
      ...experience.flatMap((e) => e.bullets || []),
      ...projects.flatMap((p) => p.bullets || []),
    ];

    for (const bullet of allBullets) {
      const bLower = bullet.toLowerCase();
      for (const [key] of Object.entries(SKILL_CATEGORY_MAP)) {
        // Look for whole token presence
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(^|[^a-z0-9+])${escaped}([^a-z0-9+]|$)`, "i");
        if (regex.test(bLower)) {
          registerEvidence({
            source: "RESUME",
            type: "RESUME_EXPERIENCE_BULLET",
            skill: formatSkillDisplay(key),
            normalizedSkill: key,
            description: `Applied in experience/project bullet: "${bullet.length > 80 ? bullet.slice(0, 77) + "..." : bullet}"`,
            strength: "STRONG",
            confidence: "HIGH",
            classification: "DIRECT",
          });
        }
      }
    }

    // C. Certifications
    for (const cert of certifications) {
      const certText = cert.text || "";
      const lower = certText.toLowerCase();
      for (const [key] of Object.entries(SKILL_CATEGORY_MAP)) {
        if (lower.includes(key)) {
          registerEvidence({
            source: "RESUME",
            type: "RESUME_CERTIFICATION",
            skill: formatSkillDisplay(key),
            normalizedSkill: key,
            description: `Verified credential or certification: ${certText}`,
            strength: "STRONG",
            confidence: "HIGH",
            classification: "DIRECT",
          });
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Ingest GitHub Signals
  // ──────────────────────────────────────────────────────────────────────────
  if (inputs.github) {
    const { languages = [], repositoryHealth = [], cicdActive, readmeQuality } = inputs.github;

    // A. Verified Codebase Languages & Proportions
    for (const lang of languages) {
      const canonical = normalizeSkillName(lang.name);
      if (!canonical) continue;

      if (lang.percentage >= 5) {
        registerEvidence({
          source: "GITHUB",
          type: "CODEBASE_LANGUAGE",
          skill: formatSkillDisplay(canonical),
          normalizedSkill: canonical,
          description: `Active repository codebase contains ${lang.percentage}% ${lang.name} source code`,
          strength: lang.percentage >= 20 ? "STRONG" : "MODERATE",
          confidence: "HIGH",
          classification: "DIRECT",
          metadata: { percentage: lang.percentage },
        });
      } else if (lang.percentage > 0 && lang.percentage < 5) {
        // Barely any code: Weak evidence
        registerEvidence({
          source: "GITHUB",
          type: "CODEBASE_LANGUAGE_MINOR",
          skill: formatSkillDisplay(canonical),
          normalizedSkill: canonical,
          description: `Minor presence (<${lang.percentage}%) in repositories`,
          strength: "WEAK",
          confidence: "LOW",
          classification: "WEAK",
          metadata: { percentage: lang.percentage },
        });
      }
    }

    // B. CI/CD Evidence
    if (cicdActive) {
      registerEvidence({
        source: "GITHUB",
        type: "REPOSITORY_CICD",
        skill: "CI/CD",
        normalizedSkill: "ci/cd",
        description: "Active GitHub Actions workflows detected in public repositories",
        strength: "STRONG",
        confidence: "HIGH",
        classification: "DIRECT",
      });
      registerEvidence({
        source: "GITHUB",
        type: "REPOSITORY_CICD_DEVOPS",
        skill: "DevOps",
        normalizedSkill: "devops",
        description: "Automated test & build pipelines configured on GitHub",
        strength: "MODERATE",
        confidence: "HIGH",
        classification: "DIRECT",
      });
    }

    // C. Documentation / Engineering Rigor
    if (readmeQuality === "High") {
      registerEvidence({
        source: "GITHUB",
        type: "REPOSITORY_DOCUMENTATION",
        skill: "Technical Documentation",
        normalizedSkill: "documentation",
        description: "High quality README guides with architecture instructions detected",
        strength: "STRONG",
        confidence: "HIGH",
        classification: "DIRECT",
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Ingest Project Submissions & Shipped Artifacts
  // ──────────────────────────────────────────────────────────────────────────
  if (inputs.projects) {
    for (const proj of inputs.projects) {
      for (const tech of proj.technologies || []) {
        const canonical = normalizeSkillName(tech);
        if (!canonical) continue;

        registerEvidence({
          source: "PROJECT",
          type: "SHIPPED_PROJECT",
          skill: formatSkillDisplay(canonical),
          normalizedSkill: canonical,
          description: `Built and shipped in project "${proj.name}" (${proj.difficulty || "Practical"})`,
          strength: "STRONG",
          confidence: "HIGH",
          classification: "DIRECT",
          metadata: { projectName: proj.name },
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Ingest Portfolio Audit Signals
  // ──────────────────────────────────────────────────────────────────────────
  if (inputs.portfolio && inputs.portfolio.portfolioUrl) {
    const { designScore = 0, performanceScore = 0, seoScore = 0 } = inputs.portfolio;
    if (performanceScore >= 70 || designScore >= 70) {
      registerEvidence({
        source: "PORTFOLIO",
        type: "PORTFOLIO_AUDIT",
        skill: "Frontend Architecture",
        normalizedSkill: "frontend",
        description: `Live portfolio audited with Performance: ${performanceScore}/100, Design: ${designScore}/100`,
        strength: "MODERATE",
        confidence: "MEDIUM",
        classification: "DIRECT",
        url: inputs.portfolio.portfolioUrl,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Ingest Mock Interview Evaluations
  // ──────────────────────────────────────────────────────────────────────────
  if (inputs.interviews && inputs.interviews.length > 0) {
    for (const interview of inputs.interviews) {
      const techScore = interview.technicalScore ?? 0;
      const commScore = interview.communicationScore ?? 0;

      if (techScore >= 70) {
        registerEvidence({
          source: "INTERVIEW",
          type: "TECHNICAL_INTERVIEW_VERIFICATION",
          skill: "Technical Problem Solving",
          normalizedSkill: "problem-solving",
          description: `Demonstrated strong live technical competency (Score: ${techScore}/100)`,
          strength: "STRONG",
          confidence: "HIGH",
          classification: "DIRECT",
        });
      } else if (techScore > 0 && techScore < 45) {
        // Signal potential conflict on claimed high-expertise skills
        registerEvidence({
          source: "INTERVIEW",
          type: "INTERVIEW_DEFICIENCY",
          skill: "Technical Problem Solving",
          normalizedSkill: "problem-solving",
          description: `Interview evaluation flagged technical gaps (Score: ${techScore}/100)`,
          strength: "WEAK",
          confidence: "HIGH",
          classification: "CONFLICTING",
        });
      }

      if (commScore >= 70) {
        registerEvidence({
          source: "INTERVIEW",
          type: "INTERVIEW_COMMUNICATION",
          skill: "Technical Communication",
          normalizedSkill: "communication",
          description: `Clear articulation in mock interview evaluation (Score: ${commScore}/100)`,
          strength: "STRONG",
          confidence: "HIGH",
          classification: "DIRECT",
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Ingest Profile Claimed Skills (USER_INPUT)
  // ──────────────────────────────────────────────────────────────────────────
  const claimedSkills = (inputs.profile?.skills || []).map((s) => ({
    raw: s,
    canonical: normalizeSkillName(s),
  }));

  for (const { raw, canonical } of claimedSkills) {
    if (!canonical) continue;

    // Check if there is already direct evidence from resume, github, or projects
    const existingDirect = (skillEvidenceBuckets.get(canonical) || []).filter(
      (e) => e.classification === "DIRECT"
    );

    if (existingDirect.length === 0) {
      // Claimed skill has NO supporting code or experience
      registerEvidence({
        source: "USER_INPUT",
        type: "CLAIMED_PROFILE_SKILL",
        skill: formatSkillDisplay(canonical),
        normalizedSkill: canonical,
        description: `Claimed on user profile ("${raw}") without supporting code repository or project evidence`,
        strength: "WEAK",
        confidence: "LOW",
        classification: "WEAK",
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Infer Relationships (e.g. Next.js implies React)
  // ──────────────────────────────────────────────────────────────────────────
  const knownCanonicalKeys = Array.from(skillEvidenceBuckets.keys());
  for (const skillKey of knownCanonicalKeys) {
    const parentInferences = INFERRED_RELATIONS[skillKey];
    if (parentInferences) {
      const childEvidence = skillEvidenceBuckets.get(skillKey) || [];
      const hasStrongChild = childEvidence.some(
        (e) => e.strength === "STRONG" && e.classification === "DIRECT"
      );

      if (hasStrongChild) {
        for (const parentSkill of parentInferences) {
          const parentKey = parentSkill.toLowerCase();
          const existingForParent = skillEvidenceBuckets.get(parentKey) || [];
          const alreadyDirect = existingForParent.some((e) => e.classification === "DIRECT");

          if (!alreadyDirect) {
            registerEvidence({
              source: "PROJECT",
              type: "INFERRED_RELATIONSHIP",
              skill: formatSkillDisplay(parentKey),
              normalizedSkill: parentKey,
              description: `Inferred foundational competency from verified expertise in ${formatSkillDisplay(skillKey)}`,
              strength: "MODERATE",
              confidence: "MEDIUM",
              classification: "INFERRED",
              metadata: { inferredFrom: skillKey },
            });
          }
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Synthesize Target Role Requirements & Check for Missing Skills
  // ──────────────────────────────────────────────────────────────────────────
  const targetReqs = inputs.targetRoleRequirements || [];
  for (const req of targetReqs) {
    const canonicalReq = normalizeSkillName(req);
    if (!canonicalReq) continue;

    const existingEv = skillEvidenceBuckets.get(canonicalReq) || [];
    if (existingEv.length === 0) {
      registerEvidence({
        source: "USER_INPUT",
        type: "TARGET_REQUIREMENT_MISSING",
        skill: formatSkillDisplay(canonicalReq),
        normalizedSkill: canonicalReq,
        description: `Target role requires ${req}, but no evidence exists across Resume, GitHub, or Projects`,
        strength: "WEAK",
        confidence: "HIGH",
        classification: "MISSING",
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Build Summary for each Skill
  // ──────────────────────────────────────────────────────────────────────────
  const skillSummaries: Record<string, SkillEvidenceSummary> = {};
  const conflictingSkills: string[] = [];
  const missingSkills: string[] = [];
  const directSkills: string[] = [];
  const inferredSkills: string[] = [];
  const weakSkills: string[] = [];

  for (const [canonical, items] of skillEvidenceBuckets.entries()) {
    const displayName = items[0]?.skill || formatSkillDisplay(canonical);
    const category = categorizeSkill(canonical);

    const hasDirect = items.some((i) => i.classification === "DIRECT");
    const hasInferred = items.some((i) => i.classification === "INFERRED");
    const hasMissing = items.some((i) => i.classification === "MISSING");
    const hasConflicting = items.some((i) => i.classification === "CONFLICTING");
    const hasWeak = items.some((i) => i.classification === "WEAK");

    let overallClassification: EvidenceClassification = "WEAK";
    let score = 30;
    let confidence: EvidenceConfidence = "LOW";

    if (hasConflicting) {
      overallClassification = "CONFLICTING";
      conflictingSkills.push(displayName);
      score = 25;
      confidence = "MEDIUM";
    } else if (hasMissing) {
      overallClassification = "MISSING";
      missingSkills.push(displayName);
      score = 0;
      confidence = "HIGH";
    } else if (hasDirect) {
      overallClassification = "DIRECT";
      directSkills.push(displayName);

      // Deterministic multi-source scoring
      const uniqueSources = new Set(items.filter((i) => i.classification === "DIRECT").map((i) => i.source));
      if (uniqueSources.size >= 2) {
        confidence = "HIGH";
        score = Math.min(95, 75 + uniqueSources.size * 10);
      } else {
        const strongItems = items.filter((i) => i.strength === "STRONG");
        if (strongItems.length >= 2) {
          confidence = "HIGH";
          score = 85;
        } else if (strongItems.length === 1) {
          confidence = "MEDIUM";
          score = 75;
        } else {
          confidence = "MEDIUM";
          score = 65;
        }
      }
    } else if (hasInferred) {
      overallClassification = "INFERRED";
      inferredSkills.push(displayName);
      confidence = "MEDIUM";
      score = 60;
    } else if (hasWeak) {
      overallClassification = "WEAK";
      weakSkills.push(displayName);
      confidence = "LOW";
      score = 35;
    }

    // Build human-readable summary
    let summary = "";
    if (overallClassification === "DIRECT") {
      summary = `Verified with direct evidence across ${items.map((i) => i.source).join(", ")}.`;
    } else if (overallClassification === "INFERRED") {
      summary = `Inferred from related tooling and frameworks in projects.`;
    } else if (overallClassification === "WEAK") {
      summary = `Claimed in profile but lacks corroborating code repositories or production bullet points.`;
    } else if (overallClassification === "MISSING") {
      summary = `Required for target role, but no verifiable evidence found.`;
    } else if (overallClassification === "CONFLICTING") {
      summary = `Discrepancy detected between claimed proficiency and practical performance.`;
    }

    skillSummaries[canonical] = {
      skill: displayName,
      normalizedSkill: canonical,
      category,
      confidence,
      overallClassification,
      score,
      evidence: items,
      summary,
    };
  }

  // Calculate overall graph confidence
  const totalVerified = directSkills.length + inferredSkills.length;
  let overallConfidence: EvidenceConfidence = "LOW";
  if (totalVerified >= 6 && sourcesCount.RESUME > 0 && sourcesCount.GITHUB > 0) {
    overallConfidence = "HIGH";
  } else if (totalVerified >= 2) {
    overallConfidence = "MEDIUM";
  }

  return {
    skills: skillSummaries,
    allEvidence: evidenceList,
    sourcesCount,
    totalVerifiedSkills: totalVerified,
    conflictingSkills,
    missingSkills,
    directSkills,
    inferredSkills,
    weakSkills,
    overallConfidence,
    extractedAt: new Date().toISOString(),
  };
}
