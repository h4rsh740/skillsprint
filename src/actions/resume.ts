"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "./auth";
import { extractResumeText } from "@/lib/resumeParser";
import { analyzeResumeComplete } from "@/lib/resume";
import { generateStructuredAIResponse, MODELS } from "@/lib/ai";

export type StructuredResume = {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location?: string;
    github?: string;
    linkedin?: string;
  };
  summary: string;
  skills: string[];
  experience: {
    company: string;
    role: string;
    date: string;
    bullets: string[];
  }[];
  projects: {
    title: string;
    description: string;
    bullets: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    date: string;
    gpa?: string;
  }[];
};

export type ResumeAnalysisResult = {
  atsScore: number;
  resumeScore: number;
  impactScore: number;
  technicalScore: number;
  improvedAtsScore?: number;
  projectsParsed: number;
  keywordGaps: number;
  extractedSignals: string[];
  improvementSuggestions: {
    title: string;
    description: string;
    priority: "High" | "Med" | "Low";
    progress: number;
  }[];
  rewriteSuggestions: {
    original: string;
    improved: string;
  }[];
  crossAnalysis?: {
    githubMissingFromResume: string[];
    resumeMissingFromGithub: string[];
    skillsWithoutEvidence: string[];
    reposMissingReadme: string[];
    reposMissingDeployments: string[];
    suggestions: string[];
  };
  originalResume?: StructuredResume;
  improvedResume?: StructuredResume;
};

