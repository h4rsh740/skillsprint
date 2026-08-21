import { analyzeWithOpenRouter } from "@/lib/ai/openrouter";
import { buildJobMatchExplanationPrompt } from "@/lib/ai/prompts/job-analysis";

export type StudentProfileContext = {
  targetRole?: string;
  skills: string[];
  verifiedGithubSkills?: string[];
  experienceYears?: number;
  education?: string;
  location?: string;
  preferredWorkMode?: string;
  projects?: { name: string; technologies: string[] }[];
  resumeText?: string;
  resumeAtsScore?: number;
};

export type JobContext = {
  id: string;
  company: string;
  title: string;
  description: string;
  location: string;
  workMode: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears?: number;
};

export type SkillGapItem = {
  skill: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  reason: string;
  recommendation: string;
};

export type MatchResult = {
  overallMatchScore: number;
  skillScore: number;
  experienceScore: number;
  projectScore: number;
  educationScore: number;
  resumeScore: number;
  locationScore: number;
  hiringProbability: number;
  confidence: "high" | "medium" | "low" | "unavailable";
  strengths: string[];
  skillGaps: SkillGapItem[];
  matchingSkills: string[];
  missingSkills: string[];
  whyThisMatches: string;
  recommendations: string[];
  disclaimer: string;
};

const DISCLAIMER = "AI-estimated hiring probability. This estimate is based on profile-job alignment and available evidence. It is not a guarantee of employment.";

/**
 * Calculates deterministic multi-factor match scores and estimates hiring probability
 */
