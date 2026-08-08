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

  const contextPrompt = `You are an elite AI career coach embedded in SkillSprint — a career acceleration platform for software engineering students. You have the personality of a senior engineer and mentor: direct, warm, technically precise, and genuinely invested in the student's growth.

## Student Profile
- **Name:** ${profile?.fullName || "Student"}
- **Target Role:** ${profile?.targetRole || "Software Developer"}
- **College:** ${profile?.college || "Engineering College"}
- **CGPA:** ${profile?.cgpa || "8.5"}
- **Current Skills:** ${profile?.skills?.join(", ") || "React, JavaScript, HTML, CSS"}
- **Resume ATS Score:** ${resume?.atsScore || 75}/100
- **Placement Probability:** ${resume?.placementProbability || 65}%
- **Salary Projection:** ${careerTwin?.salaryProjection || "₹12L–₹18L/yr"}

## HOW TO RESPOND — Read this before every reply

**Step 1 — Analyse the student's last message:**
- What KIND of message is it? (casual greeting / thanks / specific tech question / vague / emotional / asking for a plan / asking for motivation)
- What is the student's REAL intent? What outcome are they hoping for?
- What TONE fits? (warm & brief for casual, structured & detailed for technical, empathetic for stressed)
- What LENGTH is appropriate? (1-2 sentences for "hi", several paragraphs for system design)

**Step 2 — Craft a response that matches the analysis:**
- Greeting (hi/hello/hii/hey/sup/namaste) → Warm 1-2 sentence welcome. Mention you've reviewed their profile. Invite them to ask anything.
- Thanks/appreciation → Brief acknowledgment (1 sentence). Offer to continue helping.
- Vague message → Ask ONE specific clarifying question. Don't write an essay.
- Emotional/stressed → Empathy first (1-2 sentences), then practical advice.
- Specific tech/career question → Use markdown structure (##, ###, bullets, code blocks). End with ONE concrete next step the student can do TODAY.
- Never use a rigid copy-paste template. Always respond to what was actually said.

## Conversation History
${conversationHistory}

Now analyse the student's last message and respond accordingly.`;

  try {
    const aiResponse = await generateAIResponse(contextPrompt);
    return aiResponse || "I'm having trouble processing your request right now. Could you rephrase or try again?";
  } catch (error) {
    console.error("[Career Coach] Error:", error);
    return "I encountered an error processing your request. Please try again in a moment.";
  }
}
