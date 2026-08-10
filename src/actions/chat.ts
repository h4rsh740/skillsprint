"use server";

import { generateAIResponse } from "@/lib/ai";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function askCareerCoach(chatHistory: ChatMessage[]): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const [profile, resume, careerTwin, github, roadmap] = await Promise.all([
    db.getProfileByUserId(user.id),
    db.getLatestResumeByUserId(user.id),
    db.getLatestCareerTwin(user.id),
    db.getLatestGitHubAnalysis(user.id),
    db.getLatestRoadmap(user.id)
  ]);

  const lastUserMsg = [...chatHistory].reverse().find(m => m.role === "user")?.content || "";

  // Build conversational history
  const conversationHistory = chatHistory
    .map(m => `${m.role === "user" ? "Student" : "Coach"}: ${m.content}`)
    .join("\n\n");

  const contextPrompt = `You are SkillSprint AI's Elite Technical Career Coach.
You are mentoring ${profile?.fullName || user.email.split("@")[0]} for their goal of becoming a ${profile?.targetRole || "Software Developer"}.

## Live Student Footprint
- Candidate Name: ${profile?.fullName || "Student"}
- Target Role: ${profile?.targetRole || "Software Developer"}
- College & CGPA: ${profile?.college || "Engineering College"} (${profile?.cgpa || "8.5"} CGPA)
- Known Skills: ${profile?.skills?.join(", ") || careerTwin?.currentSkills?.join(", ") || "React, TypeScript, Node.js"}
- Resume ATS Score: ${resume?.atsScore || 75}/100 (Placement Probability: ${resume?.placementProbability || 68}%)
- Weak Resume Areas: ${resume?.weakBulletPoints?.join("; ") || "Needs metrics in bullet points"}
- GitHub Developer Footprint: ${github ? `${github.publicReposCount} Repos, ${github.contributionStreak} Day Streak, Score: ${github.portfolioCompleteness || 65}/100` : "Not connected yet"}
- Career GPS Roadmap: ${roadmap ? `${roadmap.projectName} (${roadmap.completionPercentage}% completed)` : "Not generated yet"}
- Salary Projection: ${careerTwin?.salaryProjection || "₹12L–₹18L/yr"}

## Conversation History:
${conversationHistory}

## User's Latest Request:
"${lastUserMsg}"

Instructions for AI Coach:
1. Address the student's latest request directly. Reference their real profile data (ATS score ${resume?.atsScore || 75}, target role ${profile?.targetRole || "Software Developer"}, skills, GitHub status) where applicable.
2. Provide structured, actionable advice with clear markdown formatting (bolding key terms, code examples, lists).
3. Be warm, direct, and senior-engineer-level precise.
`;

  try {
    const aiResponse = await generateAIResponse(contextPrompt);
    return aiResponse || "I am analyzing your profile. Could you please specify which area of your career (Resume, GitHub, Coding, Interview) you'd like guidance on?";
  } catch (error) {
    console.error("[Career Coach] Error:", error);
    return "I encountered an error processing your request. Please try again in a moment.";
  }
}
