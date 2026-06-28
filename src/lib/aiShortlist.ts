// src/lib/aiShortlist.ts
// AI Scoring Engine for Candidate Shortlisting

import type { Candidate } from "./candidateData";

export interface JobRequirements {
  jobRole: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperience: number;
  education: string;
  location: string;
  employmentType: string;
  salaryRange: string;
  workMode: string;
  jobDescription: string;
}

export interface ScoredCandidate extends Candidate {
  matchScore: number;
  skillMatchScore: number;
  experienceScore: number;
  educationScore: number;
  resumeMatchScore: number;
  atsMatchScore: number;
  certificationScore: number;
  profileScore: number;
  recommendation: "Highly Recommended" | "Recommended" | "Consider" | "Not Suitable";
  recommendationEmoji: string;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  interviewProbability: number;
  hiringConfidence: "High" | "Medium" | "Low";
  aiNotes: string;
  rank: number;
}

// Degree level mapping
const DEGREE_LEVELS: Record<string, number> = {
  "Ph.D": 5,
  "M.Tech": 4,
  "M.S.": 4,
  "M.Sc": 4,
  "MBA": 4,
  "MCA": 3,
  "B.Tech": 3,
  "B.E.": 3,
  "B.Sc": 2,
  "BCA": 2,
};

const EDU_REQUIREMENTS: Record<string, number> = {
  "Any": 1,
  "Bachelor's": 2,
  "Master's": 4,
  "PhD": 5,
};

// Extract skills from job description text
function extractSkillsFromJD(jd: string, requiredSkills: string[]): string[] {
  if (requiredSkills.length > 0) return requiredSkills;
  const knownSkills = [
    "React","TypeScript","JavaScript","Node.js","Python","Java","Go","C++","C#","Ruby",
    "Next.js","Vue.js","Angular","Tailwind","GraphQL","REST API","PostgreSQL","MongoDB",
    "Redis","Docker","Kubernetes","AWS","GCP","Azure","Terraform","CI/CD","Git",
    "Machine Learning","Deep Learning","TensorFlow","PyTorch","Scikit-learn","NLP",
    "Pandas","NumPy","SQL","Spark","Kafka","Airflow","dbt","Snowflake","React Native",
    "Flutter","Swift","Kotlin","iOS","Android","Firebase","FastAPI","Spring Boot",
    "Microservices","DevOps","Linux","Bash","Prometheus","Grafana","Agile","JIRA","Figma"
  ];
  const jdLower = jd.toLowerCase();
  return knownSkills.filter(skill => jdLower.includes(skill.toLowerCase()));
}

// Jaccard similarity for skill matching
function skillMatch(candidateSkills: string[], requiredSkills: string[]): {
  score: number;
  matched: string[];
  missing: string[];
} {
  if (requiredSkills.length === 0) {
    return { score: 0.6, matched: candidateSkills.slice(0, 3), missing: [] };
  }
  const candidateLower = candidateSkills.map(s => s.toLowerCase());
  const matched: string[] = [];
  const missing: string[] = [];
  for (const req of requiredSkills) {
    const reqLower = req.toLowerCase();
    const found = candidateLower.some(cs => 
      cs === reqLower || cs.includes(reqLower) || reqLower.includes(cs)
    );
    if (found) {
      matched.push(req);
    } else {
      missing.push(req);
    }
  }
  const score = matched.length / requiredSkills.length;
  return { score, matched, missing };
}

// Experience scoring with sigmoid-like curve
function experienceScore(candidateExp: number, minRequired: number): number {
  if (minRequired === 0) {
    return Math.min(1, 0.5 + candidateExp * 0.08);
  }
  if (candidateExp >= minRequired) {
    const bonus = Math.min(0.2, (candidateExp - minRequired) * 0.04);
    return Math.min(1, 0.75 + bonus);
  }
  const ratio = candidateExp / minRequired;
  if (ratio >= 0.8) return 0.65;
  if (ratio >= 0.6) return 0.45;
  if (ratio >= 0.4) return 0.3;
  return 0.15;
}

// Education scoring
function educationScore(candidateDegree: string, requiredEdu: string): number {
  const candidateLevel = DEGREE_LEVELS[candidateDegree] || 2;
  const requiredLevel = EDU_REQUIREMENTS[requiredEdu] || 1;
  if (candidateLevel >= requiredLevel) return 1;
  if (candidateLevel === requiredLevel - 1) return 0.7;
  return 0.4;
}