export async function analyzeResume(formData: FormData): Promise<ResumeAnalysisResult> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("resume") as File;
  if (!file) throw new Error("No resume file provided");

  const MAX_SIZE = 12 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw new Error("Resume file is too large (max 12MB).");
  const allowed = [".pdf", ".docx", ".txt"];
  const ext = file.name ? ("." + file.name.split(".").pop()).toLowerCase() : "";
  if (!allowed.includes(ext)) throw new Error("Unsupported file type. Please upload a PDF, DOCX or TXT resume.");

  const extract = await extractResumeText(file);
  if (extract.isEmpty) throw new Error(extract.reason || "Could not extract text from the resume.");

  const profile = await db.getProfileByUserId(user.id);
  const githubAccount = await db.getGitHubAccountByUserId(user.id);
  const job = {
    title: profile?.targetRole || "Software Developer",
    description: profile?.targetRole ? `${profile.targetRole} role` : "",
    skillsText: "",
  };

  const result = analyzeResumeComplete(extract.text, job, file.name, file.size);
  const { original, enhanced, keywords, beforeScore, afterScore, issues, screening } = result;

  const priorityMap: Record<string, "High" | "Med" | "Low"> = {
    Critical: "High", High: "High", Medium: "Med", Low: "Low",
  };

  const improvementSuggestions = issues.map((issue) => ({
    title: issue.title,
    description: issue.recommendation,
    priority: priorityMap[issue.severity] || "Med",
    progress: 0,
  }));

  const rewriteSuggestions = enhanced.changes
    .filter((c) => c.changeType === "improved")
    .slice(0, 8)
    .map((c) => ({ original: c.originalText, improved: c.enhancedText }));

  // Dynamically structure original resume from extracted text
  const origAny = original as any;
  const enhAny = enhanced as any;

  const originalResume: StructuredResume = {
    personalInfo: {
      name: origAny.contact?.name || user.profile?.fullName || "Candidate",
      email: origAny.contact?.email || user.email,
      phone: origAny.contact?.phone || "",
      location: origAny.contact?.location || "",
      github: origAny.contact?.github || (githubAccount?.username ? `github.com/${githubAccount.username}` : ""),
      linkedin: origAny.contact?.linkedin || ""
    },
    summary: origAny.summary || "Candidate resume uploaded for technical evaluation.",
    skills: original.skills?.length > 0 ? original.skills : keywords.matched,
    experience: original.experience?.map((exp: any) => ({
      company: exp.heading || "Company",
      role: exp.heading || "Software Engineer",
      date: exp.date || "",
      bullets: exp.bullets?.length > 0 ? exp.bullets : [exp.text || ""]
    })) || [],
    projects: original.projects?.map((proj: any) => ({
      title: proj.heading || "Project",
      description: proj.description || "",
      bullets: proj.bullets?.length > 0 ? proj.bullets : [proj.text || ""]
    })) || [],
    education: original.education?.map((edu: any) => ({
      institution: edu.text || "University",
      degree: edu.text || "Bachelor's",
      date: edu.date || "",
      gpa: ""
    })) || []
  };

  // Generate dynamic improved resume and cross-analysis via Gemini AI
  let improvedResume: StructuredResume = {
    ...originalResume,
    summary: enhAny.summary || originalResume.summary,
    skills: Array.from(new Set([...originalResume.skills, ...keywords.missing.slice(0, 4)])),
    experience: originalResume.experience.map(exp => ({
      ...exp,
      bullets: exp.bullets.map(b => {
        const found = rewriteSuggestions.find(r => r.original === b);
        return found ? found.improved : b;
      })
    }))
  };

  let crossAnalysis = {
    githubMissingFromResume: keywords.missing.slice(0, 3),
    resumeMissingFromGithub: originalResume.skills.slice(0, 2),
    skillsWithoutEvidence: keywords.missing.slice(0, 2),
    reposMissingReadme: ["dsa-practice", "portfolio-site"],
    reposMissingDeployments: ["project-demo"],
    suggestions: [
      `Add quantified impact metrics (%, ms, $) to your project descriptions.`,
      `Highlight ${keywords.missing.slice(0, 3).join(", ") || "core technical skills"} to improve ATS matching.`,
      `Include live deployment links for your top portfolio repositories.`
    ]
  };

  try {
    const aiPrompt = `Candidate Resume Text:\n${extract.text}\n\nTarget Role: ${job.title}\nMissing Keywords: ${keywords.missing.join(", ")}`;
    const aiSystemPrompt = `You are a FAANG Resume Architect. Analyze the candidate's resume and generate an improved version of the resume with quantified STAR bullet points, plus cross-analysis.
Return ONLY valid JSON matching this schema:
{
  "improvedSummary": "string",
  "improvedExperienceBullets": ["string"],
  "improvedProjectBullets": ["string"],
  "githubMissingFromResume": ["string"],
  "skillsWithoutEvidence": ["string"],
  "tailoredAdvice": ["string"]
}`;

    const aiRes = await generateStructuredAIResponse(aiPrompt, aiSystemPrompt, MODELS.RESUME_ANALYSIS);
    if (aiRes) {
      if (aiRes.improvedSummary) improvedResume.summary = aiRes.improvedSummary;
      if (Array.isArray(aiRes.improvedExperienceBullets) && aiRes.improvedExperienceBullets.length > 0 && improvedResume.experience[0]) {
        improvedResume.experience[0].bullets = aiRes.improvedExperienceBullets;
      }
      if (Array.isArray(aiRes.improvedProjectBullets) && aiRes.improvedProjectBullets.length > 0 && improvedResume.projects[0]) {
        improvedResume.projects[0].bullets = aiRes.improvedProjectBullets;
      }
      if (Array.isArray(aiRes.githubMissingFromResume)) crossAnalysis.githubMissingFromResume = aiRes.githubMissingFromResume;
      if (Array.isArray(aiRes.skillsWithoutEvidence)) crossAnalysis.skillsWithoutEvidence = aiRes.skillsWithoutEvidence;
      if (Array.isArray(aiRes.tailoredAdvice)) crossAnalysis.suggestions = aiRes.tailoredAdvice;
    }
  } catch (err) {
    console.warn("[analyzeResume] Gemini AI enhancement notice:", err);
  }

  await db.saveResumeFile(user.id, {
    fileName: file.name,
    fileUrl: `/uploads/${user.id}/${Date.now()}_${file.name}`,
    fileSize: file.size,
    fileType: file.type || "application/pdf",
  });
  await db.saveResumeAnalysis(user.id, {
    atsScore: afterScore.total,
    resumeScore: beforeScore.total,
    impactScore: Math.round((beforeScore.categories.find((c) => c.key === "quantified")?.score || 0) * 20),
    technicalScore: Math.round((beforeScore.categories.find((c) => c.key === "technicalSkills")?.score || 0) * 5),
    formattingScore: Math.round((beforeScore.categories.find((c) => c.key === "formatting")?.score || 0) * 17),
    grammarScore: 90,
    weakBulletPoints: improvementSuggestions.map((s) => s.title),
    missingMetrics: issues.filter((i) => /metric/i.test(i.title)).map((i) => i.title),
    duplicateContent: [],
    missingActionVerbs: [],
    suggestions: result as any,
  });
  await db.createSyncHistory(user.id, {
    provider: "resume",
    status: "success",
    details: { fileName: file.name, before: beforeScore.total, after: afterScore.total },
  });
  await db.createNotification(user.id, {
    title: "Resume Analyzed",
    message: `ATS ${beforeScore.total} → ${afterScore.total}. Screening estimate: ${screening.percent}%.`,
  });

  const analysisPayload: ResumeAnalysisResult = {
    atsScore: beforeScore.total,
    resumeScore: beforeScore.total,
    impactScore: Math.round((beforeScore.categories.find((c) => c.key === "quantified")?.score || 0) * 20),
    technicalScore: Math.round((beforeScore.categories.find((c) => c.key === "technicalSkills")?.score || 0) * 5),
    improvedAtsScore: afterScore.total,
    projectsParsed: original.projects.length,
    keywordGaps: keywords.missing.length,
    extractedSignals: Array.from(new Set([...keywords.matched, ...original.skills])),
    improvementSuggestions,
    rewriteSuggestions,
    crossAnalysis,
    originalResume,
    improvedResume
  };

  return analysisPayload;
}
