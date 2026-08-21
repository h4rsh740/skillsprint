import type { ResumeData, JobInput, KeywordAnalysis, AtsResult, ResumeIssue, AnalysisBundle } from "./types";
import { extractJobKeywords, analyzeKeywords, textContainsKeyword } from "./keywords";

// List of action verbs and weak verbs
const ACTION_VERBS = ["developed", "built", "led", "designed", "implemented", "created", "engineered", "architected", "optimized", "automated", "delivered", "launched", "managed", "spearheaded", "streamlined", "reduced", "improved", "increased", "deployed", "integrated", "migrated", "refactored", "collaborated", "mentored", "drove"];
const WEAK_VERBS = ["worked on", "helped with", "responsible for", "made", "did", "participated in", "assisted", "involved in"];

export function analyzeResume(resume: ResumeData, job: JobInput): AnalysisBundle {
  const jobKeywords = extractJobKeywords(job.jobDescription, job.additionalSkills);
  const keywords = analyzeKeywords(resume.rawText, jobKeywords, resume.skills);

  // 1. Keyword Match (30 Points)
  const keywordScore = calculateKeywordScore(keywords, job.additionalSkills);

  // 2. Technical Skills Match (20 Points)
  const skillsScore = calculateSkillsScore(resume, keywords.matched);

  // 3. Experience Relevance (15 Points)
  const experienceScore = calculateExperienceScore(resume, job.jobTitle, keywords.matched);

  // 4. Project Relevance (10 Points)
  const projectScore = calculateProjectScore(resume, keywords.matched);

  // 5. Resume Structure (10 Points)
  const structureScore = calculateStructureScore(resume);

  // 6. Action Verbs (5 Points)
  const verbsScore = calculateVerbsScore(resume);

  // 7. Quantified Achievements (5 Points)
  const quantifiedScore = calculateQuantifiedScore(resume);

  // 8. ATS Formatting Compatibility (5 Points)
  const formattingScore = calculateFormattingScore(resume);

  const totalScore = Math.min(
    100,
    Math.round(
      keywordScore +
      skillsScore +
      experienceScore +
      projectScore +
      structureScore +
      verbsScore +
      quantifiedScore +
      formattingScore
    )
  );

  const ats: AtsResult = {
    score: totalScore,
    breakdown: {
      keywordMatch: Math.round(keywordScore * 10) / 10,
      technicalSkills: Math.round(skillsScore * 10) / 10,
      experienceRelevance: Math.round(experienceScore * 10) / 10,
      projectRelevance: Math.round(projectScore * 10) / 10,
      resumeStructure: Math.round(structureScore * 10) / 10,
      actionVerbs: Math.round(verbsScore * 10) / 10,
      quantifiedAchievements: Math.round(quantifiedScore * 10) / 10,
      formattingCompatibility: Math.round(formattingScore * 10) / 10,
    }
  };

  // Screening chance calculation
  // Formula: ATS Score = 40%, Required Skill Coverage = 20%, Keyword Coverage = 15%, Experience Relevance = 10%, Project Relevance = 10%, Resume Quality = 5%
  const requiredSkillCoverage = job.additionalSkills.length > 0
    ? (job.additionalSkills.filter(s => textContainsKeyword(resume.rawText + " " + resume.skills.join(" "), s)).length / job.additionalSkills.length) * 20
    : 20; // Default to full points if no explicit required skills listed

  const totalKeywords = keywords.matched.length + keywords.missing.length + keywords.weak.length;
  const keywordCoverage = totalKeywords > 0 ? (keywords.matched.length / totalKeywords) * 15 : 15;

  const experienceRelWeight = (experienceScore / 15) * 10;
  const projectRelWeight = (projectScore / 10) * 10;
  const resumeQualityWeight = ((verbsScore + quantifiedScore + formattingScore) / 15) * 5;
  const atsWeight = (totalScore / 100) * 40;

  const screeningChance = Math.min(
    100,
    Math.max(0, Math.round(atsWeight + requiredSkillCoverage + keywordCoverage + experienceRelWeight + projectRelWeight + resumeQualityWeight))
  );

  // Issues detection
  const issues = detectIssues(resume, keywords, job);

  // Positive & Negative Factors
  const { positiveFactors, negativeFactors } = evaluateFactors(ats, keywords, resume, job);

  return {
    keywords,
    ats,
    issues,
    screeningChance,
    positiveFactors,
    negativeFactors,
  };
}