// Certification relevance score
function certScore(certifications: string[], requiredSkills: string[]): number {
  if (certifications.length === 0) return 0;
  if (requiredSkills.length === 0) return Math.min(1, certifications.length * 0.33);
  const reqLower = requiredSkills.map(s => s.toLowerCase());
  const relevant = certifications.filter(cert => {
    const certLower = cert.toLowerCase();
    return reqLower.some(req => certLower.includes(req) || req.includes(certLower.split(" ")[0]));
  });
  return Math.min(1, (relevant.length / certifications.length) * 0.8 + (certifications.length >= 2 ? 0.2 : 0.1));
}

// Profile presence score (github, portfolio, linkedin)
function profileScore(github: string, portfolio: string, linkedin: string): number {
  let score = 0;
  if (github) score += 0.45;
  if (portfolio) score += 0.35;
  if (linkedin) score += 0.2;
  return score;
}

// Generate strengths based on scores
function generateStrengths(candidate: Candidate, matchedSkills: string[], skillScore: number, expScore: number): string[] {
  const strengths: string[] = [];
  if (skillScore >= 0.8) strengths.push(`Strong skill alignment (${matchedSkills.slice(0,3).join(", ")})`);
  if (candidate.experience >= 5) strengths.push(`${candidate.experience}+ years of solid industry experience`);
  if (candidate.resumeScore >= 80) strengths.push("Well-structured, high-quality resume");
  if (candidate.atsScore >= 75) strengths.push("Excellent ATS optimization");
  if (candidate.certifications.length >= 2) strengths.push(`${candidate.certifications.length} relevant professional certifications`);
  if (candidate.github) strengths.push("Active GitHub profile with open-source contributions");
  if (candidate.portfolio) strengths.push("Professional portfolio demonstrating real-world projects");
  if (candidate.projects.length >= 3) strengths.push(`${candidate.projects.length} impactful projects with measurable outcomes`);
  const premiumColleges = ["IIT","MIT","Stanford","Carnegie Mellon","BITS","IISc","NUS","Berkeley"];
  if (premiumColleges.some(c => candidate.education.college.includes(c))) {
    strengths.push(`Premier institution — ${candidate.education.college}`);
  }
  if (candidate.noticePeriod === "Immediate" || candidate.noticePeriod === "15 days") {
    strengths.push("Available immediately or on short notice");
  }
  return strengths.slice(0, 5);
}

// Generate weaknesses based on scores
function generateWeaknesses(candidate: Candidate, missingSkills: string[], skillScore: number, expScore: number, minExp: number): string[] {
  const weaknesses: string[] = [];
  if (missingSkills.length > 0) weaknesses.push(`Missing key skills: ${missingSkills.slice(0,3).join(", ")}`);
  if (candidate.experience < minExp && minExp > 0) weaknesses.push(`Experience (${candidate.experience}y) below requirement (${minExp}y)`);
  if (candidate.resumeScore < 65) weaknesses.push("Resume needs improvement in structure and formatting");
  if (candidate.atsScore < 60) weaknesses.push("Low ATS score — resume may be filtered by automated systems");
  if (candidate.certifications.length === 0) weaknesses.push("No professional certifications listed");
  if (!candidate.github && !candidate.portfolio) weaknesses.push("No public portfolio or GitHub presence");
  if (candidate.noticePeriod === "90 days") weaknesses.push("Long notice period (90 days)");
  return weaknesses.slice(0, 4);
}