export async function computeJobMatch(
  profile: StudentProfileContext,
  job: JobContext,
  useAIEnhancement = true
): Promise<MatchResult> {
  const claimedSkills = (profile.skills || []).map((s) => s.trim().toLowerCase());
  const verifiedSkills = (profile.verifiedGithubSkills || []).map((s) => s.trim().toLowerCase());
  const allUserSkills = Array.from(new Set([...claimedSkills, ...verifiedSkills]));

  const required = job.requiredSkills.map((s) => s.trim());
  const preferred = job.preferredSkills.map((s) => s.trim());

  // 1. Skill Score (35% weight)
  const matchedRequired = required.filter((r) => allUserSkills.includes(r.toLowerCase()));
  const missingRequired = required.filter((r) => !allUserSkills.includes(r.toLowerCase()));
  const matchedPreferred = preferred.filter((p) => allUserSkills.includes(p.toLowerCase()));
  const missingPreferred = preferred.filter((p) => !allUserSkills.includes(p.toLowerCase()));

  const reqRatio = required.length > 0 ? matchedRequired.length / required.length : 0.8;
  const prefRatio = preferred.length > 0 ? matchedPreferred.length / preferred.length : 0.5;
  const skillScore = Math.round((reqRatio * 0.75 + prefRatio * 0.25) * 100);

  // 2. Experience Score (20% weight)
  const userExp = profile.experienceYears ?? 0;
  const jobExp = job.experienceYears ?? 0;
  let experienceScore = 100;
  if (jobExp > 0) {
    if (userExp >= jobExp) experienceScore = 100;
    else if (userExp >= jobExp - 1) experienceScore = 80;
    else experienceScore = 55;
  }

  // 3. Project Relevance Score (15% weight)
  let projectScore = 60;
  const projects = profile.projects || [];
  if (projects.length > 0) {
    let techHits = 0;
    for (const p of projects) {
      const pTechs = (p.technologies || []).map((t) => t.toLowerCase());
      for (const r of required) {
        if (pTechs.includes(r.toLowerCase())) techHits++;
      }
    }
    projectScore = Math.min(100, Math.round(50 + techHits * 15));
  } else if (verifiedSkills.length > 0) {
    projectScore = Math.min(90, Math.round(50 + verifiedSkills.length * 10));
  }

  // 4. Education Score (10% weight)
  const educationScore = profile.education ? 85 : 70;

  // 5. Resume Alignment Score (10% weight)
  const resumeScore = profile.resumeAtsScore ? Math.min(100, profile.resumeAtsScore) : 65;

  // 6. Location / Work Mode Score (10% weight)
  let locationScore = 80;
  if (job.workMode === "Remote") {
    locationScore = 95;
  } else if (profile.preferredWorkMode && profile.preferredWorkMode.toLowerCase() === job.workMode.toLowerCase()) {
    locationScore = 90;
  }

  // Multi-factor weighted overall match score
  const overallMatchScore = Math.min(
    99,
    Math.max(
      35,
      Math.round(
        skillScore * 0.35 +
        experienceScore * 0.20 +
        projectScore * 0.15 +
        educationScore * 0.10 +
        resumeScore * 0.10 +
        locationScore * 0.10
      )
    )
  );

  // Confidence & Evidence check
  const evidenceCount = verifiedSkills.length + (projects.length * 2) + (profile.resumeAtsScore ? 2 : 0);
  let confidence: "high" | "medium" | "low" | "unavailable" = "medium";
  if (evidenceCount >= 6) confidence = "high";
  else if (evidenceCount >= 3) confidence = "medium";
  else if (evidenceCount >= 1) confidence = "low";
  else confidence = "unavailable";

  // AI-estimated hiring probability (derived from verified evidence + required skill coverage)
  let hiringProbability = 0;
  if (confidence === "unavailable") {
    hiringProbability = 0;
  } else {
    // Probability is constrained and grounded in reality
    const verifiedReqMatch = required.filter((r) => verifiedSkills.includes(r.toLowerCase())).length;
    const verifiedBonus = required.length > 0 ? (verifiedReqMatch / required.length) * 15 : 5;
    hiringProbability = Math.min(
      94,
      Math.max(25, Math.round(overallMatchScore * 0.85 + verifiedBonus - (missingRequired.length * 4)))
    );
  }

  // Categorize Skill Gaps with priority rules
  const skillGaps: SkillGapItem[] = [];
  for (const skill of missingRequired) {
    skillGaps.push({
      skill,
      priority: "Critical",
      reason: `Mandatory core capability for ${job.title} at ${job.company}.`,
      recommendation: `Build a project module incorporating ${skill} to verify competence.`,
    });
  }
  for (const skill of missingPreferred.slice(0, 3)) {
    skillGaps.push({
      skill,
      priority: "High",
      reason: `Preferred stack component that distinguishes top candidate submissions.`,
      recommendation: `Review ${skill} documentation and complete a quick integration exercise.`,
    });
  }

  // Strengths
  const matchingSkills = [...matchedRequired, ...matchedPreferred];
  const missingSkills = [...missingRequired, ...missingPreferred];
  const strengths = matchingSkills.slice(0, 4).map((s) => {
    const isVerified = verifiedSkills.includes(s.toLowerCase());
    return isVerified ? `${s} (Verified via GitHub/Portfolio)` : `${s} (Profile Match)`;
  });

  // Default explainable reasoning
  let whyThisMatches = `You match ${matchingSkills.length} of the required skills for this ${job.title} role. `;
  if (overallMatchScore >= 80) {
    whyThisMatches += `Your technical profile shows strong synergy with ${job.company}'s engineering stack.`;
  } else if (overallMatchScore >= 60) {
    whyThisMatches += `You have the core foundations. Closing key gaps like ${missingRequired.slice(0, 2).join(" and ") || "specialized tools"} will boost your hiring likelihood.`;
  } else {
    whyThisMatches += `This role requires deep experience with several missing stack components. Focus on building projects targeting ${missingRequired.slice(0, 2).join(", ")}.`;
  }

  const recommendations = [
    missingRequired.length > 0
      ? `Prioritize learning ${missingRequired[0]} by building an end-to-end repository.`
      : `Refine your resume bullets to emphasize quantifiable metrics with ${matchingSkills.slice(0, 2).join(", ")}.`,
    `Review system design concepts relevant to ${job.company}'s scale.`,
  ];

  // Optional: Enhance with OpenRouter AI for deep custom explanation
  if (useAIEnhancement && process.env.OPENROUTER_API_KEY) {
    try {
      const prompt = buildJobMatchExplanationPrompt({
        studentProfile: {
          targetRole: profile.targetRole,
          skills: profile.skills,
          verifiedGithubSkills: profile.verifiedGithubSkills,
          projects: profile.projects,
          experience: `${userExp} years`,
        },
        job: {
          title: job.title,
          company: job.company,
          requiredSkills: job.requiredSkills,
          preferredSkills: job.preferredSkills,
          description: job.description,
        },
        computedScores: {
          matchScore: overallMatchScore,
          hiringProbability,
          confidence,
          matchingSkills,
          missingSkills,
        },
      });

      const aiRes = await analyzeWithOpenRouter(prompt, {
        temperature: 0.2,
        maxTokens: 1200,
        responseJson: true,
      });

      if (aiRes.success && aiRes.data) {
        if (aiRes.data.why_this_matches) whyThisMatches = aiRes.data.why_this_matches;
        if (Array.isArray(aiRes.data.strengths) && aiRes.data.strengths.length > 0) {
          // Keep verified labels where appropriate
          strengths.splice(0, strengths.length, ...aiRes.data.strengths.slice(0, 4));
        }
        if (Array.isArray(aiRes.data.skill_gaps) && aiRes.data.skill_gaps.length > 0) {
          skillGaps.splice(0, skillGaps.length, ...aiRes.data.skill_gaps);
        }
        if (Array.isArray(aiRes.data.recommended_actions) && aiRes.data.recommended_actions.length > 0) {
          recommendations.splice(0, recommendations.length, ...aiRes.data.recommended_actions);
        }
      }
    } catch {
      // Keep deterministic defaults if OpenRouter fails
    }
  }

  return {
    overallMatchScore,
    skillScore,
    experienceScore,
    projectScore,
    educationScore,
    resumeScore,
    locationScore,
    hiringProbability,
    confidence,
    strengths,
    skillGaps,
    matchingSkills,
    missingSkills,
    whyThisMatches,
    recommendations,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Simulates the match score increase if a user acquires specific missing skills
 */
export function simulateSkillAcquisition(
  currentResult: MatchResult,
  acquiredSkills: string[],
  totalRequiredCount: number
): { simulatedMatchScore: number; simulatedProbability: number; deltaPoints: number } {
  if (acquiredSkills.length === 0 || totalRequiredCount === 0) {
    return {
      simulatedMatchScore: currentResult.overallMatchScore,
      simulatedProbability: currentResult.hiringProbability,
      deltaPoints: 0,
    };
  }

  const additionalCoverageRatio = Math.min(1, acquiredSkills.length / Math.max(1, totalRequiredCount));
  const scoreBoost = Math.round(additionalCoverageRatio * 20);
  const simulatedMatchScore = Math.min(96, currentResult.overallMatchScore + scoreBoost);
  const simulatedProbability = Math.min(92, currentResult.hiringProbability + Math.round(scoreBoost * 0.9));
  const deltaPoints = simulatedMatchScore - currentResult.overallMatchScore;

  return {
    simulatedMatchScore,
    simulatedProbability,
    deltaPoints,
  };
}
