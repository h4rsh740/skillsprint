/**
 * Hackathon Analysis & Skill-Bridging Prompts for OpenRouter
 */

export function buildHackathonFitPrompt(params: {
  studentSkills: string[];
  targetJobMissingSkills: string[];
  hackathon: {
    name: string;
    organizer: string;
    themes: string[];
    technologies: string[];
    description: string;
  };
}): string {
  return `You are the SkillSprint AI Opportunity Matcher.
Analyze this real hackathon against the student's profile and their missing job skills.
Determine how building a project for this hackathon can serve as a "Skill-to-Hackathon Bridge" that closes employment skill gaps.

STUDENT CURRENT SKILLS: ${params.studentSkills.join(", ") || "General Full-Stack"}
MISSING SKILLS FOR TARGET JOBS: ${params.targetJobMissingSkills.join(", ") || "System Design, Cloud, DevOps"}

HACKATHON DETAILS:
- Name: ${params.hackathon.name}
- Organizer: ${params.hackathon.organizer}
- Themes: ${params.hackathon.themes.join(", ")}
- Technologies: ${params.hackathon.technologies.join(", ")}
- Description: ${params.hackathon.description.slice(0, 2000)}

Respond with a strictly valid JSON object:
{
  "fit_score": number (0-100),
  "skill_match": number (0-100),
  "technology_match": number (0-100),
  "theme_match": number (0-100),
  "bridged_job_skills": ["string (skills missing for target roles that this hackathon will develop)"],
  "project_ideas": ["string (1-2 winning project concepts using target stack)"],
  "why_you_match": "string (2-3 sentences explaining the competitive advantage)",
  "recommended_actions": ["string (preparation steps, team roles, tech stack to pick)"]
}`;
}
