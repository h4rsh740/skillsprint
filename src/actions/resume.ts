"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";

export type ResumeAnalysisResult = {
  atsScore: number;
  placementProbability: number;
  strengths: string[];
  weaknesses: string[];
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
  - placementProbability (0-100)
  - strengths (array of 3 strings)
  - weaknesses (array of 3 strings)
  - rewriteSuggestions (array of 1 object with 'original' and 'improved' bullet points)`;

  const simulatedPayload: ResumeAnalysisResult = {
    atsScore: 72,
    placementProbability: 58,
    strengths: [
      "Solid foundation in modern frontend ecosystem (React, Next.js).",
      "Hackathon participation indicates strong builder mentality and initiative.",
      "Good academic standing (8.5 CGPA) passes initial screens."
    ],
    weaknesses: [
      "Zero backend, database, or cloud infrastructure skills listed.",
      "Lacks quantifiable metrics in project descriptions (e.g., 'improved performance by X%').",
      "No listed experience with testing frameworks (Jest, Cypress)."
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
