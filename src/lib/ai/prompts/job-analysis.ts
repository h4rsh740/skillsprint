/**
 * Job Analysis & Requirement Extraction Prompts for OpenRouter
 */

export function buildJobRequirementExtractionPrompt(jobDescription: string, jobTitle: string, company: string): string {
  return `You are an expert technical recruiter and talent intelligence analyzer.
Analyze the following real job posting and extract the exact structured requirements. Do not invent skills that are not supported by the job description.

Job Title: ${jobTitle}
Company: ${company}
Description:
${jobDescription.slice(0, 4000)}

Respond with a strictly valid JSON object matching this schema:
{
  "required_skills": ["string (essential skills mentioned in the posting)"],
  "preferred_skills": ["string (nice-to-have or bonus skills)"],
  "experience_years": number (minimum years of experience required, or 0 if junior/intern/unspecified),
  "education": ["string (e.g. BS/BTech in Computer Science or equivalent)"],
  "technologies": ["string (specific tools, frameworks, databases, cloud services)"],
  "role_summary": "string (1-2 sentence executive summary of responsibilities)"
}`;
}

export function buildJobMatchExplanationPrompt(params: {
  studentProfile: {
    targetRole?: string;
    skills: string[];
    verifiedGithubSkills?: string[];
    projects?: { name: string; technologies: string[] }[];
    experience?: string;
  };
  job: {
    title: string;
    company: string;
    requiredSkills: string[];
    preferredSkills: string[];
    description: string;
  };
  computedScores: {
    matchScore: number;
    hiringProbability: number;
    confidence: string;
    matchingSkills: string[];
    missingSkills: string[];
  };
}): string {
  return `You are the SkillSprint AI Career Advisor.
Explain the match between this student and the target job using the computed facts below.
Never guarantee employment. Provide actionable advice for closing skill gaps.

STUDENT PROFILE:
- Target Role: ${params.studentProfile.targetRole || "Software Engineer"}
- Claimed Skills: ${params.studentProfile.skills.join(", ") || "None listed"}
- Verified GitHub Skills: ${params.studentProfile.verifiedGithubSkills?.join(", ") || "None"}
- Relevant Projects: ${params.studentProfile.projects?.map(p => `${p.name} (${p.technologies.join(", ")})`).join("; ") || "None"}

TARGET JOB:
- Company: ${params.job.company}
- Title: ${params.job.title}
- Required Skills: ${params.job.requiredSkills.join(", ")}
- Preferred Skills: ${params.job.preferredSkills.join(", ")}

COMPUTED SCORES:
- Match Score: ${params.computedScores.matchScore}%
- AI-Estimated Hiring Probability: ${params.computedScores.hiringProbability}% (${params.computedScores.confidence} confidence)
- Matching Skills: ${params.computedScores.matchingSkills.join(", ")}
- Missing Skills: ${params.computedScores.missingSkills.join(", ")}

Respond with a strictly valid JSON object:
{
  "strengths": ["string (top 3 specific technical synergies evidenced by student)"],
  "skill_gaps": [
    {
      "skill": "string",
      "priority": "Critical" | "High" | "Medium" | "Low",
      "reason": "string (why it matters for this specific role)",
      "recommendation": "string (concrete action, e.g. 'Build a microservice with Redis caching to prove proficiency')"
    }
  ],
  "why_this_matches": "string (2-3 sentences explaining the alignment)",
  "recommended_actions": ["string (1-3 tactical next steps to maximize hiring probability)"]
}`;
}
