"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";

export type ResumeAnalysisResult = {
  atsScore: number;
  resumeScore: number;
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
};

export async function analyzeResume(formData: FormData): Promise<ResumeAnalysisResult> {
  const file = formData.get("resume") as File;
  
  if (!file) {
    throw new Error("No resume file provided");
  }

  // In a real scenario, we would parse the PDF here using `pdf-parse` or similar.
  // For the MVP, we assume the text is extracted.
  const simulatedExtractedText = `
    Alex Developer
    Education: B.Tech Computer Science, CGPA: 8.5
    Experience: Hackathon Winner, built a weather app using React.
    Skills: React, Next.js, Tailwind, JavaScript.
  `;

  const systemPrompt = `You are a strict, top-tier tech recruiter AI. Analyze the candidate's resume and return a JSON object with:
  - atsScore (0-100)
  - resumeScore (0-100)
  - projectsParsed (number)
  - keywordGaps (number)
  - extractedSignals (array of strings)
  - improvementSuggestions (array of objects with title, description, priority, progress)
  - rewriteSuggestions (array of 1 object with 'original' and 'improved' bullet points)`;

  const simulatedPayload: ResumeAnalysisResult = {
    resumeScore: 81,
    atsScore: 73,
    projectsParsed: 5,
    keywordGaps: 11,
    extractedSignals: ["React", "JavaScript", "TypeScript", "Git", "TailwindCSS", "REST APIs"],
    improvementSuggestions: [
      {
        title: "Rewrite summary for target role",
        description: "Lead with frontend positioning and measurable outcomes.",
        priority: "High",
        progress: 82
      },
      {
        title: "Insert ATS keywords",
        description: "TypeScript, Next.js, unit testing, performance optimization.",
        priority: "High",
        progress: 68
      },
      {
        title: "Project bullets → impact bullets",
        description: "Use metrics like load time, users, conversion, deployments.",
        priority: "Med",
        progress: 57
      }
    ],
    rewriteSuggestions: [
      {
        original: "built a weather app using React.",
        improved: "Architected a responsive weather dashboard using React and Tailwind, integrating third-party REST APIs and achieving a 98% Lighthouse performance score."
      }
    ]
  };

  const result = await generateStructuredAIResponse(
    simulatedExtractedText, 
    systemPrompt, 
    MODELS.RESUME_ANALYSIS, 
    simulatedPayload
  );

  return result as ResumeAnalysisResult;
}
