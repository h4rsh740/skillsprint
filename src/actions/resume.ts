"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "./auth";
import { extractResumeText } from "@/lib/resumeParser";
import { analyzeResumeComplete } from "@/lib/resume";
import path from "path";

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

// NOTE: This action used to call an external AI API and fabricate an "improved"
// resume (fake companies, fake metrics, a hardcoded +12 ATS boost). It now uses
// the 100% local, deterministic engine in `@/lib/resume` — no external APIs,
// no API keys, no fabricated content.

function mapResumeData(data: any): StructuredResume {
  return {
    personalInfo: {
      name: data.personalInfo.name,
      email: data.personalInfo.email,
      phone: data.personalInfo.phone,
      location: data.personalInfo.location,
      github: data.personalInfo.github,
      linkedin: data.personalInfo.linkedin,
    },
    summary: data.summary || "",
    skills: data.skills,
    experience: data.experience.map((e: any) => ({
      company: e.heading,
      role: e.heading,
      date: e.date || "",
      bullets: e.bullets,
    })),
    projects: data.projects.map((p: any) => ({
      title: p.heading,
      description: p.description || "",
      bullets: p.bullets,
    })),
    education: data.education.map((e: any) => ({
      institution: e.text,
      degree: e.text,
      date: e.date || "",
    })),
  };
}

export async function analyzeResume(formData: FormData): Promise<ResumeAnalysisResult> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("resume") as File;
  if (!file) throw new Error("No resume file provided");

  const MAX_SIZE = 12 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw new Error("Resume file is too large (max 12MB).");
  const allowed = [".pdf", ".docx", ".txt"];
  const ext = path.extname(file.name || "").toLowerCase();
  if (!allowed.includes(ext)) throw new Error("Unsupported file type. Please upload a PDF, DOCX or TXT resume.");

  const extract = await extractResumeText(file);
  if (extract.isEmpty) throw new Error(extract.reason || "Could not extract text from the resume.");

  const profile = await db.getProfileByUserId(user.id);
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

  return {
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
    crossAnalysis: {
      githubMissingFromResume: [],
      resumeMissingFromGithub: [],
      skillsWithoutEvidence: keywords.missing.slice(0, 6),
      reposMissingReadme: [],
      reposMissingDeployments: [],
      suggestions: [],
    },
    originalResume: mapResumeData(original),
    improvedResume: mapResumeData(enhanced.data),
  };
}
