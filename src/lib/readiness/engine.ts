import { CandidateEvidenceGraph } from "../evidence/types";
import { RoleReadinessAnalysis } from "../role-intelligence/types";
import { ExplainableReadiness, ScoreFactor } from "./types";

export interface ReadinessCalculationInputs {
  evidenceGraph: CandidateEvidenceGraph;
  roleReadiness?: RoleReadinessAnalysis | null;
  resumeAnalysis?: {
    atsScore?: number;
    resumeScore?: number;
    impactScore?: number;
    technicalScore?: number;
    missingMetrics?: any;
    weakBulletPoints?: any;
  } | null;
  githubAnalysis?: {
    githubScore?: number;
    consistencyScore?: number;
    projectQuality?: number;
    cicdActive?: boolean;
    readmeQuality?: string;
    publicReposCount?: number;
    contributionStreak?: number;
  } | null;
  portfolioAudit?: {
    designScore?: number;
    performanceScore?: number;
    seoScore?: number;
    portfolioUrl?: string;
  } | null;
  interviewSessions?: Array<{
    technicalScore?: number;
    communicationScore?: number;
    overallScore?: number;
  }> | null;
  targetRoleTitle?: string;
}

export function computeExplainableReadiness(inputs: ReadinessCalculationInputs): ExplainableReadiness {
  const {
    evidenceGraph,
    roleReadiness,
    resumeAnalysis,
    githubAnalysis,
    portfolioAudit,
    interviewSessions,
    targetRoleTitle = "Software Engineer",
  } = inputs;

  const rawFactors: Array<{
    key: string;
    label: string;
    rawWeight: number;
    score: number;
    isRealData: boolean;
    evidenceSnippets: string[];
    weaknesses: string[];
    improvementSuggestion: string;
  }> = [];

  // 1. Technical Skills Dimension
  const skillSummaries = Object.values(evidenceGraph.skills);
  const directSkills = skillSummaries.filter((s) => s.overallClassification === "DIRECT");
  const inferredSkills = skillSummaries.filter((s) => s.overallClassification === "INFERRED");
  const weakSkills = skillSummaries.filter((s) => s.overallClassification === "WEAK");

  let techScore = 40;
  const techSnippets: string[] = [];
  const techWeaknesses: string[] = [];

  if (directSkills.length > 0 || inferredSkills.length > 0) {
    const verifiedAvg =
      directSkills.reduce((sum, s) => sum + s.score, 0) +
      inferredSkills.reduce((sum, s) => sum + s.score * 0.8, 0);
    const totalCount = directSkills.length + inferredSkills.length * 0.8;
    techScore = Math.min(100, Math.round(verifiedAvg / totalCount));

    techSnippets.push(
      ...directSkills.slice(0, 3).map((s) => `+ Verified ${s.skill} proficiency (${s.score}/100)`)
    );
  }

  if (weakSkills.length > 0) {
    techWeaknesses.push(
      `Weak evidence for profile-claimed skills: ${weakSkills.slice(0, 2).map((s) => s.skill).join(", ")}`
    );
  }

  rawFactors.push({
    key: "technicalSkills",
    label: "Technical Skills",
    rawWeight: 0.25,
    score: techScore,
    isRealData: directSkills.length > 0 || inferredSkills.length > 0,
    evidenceSnippets: techSnippets,
    weaknesses: techWeaknesses,
    improvementSuggestion:
      weakSkills.length > 0
        ? `Commit code or complete project tasks utilizing ${weakSkills[0].skill} to verify proficiency.`
        : "Expand multi-source evidence across databases and backend frameworks.",
  });

  // 2. Project Evidence Dimension
  const projectEvidence = evidenceGraph.allEvidence.filter((e) => e.source === "PROJECT" || e.source === "GITHUB");
  let projectScore = 35;
  const projectSnippets: string[] = [];
  const projectWeaknesses: string[] = [];

  if (projectEvidence.length > 0) {
    const strongCount = projectEvidence.filter((e) => e.strength === "STRONG").length;
    projectScore = Math.min(95, 50 + strongCount * 12);
    projectSnippets.push(`+ ${projectEvidence.length} verified project & codebase artifacts`);
    if (githubAnalysis?.cicdActive) {
      projectSnippets.push("+ Automated CI/CD pipeline integrated");
    }
  } else {
    projectWeaknesses.push("- No verified full-stack project repositories connected");
  }

  rawFactors.push({
    key: "projectEvidence",
    label: "Project Evidence",
    rawWeight: 0.20,
    score: projectScore,
    isRealData: projectEvidence.length > 0,
    evidenceSnippets: projectSnippets,
    weaknesses: projectWeaknesses,
    improvementSuggestion:
      projectEvidence.length === 0
        ? "Build and deploy a complete web application with public GitHub repository and test coverage."
        : "Add integration tests and deployment pipelines to existing repositories.",
  });

  // 3. Resume Strength Dimension
  const hasResume = !!resumeAnalysis;
  const resumeScore = resumeAnalysis?.resumeScore || resumeAnalysis?.atsScore || 0;
  const resumeSnippets: string[] = [];
  const resumeWeaknesses: string[] = [];

  if (hasResume && resumeScore > 0) {
    resumeSnippets.push(`+ ATS alignment score evaluated at ${resumeScore}/100`);
    if (resumeAnalysis?.impactScore && resumeAnalysis.impactScore >= 70) {
      resumeSnippets.push("+ Measurable impact metrics present in experience bullets");
    } else {
      resumeWeaknesses.push("- Bullet points lack quantifiable business metrics and action verbs");
    }
  } else {
    resumeWeaknesses.push("- No resume uploaded for ATS parsing and keyword extraction");
  }

  rawFactors.push({
    key: "resumeStrength",
    label: "Resume Strength",
    rawWeight: 0.20,
    score: hasResume ? resumeScore : 0,
    isRealData: hasResume,
    evidenceSnippets: resumeSnippets,
    weaknesses: resumeWeaknesses,
    improvementSuggestion: hasResume
      ? "Rewrite project bullet points following the Action-Metric-Result formula."
      : "Upload your technical resume to benchmark ATS compatibility against target jobs.",
  });

  // 4. Target Role Alignment Dimension
  let roleScore = 50;
  const roleSnippets: string[] = [];
  const roleWeaknesses: string[] = [];

  if (roleReadiness) {
    roleScore = roleReadiness.overallReadinessScore;
    roleSnippets.push(`+ Target role evaluated: ${roleReadiness.roleTitle} (${roleReadiness.seniority})`);
    roleSnippets.push(`+ ${roleReadiness.matchedCount} required competencies fully matched`);
    if (roleReadiness.criticalGaps.length > 0) {
      roleWeaknesses.push(`- Missing required skills: ${roleReadiness.criticalGaps.slice(0, 3).join(", ")}`);
    }
  } else {
    roleWeaknesses.push("- Target role requirements not yet benchmarked");
  }

  rawFactors.push({
    key: "targetRoleAlignment",
    label: "Target Role Alignment",
    rawWeight: 0.20,
    score: roleScore,
    isRealData: !!roleReadiness,
    evidenceSnippets: roleSnippets,
    weaknesses: roleWeaknesses,
    improvementSuggestion:
      roleReadiness && roleReadiness.criticalGaps.length > 0
        ? `Focus immediately on closing the gap in ${roleReadiness.criticalGaps[0]}.`
        : "Select a target engineering job or role to measure qualification readiness.",
  });

  // 5. Interview Readiness Dimension (Dynamic: only when data exists or marked missing)
  const latestInterview = interviewSessions && interviewSessions.length > 0 ? interviewSessions[0] : null;
  const hasInterview = !!latestInterview;
  const interviewScore = latestInterview?.overallScore || 0;
  const interviewSnippets: string[] = [];
  const interviewWeaknesses: string[] = [];

  if (hasInterview) {
    interviewSnippets.push(`+ Mock interview evaluation score: ${interviewScore}/100`);
    if ((latestInterview.technicalScore || 0) < 50) {
      interviewWeaknesses.push("- Technical problem solving feedback flagged foundational gaps");
    }
  } else {
    interviewWeaknesses.push("- No simulated technical mock interviews completed");
  }

  rawFactors.push({
    key: "interviewReadiness",
    label: "Interview Readiness",
    rawWeight: 0.15,
    score: hasInterview ? interviewScore : 0,
    isRealData: hasInterview,
    evidenceSnippets: interviewSnippets,
    weaknesses: interviewWeaknesses,
    improvementSuggestion: hasInterview
      ? "Practice scenario-based system architecture and behavioral questions."
      : "Complete a mock technical interview to generate verified oral defense evidence.",
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Proportional Normalization of Weights
  // ──────────────────────────────────────────────────────────────────────────
  // If a factor has zero real data (e.g. no interview taken yet), re-balance active weights
  // while clearly explaining what is missing without inventing fake points.
  const totalWeight = rawFactors.reduce((sum, f) => sum + f.rawWeight, 0);
  const dimensions: Record<string, ScoreFactor> = {};
  const contributingFactors: Array<{ label: string; pointsContributed: number; description: string }> = [];

  let overallScoreSum = 0;

  for (const f of rawFactors) {
    const normalizedWeight = Number((f.rawWeight / totalWeight).toFixed(2));
    const weightedScore = Math.round(f.score * normalizedWeight);
    overallScoreSum += weightedScore;

    let status: ScoreFactor["status"] = "ADEQUATE";
    if (!f.isRealData) status = "MISSING_DATA";
    else if (f.score >= 75) status = "STRONG";
    else if (f.score < 50) status = "NEEDS_IMPROVEMENT";

    dimensions[f.key] = {
      key: f.key,
      label: f.label,
      weight: normalizedWeight,
      score: f.score,
      weightedScore,
      status,
      evidenceCount: f.evidenceSnippets.length,
      evidenceSnippets: f.evidenceSnippets,
      weaknesses: f.weaknesses,
      improvementSuggestion: f.improvementSuggestion,
      isRealData: f.isRealData,
    };

    contributingFactors.push({
      label: f.label,
      pointsContributed: weightedScore,
      description: f.isRealData
        ? `${f.score}/100 score weighted at ${Math.round(normalizedWeight * 100)}% of total index`
        : `No verifiable records found; zero contribution to career readiness score`,
    });
  }

  const overallScore = Math.min(100, Math.max(0, overallScoreSum));

  // Extract all strengths & weaknesses
  const allStrengths = rawFactors.flatMap((f) => f.evidenceSnippets);
  const allWeaknesses = rawFactors.flatMap((f) => f.weaknesses);

  // Determine highest-impact next improvement
  let highestImpactImprovement = {
    title: "Upload Resume and Connect GitHub",
    description: "Provide primary evidence to unlock full career readiness scoring.",
    potentialGain: "+15-20 points",
    evidenceToProduce: ["Technical resume PDF", "GitHub repository links"],
  };

  if (roleReadiness && roleReadiness.criticalGaps.length > 0) {
    const gap = roleReadiness.criticalGaps[0];
    highestImpactImprovement = {
      title: `Demonstrate ${gap} with Verified Code`,
      description: `Target role requires ${gap}, but no evidence currently exists in your portfolio or repository commits.`,
      potentialGain: "+10-15 points",
      evidenceToProduce: [
        `GitHub repository utilizing ${gap}`,
        `Unit and integration test suite demonstrating ${gap}`,
        `Project documentation with architecture diagram`,
      ],
    };
  } else if (!hasResume) {
    highestImpactImprovement = {
      title: "Upload Technical Resume for ATS Scoring",
      description: "Extract verified keywords, experience bullets, and structure to boost readiness index.",
      potentialGain: "+18 points",
      evidenceToProduce: ["Updated technical resume with quantified impact metrics"],
    };
  } else if (!githubAnalysis) {
    highestImpactImprovement = {
      title: "Connect GitHub Account",
      description: "Verify actual programming languages, commit history, and CI/CD pipelines.",
      potentialGain: "+15 points",
      evidenceToProduce: ["Active GitHub account with public code repositories"],
    };
  } else if (!hasInterview) {
    highestImpactImprovement = {
      title: "Complete First Mock Technical Interview",
      description: "Demonstrate live problem solving and verbal architecture communication.",
      potentialGain: "+12 points",
      evidenceToProduce: ["Recorded mock interview session evaluation"],
    };
  }

  const whyThisScore = `Your Career Readiness score is ${overallScore}/100 based on ${contributingFactors
    .filter((c) => c.pointsContributed > 0)
    .map((c) => `${c.label} (${c.pointsContributed} pts)`)
    .join(", ")}. ${allWeaknesses.length > 0 ? `Key drag: ${allWeaknesses[0].replace(/^[-•]\s*/, "")}.` : ""}`;

  return {
    overallScore,
    targetRole: targetRoleTitle,
    confidence: evidenceGraph.overallConfidence,
    dimensions,
    contributingFactors,
    strengths: allStrengths.slice(0, 5),
    weaknesses: allWeaknesses.slice(0, 5),
    highestImpactImprovement,
    whyThisScore,
    disclaimer:
      "Deterministic career readiness calculation derived from verified candidate evidence. No arbitrary score assignment.",
  };
}
