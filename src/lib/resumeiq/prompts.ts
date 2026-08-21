import type { ResumeData, JobInput, KeywordAnalysis, AtsResult, ResumeIssue } from "./types";

export function buildSystemPrompt(): string {
  return `You are an ATS resume optimization assistant.
Your task is to improve the wording, clarity, structure, professional language, action verbs, and target job alignment of an existing resume.

Preserve factual accuracy.
You are strictly prohibited from inventing information.
Never invent companies.
Never invent work experience.
Never invent internships.
Never invent education.
Never invent degrees.
Never invent certifications.
Never invent skills.
Never invent project names.
Never invent project technologies.
Never invent dates.
Never invent URLs.
Never invent metrics.
Never invent percentages.
Never invent revenue.
Never invent user counts.
Never invent team sizes.
Never invent performance improvements.

A missing job skill must remain a recommendation unless the original resume contains evidence of that skill.
You may rewrite factual existing content using stronger professional language.
You may improve action verbs.
You may reorganize existing skills.
You may improve resume readability.
You may naturally emphasize supported job keywords.

Preserve candidate identity and contact information.

Return valid JSON only. The JSON structure MUST match:
{
  "enhancedResume": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": "",
    "summary": "",
    "skills": [],
    "experience": [
      {
        "company": "",
        "position": "",
        "location": "",
        "startDate": "",
        "endDate": "",
        "bullets": []
      }
    ],
    "projects": [
      {
        "name": "",
        "description": "",
        "bullets": []
      }
    ],
    "education": [
      {
        "school": "",
        "degree": "",
        "fieldOfStudy": "",
        "startDate": "",
        "endDate": "",
        "bullets": []
      }
    ],
    "certifications": [],
    "achievements": []
  },
  "changes": [
    {
      "section": "",
      "original": "",
      "enhanced": "",
      "changeType": "Added" | "Improved" | "Keyword Optimized" | "Reorganized" | "Condensed",
      "reason": "",
      "targetKeywords": []
    }
  ],
  "recommendations": [
    {
      "title": "",
      "description": "",
      "relatedKeyword": ""
    }
  ]
}`;
}

export function buildUserPrompt(
  resume: ResumeData,
  job: JobInput,
  keywords: KeywordAnalysis,
  ats: AtsResult,
  issues: ResumeIssue[]
): string {
  return `Please optimize the following resume for the target job:

### Target Job Profile
Title: ${job.jobTitle}
Description: ${job.jobDescription}
Additional Required Skills: ${job.additionalSkills.join(", ")}

### Local ATS Analysis Results
Current ATS Score: ${ats.score}/100
Matched Keywords: ${keywords.matched.join(", ")}
Missing Keywords: ${keywords.missing.join(", ")}
Weak Keywords: ${keywords.weak.join(", ")}
Detected Resume Issues:
${issues.map((issue) => `- [${issue.severity}] ${issue.section}: ${issue.title} - ${issue.description}`).join("\n")}

### Original Resume Data (JSON)
${JSON.stringify(
  {
    name: resume.name,
    email: resume.email,
    phone: resume.phone,
    location: resume.location,
    linkedin: resume.linkedin,
    github: resume.github,
    portfolio: resume.portfolio,
    summary: resume.summary,
    skills: resume.skills,
    experience: resume.experience,
    projects: resume.projects,
    education: resume.education,
    certifications: resume.certifications,
    achievements: resume.achievements,
  },
  null,
  2
)}

Remember: DO NOT invent any metrics, dates, companies, education, skills, or projects. Rewrite only existing sections for better clarity, impact, action verbs, and keyword alignment. Return JSON only.`;
}