// 1. Keyword Score (30 pts max)
function calculateKeywordScore(keywords: KeywordAnalysis, additionalSkills: string[]): number {
  const total = keywords.matched.length + keywords.missing.length + keywords.weak.length;
  if (total === 0) return 30;

  let score = 0;
  keywords.matched.forEach(kw => {
    const isRequired = additionalSkills.some(s => s.toLowerCase() === kw.toLowerCase());
    score += isRequired ? 3 : 2; // Required gets weight 3, standard gets 2
  });

  keywords.weak.forEach(kw => {
    const isRequired = additionalSkills.some(s => s.toLowerCase() === kw.toLowerCase());
    score += isRequired ? 1.5 : 1; // Weak gets half points
  });

  const maxPossibleScore = (additionalSkills.length * 3) + ((total - additionalSkills.length) * 2);
  const normalized = (score / (maxPossibleScore || 1)) * 30;
  return Math.min(30, normalized);
}

// 2. Technical Skills Match (20 pts max)
function calculateSkillsScore(resume: ResumeData, matchedKeywords: string[]): number {
  if (matchedKeywords.length === 0) return 0;

  let score = 0;
  const skillsSet = new Set(resume.skills.map(s => s.toLowerCase().trim()));

  matchedKeywords.forEach(kw => {
    const kwLower = kw.toLowerCase();
    let kwEvidence = 0;

    // Listed in technical skills section
    if (skillsSet.has(kwLower)) {
      kwEvidence += 1.0;
    }

    // Demonstrated in projects
    const inProjects = resume.projects.some(p => 
      textContainsKeyword(p.name + " " + (p.description || "") + " " + p.bullets.join(" "), kw)
    );
    if (inProjects) {
      kwEvidence += 1.5;
    }

    // Demonstrated in experience
    const inExperience = resume.experience.some(e => 
      textContainsKeyword(e.company + " " + e.position + " " + e.bullets.join(" "), kw)
    );
    if (inExperience) {
      kwEvidence += 2.0;
    }

    // Add highest single evidence or sum up to maximum of 2.0 per skill
    score += Math.min(2.0, kwEvidence);
  });

  const maxTarget = matchedKeywords.length * 2.0;
  const normalized = (score / (maxTarget || 1)) * 20;
  return Math.min(20, normalized);
}

// 3. Experience Relevance (15 pts max)
function calculateExperienceScore(resume: ResumeData, jobTitle: string, matchedKeywords: string[]): number {
  const isFresher = resume.experience.length === 0;

  if (isFresher) {
    // Fresher-aware scoring using Projects relevance
    const projectRel = calculateProjectScore(resume, matchedKeywords);
    return (projectRel / 10) * 12; // Cap at 12/15 for fresher with no work experience but good projects
  }

  let titleMatch = 0;
  let keywordMatchPoints = 0;

  resume.experience.forEach(exp => {
    if (textContainsKeyword(exp.position, jobTitle)) {
      titleMatch = 5; // Direct match of job title in past roles
    }

    matchedKeywords.forEach(kw => {
      if (textContainsKeyword(exp.bullets.join(" "), kw)) {
        keywordMatchPoints += 0.5;
      }
    });
  });

  const experiencePoints = titleMatch + Math.min(10, keywordMatchPoints);
  return Math.min(15, experiencePoints);
}

// 4. Project Relevance (10 pts max)
function calculateProjectScore(resume: ResumeData, matchedKeywords: string[]): number {
  if (resume.projects.length === 0) return 0;

  let score = 0;
  resume.projects.forEach(p => {
    matchedKeywords.forEach(kw => {
      if (textContainsKeyword(p.name + " " + (p.description || "") + " " + p.bullets.join(" "), kw)) {
        score += 1;
      }
    });
  });

  // Base score on quantity & relevance
  const normalized = (score / (resume.projects.length * 2 || 1)) * 10;
  return Math.min(10, normalized);
}

