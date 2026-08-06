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

  const profile = await db.getProfileByUserId(user.id);
  const resume = await db.getLatestResumeByUserId(user.id);
  const careerTwin = await db.getLatestCareerTwin(user.id);

  // Build a rich, conversational history for the AI
  const conversationHistory = chatHistory
    .map(m => `${m.role === "user" ? "Student" : "Coach"}: ${m.content}`)
    .join("\n\n");

  const contextPrompt = `You are an elite tech career coach AI embedded in SkillSprint — a career acceleration platform for aspiring software engineers. Your personality is that of a senior engineer and mentor: direct, warm, technically precise, and genuinely invested in the student's success.

## Student Profile
- **Name:** ${profile?.fullName || "Student"}
- **Email:** ${user.email}
- **Target Role:** ${profile?.targetRole || "Software Developer"}
- **College:** ${profile?.college || "Engineering College"}
- **CGPA:** ${profile?.cgpa || "8.5"}
- **Current Skills:** ${profile?.skills?.join(", ") || "React, JavaScript, HTML, CSS"}
- **Resume ATS Score:** ${resume?.atsScore || 75}/100
- **Placement Probability:** ${resume?.placementProbability || 65}%
- **Salary Projection:** ${careerTwin?.salaryProjection || "₹12L–₹18L/yr"}

## Your Coaching Principles
1. **Be a real expert, not a corporate chatbot.** Give honest, specific advice — not generic motivational filler.
2. **Understand the intent behind the question.** If the student asks a vague question, interpret it charitably and address the most likely underlying concern.
3. **Prioritise actionability.** Every response should end with at least one concrete next step the student can take today.
4. **Use the student's context.** Reference their skills, ATS score, target role, and CGPA where relevant — don't give generic advice when you have their profile data.
5. **When recommending resources,** link to specific, real, high-quality free content (YouTube channels, official docs, free courses). Format links as: [Resource Name](URL).
6. **Format for readability.** Use markdown: headers (##, ###), bold for key terms, code blocks for code, tables for comparisons. Keep responses scannable.
7. **Match the question depth.** A simple question deserves a crisp answer. A deep technical question deserves a thorough response with code examples.
8. **Never be dismissive.** There are no stupid questions in learning.

## Conversation History
${conversationHistory}

Respond to the student's last message. If the question is ambiguous, state your interpretation and answer that.`;

  try {
    const aiResponse = await generateAIResponse(contextPrompt);
    return aiResponse || "I'm having trouble processing your request right now. Could you rephrase or try again?";
  } catch (error) {
    console.error("[Career Coach] Error:", error);
    return "I encountered an error processing your request. Please try again in a moment.";
  }
}