// Main scoring function
export function scoreCandidate(candidate: Candidate, job: JobRequirements): Omit<ScoredCandidate, "rank"> {
  const requiredSkills = extractSkillsFromJD(job.jobDescription, job.requiredSkills);
  
  // Skill Match (40%)
  const { score: sScore, matched, missing } = skillMatch(candidate.skills, requiredSkills);
  const skillMatchScore = Math.round(sScore * 100);

  // Experience (20%)
  const eScore = experienceScore(candidate.experience, job.minExperience);
  const experienceMatchScore = Math.round(eScore * 100);

  // Education (10%)
  const edScore = educationScore(candidate.education.degree, job.education || "Any");
  const educationMatchScore = Math.round(edScore * 100);

  // Resume Score (10%) — normalized
  const resumeMatchScore = Math.round((candidate.resumeScore / 95) * 100);

  // ATS Score (10%) — normalized
  const atsMatchScore = Math.round((candidate.atsScore / 92) * 100);

  // Certifications (5%)
  const certMatchScore = Math.round(certScore(candidate.certifications, requiredSkills) * 100);

  // GitHub/Portfolio (5%)
  const profileMatchScore = Math.round(profileScore(candidate.github, candidate.portfolio, candidate.linkedin) * 100);

  // Weighted overall score
  const raw = (
    sScore * 0.40 +
    eScore * 0.20 +
    edScore * 0.10 +
    (candidate.resumeScore / 95) * 0.10 +
    (candidate.atsScore / 92) * 0.10 +
    certScore(candidate.certifications, requiredSkills) * 0.05 +
    profileScore(candidate.github, candidate.portfolio, candidate.linkedin) * 0.05
  );

  const matchScore = Math.min(99, Math.max(1, Math.round(raw * 100)));

  // Recommendation tier
  let recommendation: ScoredCandidate["recommendation"];
  let recommendationEmoji: string;
  if (matchScore >= 78) {
    recommendation = "Highly Recommended";
    recommendationEmoji = "⭐";
  } else if (matchScore >= 60) {
    recommendation = "Recommended";
    recommendationEmoji = "✅";
  } else if (matchScore >= 42) {
    recommendation = "Consider";
    recommendationEmoji = "⚠";
  } else {
    recommendation = "Not Suitable";
    recommendationEmoji = "❌";
  }

  // Interview probability
  const interviewProbability = Math.min(98, Math.max(5, Math.round(
    matchScore * 0.7 + 
    (candidate.resumeScore / 100) * 15 + 
    (candidate.certifications.length * 3)
  )));

  // Hiring confidence
  const hiringConfidence: ScoredCandidate["hiringConfidence"] = 
    matchScore >= 75 ? "High" : matchScore >= 50 ? "Medium" : "Low";

  const strengths = generateStrengths(candidate, matched, sScore, eScore);
  const weaknesses = generateWeaknesses(candidate, missing, sScore, eScore, job.minExperience);

  // AI Notes
  const roleMatch = job.jobRole ? 
    (candidate.role.toLowerCase().includes(job.jobRole.toLowerCase().split(" ")[0]) ? "Role aligns well." : "Different role background.") 
    : "";
  const aiNotes = `${matchScore >= 70 ? "Strong candidate" : matchScore >= 50 ? "Viable candidate" : "Weak match"} for ${job.jobRole || "this position"}. ${matched.length}/${requiredSkills.length || candidate.skills.length} skills matched. ${roleMatch} ${hiringConfidence} hiring confidence.`.trim();

  return {
    ...candidate,
    matchScore,
    skillMatchScore,
    experienceScore: experienceMatchScore,
    educationScore: educationMatchScore,
    resumeMatchScore,
    atsMatchScore,
    certificationScore: certMatchScore,
    profileScore: profileMatchScore,
    recommendation,
    recommendationEmoji,
    matchedSkills: matched,
    missingSkills: missing,
    strengths,
    weaknesses,
    interviewProbability,
    hiringConfidence,
    aiNotes,
  };
}

export function rankCandidates(candidates: Candidate[], job: JobRequirements): ScoredCandidate[] {
  const scored = candidates.map(c => scoreCandidate(c, job));
  scored.sort((a, b) => b.matchScore - a.matchScore || b.resumeScore - a.resumeScore);
  return scored.map((c, i) => ({ ...c, rank: i + 1 }));
}

export function getShortlisted(ranked: ScoredCandidate[], topN = 50): ScoredCandidate[] {
  return ranked.filter(c => c.matchScore >= 40).slice(0, topN);
}

export function getInsights(ranked: ScoredCandidate[]) {
  const skillFreq: Record<string, number> = {};
  ranked.forEach(c => c.skills.forEach(s => { skillFreq[s] = (skillFreq[s] || 0) + 1; }));
  const topSkills = Object.entries(skillFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  const missingFreq: Record<string, number> = {};
  ranked.forEach(c => c.missingSkills.forEach(s => { missingFreq[s] = (missingFreq[s] || 0) + 1; }));
  const skillGaps = Object.entries(missingFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, count]) => ({ skill, count }));

  const expBuckets = { "0-2": 0, "3-5": 0, "6-9": 0, "10+": 0 };
  ranked.forEach(c => {
    if (c.experience <= 2) expBuckets["0-2"]++;
    else if (c.experience <= 5) expBuckets["3-5"]++;
    else if (c.experience <= 9) expBuckets["6-9"]++;
    else expBuckets["10+"]++;
  });
  const expDistribution = Object.entries(expBuckets).map(([range, count]) => ({ range, count }));

  const collegeFreq: Record<string, number> = {};
  ranked.slice(0, 50).forEach(c => {
    collegeFreq[c.education.college] = (collegeFreq[c.education.college] || 0) + 1;
  });
  const topColleges = Object.entries(collegeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([college, count]) => ({ college, count }));

  const avgATS = Math.round(ranked.reduce((s, c) => s + c.atsScore, 0) / ranked.length);
  const avgMatch = Math.round(ranked.reduce((s, c) => s + c.matchScore, 0) / ranked.length);

  const recommended = ranked.filter(c => c.recommendation === "Highly Recommended" || c.recommendation === "Recommended");

  return { topSkills, skillGaps, expDistribution, topColleges, avgATS, avgMatch, recommended };
}