// 5. Resume Structure (10 pts max)
function calculateStructureScore(resume: ResumeData): number {
  let score = 10;

  // Penalize missing sections
  if (!resume.summary || resume.summary.trim().length === 0) score -= 2;
  if (resume.skills.length === 0) score -= 2;
  if (resume.education.length === 0) score -= 2;
  
  const hasExperience = resume.experience.length > 0;
  const hasProjects = resume.projects.length > 0;
  
  if (!hasExperience && !hasProjects) {
    score -= 4; // Penalize heavily if neither experience nor projects exist
  } else if (!hasExperience) {
    // Fresher case, projects exist. Minor structure penalty (1pt) instead of 4
    score -= 1;
  }

  // Penalize large paragraphs
  let hasLongBullet = false;
  resume.experience.forEach(e => {
    e.bullets.forEach(b => {
      if (b.length > 350) hasLongBullet = true;
    });
  });
  resume.projects.forEach(p => {
    p.bullets.forEach(b => {
      if (b.length > 350) hasLongBullet = true;
    });
  });

  if (hasLongBullet) score -= 1;
  if (resume.summary.length > 600) score -= 1;

  return Math.max(0, score);
}

// 6. Action Verbs (5 pts max)
function calculateVerbsScore(resume: ResumeData): number {
  let actionVerbsCount = 0;
  let weakVerbsCount = 0;

  const textToScan = [
    resume.summary,
    ...resume.experience.flatMap(e => e.bullets),
    ...resume.projects.flatMap(p => p.bullets)
  ].join(" ").toLowerCase();

  ACTION_VERBS.forEach(verb => {
    const occurrences = (textToScan.match(new RegExp(`\\b${verb}\\b`, "gi")) || []).length;
    actionVerbsCount += occurrences;
  });

  WEAK_VERBS.forEach(verb => {
    const occurrences = (textToScan.match(new RegExp(`\\b${verb.replace(" ", "\\s")}\\b`, "gi")) || []).length;
    weakVerbsCount += occurrences;
  });

  if (actionVerbsCount === 0) return 0;

  // Scoring based on verb ratios
  const ratio = actionVerbsCount / (actionVerbsCount + weakVerbsCount || 1);
  let score = ratio * 5;

  // Boost for absolute quantity of action verbs
  if (actionVerbsCount > 10) score += 1;
  if (actionVerbsCount > 20) score += 1;

  return Math.min(5, Math.max(0, score));
}

// 7. Quantified Achievements (5 pts max)
function calculateQuantifiedScore(resume: ResumeData): number {
  const textToScan = [
    ...resume.experience.flatMap(e => e.bullets),
    ...resume.projects.flatMap(p => p.bullets)
  ].join(" ");

  // Match percentages, money values ($10k, 5M, etc.), metrics (e.g. 50%, 10x, 2.5s, 500k users)
  const percentMatches = (textToScan.match(/\d+%/g) || []).length;
  const currencyMatches = (textToScan.match(/\$\d+/g) || []).length;
  const numberMatches = (textToScan.match(/\b\d+(?:\.\d+)?\s*(?:x|times|users|users|clients|seconds|ms|hours|days|weeks|months|years|pages|records|gb|mb|tb|queries|percent)\b/gi) || []).length;

  const totalMetrics = percentMatches + currencyMatches + numberMatches;
  
  if (totalMetrics === 0) return 0;
  if (totalMetrics === 1) return 2;
  if (totalMetrics === 2) return 3.5;
  return 5; // 3 or more metrics gets full marks
}

// 8. ATS Formatting Compatibility (5 pts max)
function calculateFormattingScore(resume: ResumeData): number {
  let score = 5;

  // Basic checks
  if (resume.rawText.length < 200) score -= 2; // Scanned PDF or empty
  if (!resume.email || !resume.phone) score -= 1.5; // Missing contact info
  
  // Check section headings
  const textLower = resume.rawText.toLowerCase();
  const hasSkillsHeading = /skills|technical\s+skills|core\s+competencies/i.test(textLower);
  const hasEducationHeading = /education|academic/i.test(textLower);
  const hasExperienceHeading = /experience|work\s+history|employment/i.test(textLower);

  if (!hasSkillsHeading) score -= 0.5;
  if (!hasEducationHeading) score -= 0.5;
  if (!hasExperienceHeading && resume.experience.length > 0) score -= 0.5;

  return Math.max(0, score);
}

