import { analyzeWithOpenRouter } from "@/lib/ai/openrouter";
import { buildHackathonFitPrompt } from "@/lib/ai/prompts/hackathon-analysis";

export type HackathonContext = {
  id: string;
  name: string;
  organizer: string;
  description: string;
  themes: string[];
  technologies: string[];
  eligibility: string;
  mode: string;
  registrationDeadline?: Date | null;
  prize?: string | null;
};

export type HackathonFitResult = {
  fitScore: number;
  skillMatch: number;
  techMatch: number;
  themeMatch: number;
  eligibilityScore: number;
  bridgedJobSkills: string[];
  matchingTech: string[];
  whyYouMatch: string;
  projectIdeas: string[];
  recommendedActions: string[];
};

export async function computeHackathonFit(
  studentSkills: string[],
  targetJobMissingSkills: string[],
  hackathon: HackathonContext,
  useAIEnhancement = true
): Promise<HackathonFitResult> {
  const userSkillsLower = (studentSkills || []).map((s) => s.trim().toLowerCase());
  const jobMissingLower = (targetJobMissingSkills || []).map((s) => s.trim().toLowerCase());

  const techLower = (hackathon.technologies || []).map((t) => t.trim().toLowerCase());
  const themesLower = (hackathon.themes || []).map((t) => t.trim().toLowerCase());

  // 1. Skill Match (30% weight)
  const matchedTech = hackathon.technologies.filter((t) => userSkillsLower.includes(t.toLowerCase()));
  const skillRatio = hackathon.technologies.length > 0 ? matchedTech.length / hackathon.technologies.length : 0.6;
  const skillMatch = Math.min(100, Math.round(skillRatio * 100));

  // 2. Tech Match (20% weight) - breadth of tooling
  const techMatch = Math.min(100, Math.max(50, Math.round(skillMatch * 0.9 + (matchedTech.length > 2 ? 15 : 0))));

  // 3. Theme Match (20% weight)
  let themeMatch = 75;
  if (themesLower.some((t) => t.includes("ai") || t.includes("web") || t.includes("cloud") || t.includes("fintech"))) {
    themeMatch = 90;
  }

  // 4. Eligibility Score (15% weight)
  const eligibilityScore = 100;

  // 5. Skill-to-Hackathon Bridge:
  // Identify which missing job skills are directly learned/developed in this hackathon
  const bridgedJobSkills = hackathon.technologies.filter((t) => jobMissingLower.includes(t.toLowerCase()));

  // If hackathon develops missing job skills, give bonus to fit score
  const bridgeBonus = Math.min(15, bridgedJobSkills.length * 6);

  // Overall Fit Score calculation
  const fitScore = Math.min(
    98,
    Math.max(
      45,
      Math.round(
        skillMatch * 0.30 +
        techMatch * 0.20 +
        themeMatch * 0.20 +
        eligibilityScore * 0.15 +
        75 * 0.10 + // Experience fit default
        70 * 0.05 + // Project fit default
        bridgeBonus
      )
    )
  );

  let whyYouMatch = `Your existing foundation in ${matchedTech.slice(0, 2).join(" and ") || "modern web development"} gives you a strong starting point for ${hackathon.name}.`;
  if (bridgedJobSkills.length > 0) {
    whyYouMatch += ` Participating in this hackathon lets you implement ${bridgedJobSkills.join(", ")}, which directly closes your critical hiring skill gaps.`;
  }

  const projectIdeas = [
    `Build an end-to-end full-stack app utilizing ${hackathon.technologies.slice(0, 3).join(", ")}.`,
  ];

  const recommendedActions = [
    `Form or join a team with complementary strengths in ${hackathon.technologies.slice(-2).join(" or ")}.`,
    `Review past winning submissions on ${hackathon.organizer}'s platform for architectural inspiration.`,
  ];

  // Optional AI enhancement with OpenRouter
  if (useAIEnhancement && process.env.OPENROUTER_API_KEY) {
    try {
      const prompt = buildHackathonFitPrompt({
        studentSkills,
        targetJobMissingSkills,
        hackathon: {
          name: hackathon.name,
          organizer: hackathon.organizer,
          themes: hackathon.themes,
          technologies: hackathon.technologies,
          description: hackathon.description,
        },
      });

      const aiRes = await analyzeWithOpenRouter(prompt, {
        temperature: 0.2,
        maxTokens: 1000,
        responseJson: true,
      });

      if (aiRes.success && aiRes.data) {
        if (aiRes.data.why_you_match) whyYouMatch = aiRes.data.why_you_match;
        if (Array.isArray(aiRes.data.bridged_job_skills) && aiRes.data.bridged_job_skills.length > 0) {
          bridgedJobSkills.splice(0, bridgedJobSkills.length, ...aiRes.data.bridged_job_skills);
        }
        if (Array.isArray(aiRes.data.project_ideas) && aiRes.data.project_ideas.length > 0) {
          projectIdeas.splice(0, projectIdeas.length, ...aiRes.data.project_ideas);
        }
        if (Array.isArray(aiRes.data.recommended_actions) && aiRes.data.recommended_actions.length > 0) {
          recommendedActions.splice(0, recommendedActions.length, ...aiRes.data.recommended_actions);
        }
      }
    } catch {
      // Keep deterministic defaults
    }
  }

  return {
    fitScore,
    skillMatch,
    techMatch,
    themeMatch,
    eligibilityScore,
    bridgedJobSkills,
    matchingTech: matchedTech,
    whyYouMatch,
    projectIdeas,
    recommendedActions,
  };
}
