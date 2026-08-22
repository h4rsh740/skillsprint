import type { ResumeData, JobInput, KeywordAnalysis, AtsResult, ResumeIssue } from "./types";

export function buildSystemPrompt(): string {
  return `You are an ATS resume optimization assistant.
Your task is to improve the wording, clarity, structure, professional language, action verbs, and target job alignment of an existing resume.

Preserve factual accuracy and VISUAL LAYOUT.
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

PRESERVE THE ORIGINAL VISUAL STRUCTURE:
- Do not change the original sections order.
- You must return the 'layout' exactly as it was provided.
- If a custom section was provided, it must be returned in the customSections array.

DO NOT MIX SKILLS WITH PROJECT TECHNOLOGIES:
- Explicit skills are ONLY those found in the original 'skills' array.
- DO NOT falsely claim that a technology found in a project is an explicit skill if it wasn't listed in the original 'skills' array.

Preserve candidate identity and contact information in the 'personal' object.

Return valid JSON only. The JSON structure MUST match:
{
  "enhancedResume": {
    "personal": {
      "name": "",
      "email": "",
      "phone": "",
      "location": "",
      "linkedin": "",
      "github": "",
      "portfolio": "",
      "otherLinks": []
    },
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
    "achievements": [],
    "extracurricular": [],
    "areasOfInterest": [],
    "customSections": [
      {
        "title": "",
        "content": []
      }
    ],
    "layout": {
      "type": "single-column",
      "sections": [
        { "id": "", "title": "", "type": "custom", "order": 0, "column": "main" }
      ]
    }
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
    personal: resume.personal,
    summary: resume.summary,
    skills: resume.skills,
    experience: resume.experience,
    projects: resume.projects,
    education: resume.education,
    certifications: resume.certifications,
    achievements: resume.achievements,
    extracurricular: resume.extracurricular,
    areasOfInterest: resume.areasOfInterest,
    customSections: resume.customSections,
    layout: resume.layout,
  },
  null,
  2
)}

Remember:
- DO NOT invent any metrics, dates, companies, education, skills, projects, certifications, or activities. Rewrite ONLY existing content for better clarity, impact, action verbs, and keyword alignment.
- PRESERVE EVERY section present in the original (including customSections and the exact layout). Do not drop, merge, or collapse sections. Return the full resume, not a shortened generated summary.
- The "skills" array must contain ONLY the candidate's explicit skills from the original skills list. Do NOT promote a technology into skills just because it appears in a project or experience description.
- Keep certifications, achievements, extracurricular, areasOfInterest, and customSections EXACTLY as given (these are factual lists — do not rewrite or remove items).
- DO NOT change the layout. Return the layout EXACTLY as provided in the original resume.
Return JSON only.`;
}