function detectIssues(resume: ResumeData, keywords: KeywordAnalysis, job: JobInput): ResumeIssue[] {
  const issues: ResumeIssue[] = [];

  // Summary checks
  if (!resume.summary || resume.summary.trim().length === 0) {
    issues.push({
      id: "issue-summary-missing",
      severity: "Critical",
      section: "Summary",
      title: "Missing Professional Summary",
      description: "No professional summary was detected in your resume.",
      whyItMatters: "A summary is the first thing a recruiter sees and gives them a quick overview of your profile.",
      recommendation: "Create a 3-4 sentence professional summary focusing on your key skills, experience, and value proposition."
    });
  } else if (resume.summary.length < 100) {
    issues.push({
      id: "issue-summary-weak",
      severity: "Medium",
      section: "Summary",
      title: "Short/Weak Professional Summary",
      description: "Your professional summary is very short and lacks details.",
      whyItMatters: "Short summaries fail to capture your professional identity and miss opportunities to incorporate job keywords.",
      recommendation: "Expand your summary to highlight key technical skills, projects, and target role alignment."
    });
  } else {
    // Generic objective check
    const GENERIC_OBJECTIVE = ["seeking a challenging", "looking for an opportunity", "to obtain a position", "utilize my skills", "hardworking individual", "team player looking", "a highly motivated"];
    const hasGeneric = GENERIC_OBJECTIVE.some(g => resume.summary.toLowerCase().includes(g));
    if (hasGeneric) {
      issues.push({
        id: "issue-summary-generic",
        severity: "High",
        section: "Summary",
        title: "Generic Career Objective Detected",
        description: "Your summary contains generic objective statements rather than a value-driven summary.",
        whyItMatters: "Recruiters prefer professional summaries that detail what you bring to the table rather than generic statements about what you want.",
        recommendation: "Rewrite your summary to highlight achievements, key skills, and your engineering capabilities."
      });
    }
  }

  // Keywords checks
  if (keywords.missing.length > 5) {
    issues.push({
      id: "issue-keywords-missing",
      severity: "Critical",
      section: "Keywords",
      title: "Significant Missing Job Keywords",
      description: `Your resume is missing ${keywords.missing.length} core keywords identified in the job description.`,
      whyItMatters: "ATS filters resumes based on job keyword matching. Missing critical keywords will flag your resume as unqualified.",
      recommendation: `Integrate key missing keywords such as: ${keywords.missing.slice(0, 5).join(", ")} into your experience and projects.`
    });
  }

  if (keywords.weak.length > 0) {
    issues.push({
      id: "issue-keywords-weak",
      severity: "Medium",
      section: "Keywords",
      title: "Weakly Represented Keywords",
      description: `Keywords such as ${keywords.weak.slice(0, 3).join(", ")} are only listed in your skills section and lack work context.`,
      whyItMatters: "Modern ATS parsers rank resumes higher when keywords are matched within employment history rather than just skills lists.",
      recommendation: "Incorporate these weak keywords into the descriptions of your projects or work experience bullets."
    });
  }

  // Action Verbs
  const actionVerbsScore = calculateVerbsScore(resume);
  if (actionVerbsScore < 3) {
    issues.push({
      id: "issue-verbs-weak",
      severity: "High",
      section: "Action Verbs",
      title: "Weak Action Verbs & Passive Openers",
      description: "Your experience bullets use passive phrases like 'worked on' or 'responsible for'.",
      whyItMatters: "Passive phrasing makes you seem like a passive participant rather than an active owner of achievements.",
      recommendation: "Replace passive phrases with strong action verbs (e.g., 'Led', 'Built', 'Engineered', 'Optimized')."
    });
  }

  // Quantified Achievements
  const quantifiedScore = calculateQuantifiedScore(resume);
  if (quantifiedScore < 3.5) {
    issues.push({
      id: "issue-quantified-missing",
      severity: "High",
      section: "Experience",
      title: "Lacks Quantifiable Metrics and Outcomes",
      description: "Few or no numbers, metrics, or percentages were found in your experience bullets.",
      whyItMatters: "Hiring managers look for evidence of impact. Bullet points that lack metrics look like a list of tasks rather than accomplishments.",
      recommendation: "Quantify your achievements by adding percentages, latency improvements, cost reductions, or user numbers where applicable."
    });
  }

  // Contact Information
  if (!resume.email) {
    issues.push({
      id: "issue-email-missing",
      severity: "Critical",
      section: "Contact Info",
      title: "Missing Email Address",
      description: "No email address could be extracted from your resume.",
      whyItMatters: "Employers have no way to contact you for interviews.",
      recommendation: "Add a professional email address to the top of your resume."
    });
  }
  if (!resume.phone) {
    issues.push({
      id: "issue-phone-missing",
      severity: "Critical",
      section: "Contact Info",
      title: "Missing Phone Number",
      description: "No phone number could be extracted from your resume.",
      whyItMatters: "Recruiters cannot call you for initial phone screens.",
      recommendation: "Add a valid phone number to your contact details."
    });
  }

  // GitHub check for developer roles
  const isDevRole = /developer|engineer|coder|architect|programmer/i.test(job.jobTitle);
  if (isDevRole && !resume.github) {
    issues.push({
      id: "issue-github-missing",
      severity: "High",
      section: "Contact Info",
      title: "Missing GitHub Link",
      description: "No GitHub profile link was detected in your contact info.",
      whyItMatters: "For engineering roles, recruiters look for GitHub profiles to review code quality and projects.",
      recommendation: "Add a link to your active GitHub profile at the top of your resume."
    });
  }

  // Paragraph lengths
  let hasTooLongParagraphs = false;
  resume.experience.forEach(exp => {
    exp.bullets.forEach(b => {
      if (b.length > 300) hasTooLongParagraphs = true;
    });
  });
  if (hasTooLongParagraphs) {
    issues.push({
      id: "issue-paragraph-length",
      severity: "Medium",
      section: "Experience",
      title: "Long Bullet Points/Paragraphs Detected",
      description: "Some of your experience bullet points contain very long blocks of text.",
      whyItMatters: "Long blocks of text are difficult for human recruiters to scan quickly and can be truncated in some ATS parsers.",
      recommendation: "Break long bullets into 2 separate concise bullets, keeping each under 2-3 lines."
    });
  }

  return issues;
}

