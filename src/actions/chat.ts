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

  const [profile, resume, careerTwin] = await Promise.all([
    db.getProfileByUserId(user.id),
    db.getLatestResumeByUserId(user.id),
    db.getLatestCareerTwin(user.id),
  ]);

  const contextPrompt = `You are a world-class tech career coach AI at SkillSprint. You are speaking to a student named ${profile?.fullName || "Candidate"}.
  
  Student Context:
  - Email: ${user.email}
  - Target Role: ${profile?.targetRole || "Software Developer"}
  - College: ${profile?.college || "N/A"}
  - CGPA: ${profile?.cgpa || "8.5"}
  - Current Skills: ${profile?.skills?.join(", ") || "React, JavaScript"}
  - Latest Resume ATS Score: ${resume?.atsScore || 75}/100
  - Latest Placement Probability: ${resume?.placementProbability || 65}%
  - Salary Target / Prediction: ${careerTwin?.salaryProjection || "₹12L - ₹18L / yr"}
  
  Instructions:
  1. Your personality is empathetic, structured, and practical. Give short, actionable recommendations. Do not use generic corporate filler.
  2. Whenever recommending skills to learn, roadmap milestones, or interview preparation:
     - Always suggest 1-2 high-quality free learning resources.
     - Recommend specific top-tier YouTube channels or free-to-audit Coursera courses.
     - CRITICAL: Provide direct, valid clickable links in the standard markdown format: [Resource Name](URL) (e.g., [freeCodeCamp React Course](https://www.youtube.com/watch?v=Ke90Tje7VS0) or [Coursera HTML/CSS/JS Course](https://www.coursera.org/learn/html-css-javascript-for-web-developers)). Make sure all link URLs are real, valid, and lead directly to the corresponding resource.
  
  Conversational History:
  ${chatHistory.map(m => `${m.role === "user" ? "Student" : "Coach"}: ${m.content}`).join("\n")}
  
  Answer the last question with concrete steps.`;

  // Fallback simulation in case API key is missing
  if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const lastUserMessage = chatHistory[chatHistory.length - 1]?.content?.toLowerCase() || "";
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI processing time

    if (lastUserMessage.includes("resume") || lastUserMessage.includes("ats")) {
      return `Your current resume has an ATS score of ${resume?.atsScore || 75}/100. To optimize it further:
1. Integrate metrics into your achievements (e.g. 'Optimized render cycles, reducing load times by 15%').
2. Add missing keywords: ${resume?.missingSkills?.join(", ") || "TypeScript, Node.js, System Design"}.
Would you like me to rewrite one of your project bullet points?`;
    }

    if (lastUserMessage.includes("career twin") || lastUserMessage.includes("salary") || lastUserMessage.includes("path")) {
      return `Your 12-month projection indicates a salary capability of ${careerTwin?.salaryProjection || "₹12L - ₹18L / yr"}.
To hit this velocity:
- Master advanced system design concepts.
- Fix key risk factors: *${careerTwin?.riskFactors?.[0] || "Irregular commit patterns"}*.
What specific role or company are you preparing for?`;
    }

    return `Hey ${profile?.fullName?.split(" ")[0] || "Candidate"}, as your SkillSprint coach, I'm analyzing your current target role of *${profile?.targetRole || "Software Developer"}*. 
    Your placement probability is at **${resume?.placementProbability || 65}%**. 
    How can I help you today? We can discuss:
    1. Optimizing your Resume ATS Score.
    2. Reviewing your Career Twin projections.
    3. Practicing for a specific target company.`;
  }

  try {
    const aiResponse = await generateAIResponse(contextPrompt);
    return aiResponse || "I am currently analyzing your profile metrics. Let me get back to you shortly.";
  } catch (error) {
    console.error("AI Coach error:", error);
    return "I had trouble processing that request. Please try again.";
  }
}