function evaluateFactors(
  ats: AtsResult,
  keywords: KeywordAnalysis,
  resume: ResumeData,
  job: JobInput
): { positiveFactors: string[]; negativeFactors: string[] } {
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  // Positives
  if (ats.score >= 75) {
    positiveFactors.push("High ATS compatibility score.");
  }
  if (keywords.matched.length > 5) {
    positiveFactors.push(`Strong overlap with job keywords (${keywords.matched.length} matched).`);
  }
  if (calculateVerbsScore(resume) >= 4) {
    positiveFactors.push("Excellent use of active and impact-oriented verbs.");
  }
  if (calculateQuantifiedScore(resume) >= 4) {
    positiveFactors.push("Strong presence of quantified achievements and performance metrics.");
  }
  if (resume.experience.some(e => textContainsKeyword(e.position, job.jobTitle))) {
    positiveFactors.push("Direct past experience matching the target job title.");
  }

  // Negatives
  if (keywords.missing.length > 5) {
    negativeFactors.push(`Missing critical job keywords (${keywords.missing.length} missing).`);
  }
  if (calculateVerbsScore(resume) < 3) {
    negativeFactors.push("Excessive use of passive phrasing (e.g. 'responsible for', 'helped with').");
  }
  if (calculateQuantifiedScore(resume) < 3) {
    negativeFactors.push("Lack of quantifiable outcomes or numeric evidence.");
  }
  if (resume.experience.length === 0 && resume.projects.length === 0) {
    negativeFactors.push("No work experience or engineering projects listed.");
  }
  if (!resume.summary) {
    negativeFactors.push("Missing professional summary section.");
  }

  return { positiveFactors, negativeFactors };
}
