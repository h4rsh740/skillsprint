"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

export type InterviewQuestion = {
  id: string;
  type: "Technical" | "Behavioral" | "System Design";
  question: string;
};

export type InterviewEvaluation = {
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  overallScore: number;
  suggestions: string[];
};

export async function generateInterviewQuestions(): Promise<InterviewQuestion[]> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await db.getProfileByUserId(user.id);
  const targetRole = profile?.targetRole || "Software Developer";

  const prompt = `Generate 3 interview questions for a candidate preparing for a ${targetRole} role. Include 1 Technical question, 1 Behavioral/HR question, and 1 System Design question.`;
  const systemPrompt = `You are a tech recruiter. Return a JSON object with this schema:
  {
    "questions": [
      { "id": "q1", "type": "Technical", "question": "string" },
      { "id": "q2", "type": "Behavioral", "question": "string" },
      { "id": "q3", "type": "System Design", "question": "string" }
    ]
  }`;

  const simulatedPayload = {
    questions: [
      { id: "q1", type: "Technical", question: "Explain the difference between useEffect layout effects and standard rendering hooks in React, and when you would use each." },
      { id: "q2", type: "Behavioral", question: "Tell me about a time you had a technical disagreement with a team member. How did you resolve it and what was the outcome?" },
      { id: "q3", type: "System Design", question: "How would you design a scalable notification service that handles millions of instant alerts per hour while ensuring zero dropped deliveries?" }
    ]
  };

  const aiResult = await generateStructuredAIResponse(
    prompt,
    systemPrompt,
    MODELS.MOCK_INTERVIEW,
    simulatedPayload
  );

  return aiResult.questions || simulatedPayload.questions;
}

export async function submitInterviewAnswers(answers: { question: string; answer: string }[]): Promise<InterviewEvaluation> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const answersText = answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");

  const prompt = `Evaluate these mock interview responses and score them:\n\n${answersText}`;
  const systemPrompt = `You are a senior technical interviewer. Evaluate the candidate's answers and output scores (0-100) and actionable improvement suggestions. Return a JSON object matching this schema:
  {
    "technicalScore": 0-100,
    "communicationScore": 0-100,
    "confidenceScore": 0-100,
    "overallScore": 0-100,
    "suggestions": ["suggestion 1", "suggestion 2"]
  }`;

  const simulatedPayload = {
    technicalScore: 82,
    communicationScore: 78,
    confidenceScore: 85,
    overallScore: 81,
    suggestions: [
      "Explain the exact triggers of render cycle changes rather than just high-level descriptions.",
      "In corporate conflicts, emphasize objective metrics (e.g. performance testing) rather than purely personal compromises.",
      "Add explicit message queues (like RabbitMQ) to decouple your notification scheduler from the email sender worker."
    ]
  };

  const aiResult = await generateStructuredAIResponse(
    prompt,
    systemPrompt,
    MODELS.MOCK_INTERVIEW,
    simulatedPayload
  );

  // Save interview to database
  await db.createInterview({
    userId: user.id,
    mode: "Text Simulation",
    transcript: answers as any,
    communicationScore: aiResult.communicationScore,
    confidenceScore: aiResult.confidenceScore,
    technicalScore: aiResult.technicalScore,
    leadershipScore: 80,
    overallScore: aiResult.overallScore,
    improvementSuggestions: aiResult.suggestions,
  });

  return {
    technicalScore: aiResult.technicalScore,
    communicationScore: aiResult.communicationScore,
    confidenceScore: aiResult.confidenceScore,
    overallScore: aiResult.overallScore,
    suggestions: aiResult.suggestions
  };
}

export async function getConversationTurn(
  history: { role: "interviewer" | "candidate"; content: string }[],
  settings: { type: string; company: string; difficulty: string }
): Promise<{ interviewerResponse: string; isFinished: boolean }> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const conversationText = history.map(h => `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`).join("\n");

  const prompt = `Here is the current mock interview conversation history:\n\n${conversationText}\n\nInterview settings: Role Type: ${settings.type}, Company: ${settings.company}, Difficulty: ${settings.difficulty}.\n\nPlease provide the next interviewer response. React briefly (1 sentence) to the candidate's last answer and ask the next logical interview question. If there have already been 3 questions asked by the interviewer in the history, set isFinished to true and write a closing remarks response.`;

  const systemPrompt = `You are a professional interviewer. Keep responses concise (under 3 sentences). Ask one question at a time. Return a JSON object with:
  {
    "interviewerResponse": "string",
    "isFinished": boolean
  }`;

  const simulatedPayload = {
    interviewerResponse: "That makes sense. For my next question, could you describe a challenging technical project you worked on and how you handled key architectural trade-offs?",
    isFinished: false
  };

  const result = await generateStructuredAIResponse(
    prompt,
    systemPrompt,
    MODELS.MOCK_INTERVIEW,
    simulatedPayload
  );

  return result;
}

export async function evaluateConversation(
  history: { role: "interviewer" | "candidate"; content: string }[]
): Promise<InterviewEvaluation> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const conversationText = history.map(h => `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`).join("\n");

  const prompt = `Evaluate this full mock interview conversation:\n\n${conversationText}`;
  const systemPrompt = `You are a senior technical interviewer. Evaluate the candidate's answers and output scores (0-100) and actionable improvement suggestions. Return a JSON object matching this schema:
  {
    "technicalScore": 0-100,
    "communicationScore": 0-100,
    "confidenceScore": 0-100,
    "overallScore": 0-100,
    "suggestions": ["suggestion 1", "suggestion 2"]
  }`;

  const simulatedPayload = {
    technicalScore: 82,
    communicationScore: 78,
    confidenceScore: 85,
    overallScore: 81,
    suggestions: [
      "Explain the exact triggers of render cycle changes rather than just high-level descriptions.",
      "In corporate conflicts, emphasize objective metrics (e.g. performance testing) rather than purely personal compromises.",
      "Add explicit message queues (like RabbitMQ) to decouple your notification scheduler from the email sender worker."
    ]
  };

  const aiResult = await generateStructuredAIResponse(
    prompt,
    systemPrompt,
    MODELS.MOCK_INTERVIEW,
    simulatedPayload
  );

  // Save interview to database
  await db.createInterview({
    userId: user.id,
    mode: "Voice Conversation",
    transcript: history as any,
    communicationScore: aiResult.communicationScore,
    confidenceScore: aiResult.confidenceScore,
    technicalScore: aiResult.technicalScore,
    leadershipScore: 80,
    overallScore: aiResult.overallScore,
    improvementSuggestions: aiResult.suggestions,
  });

  return {
    technicalScore: aiResult.technicalScore,
    communicationScore: aiResult.communicationScore,
    confidenceScore: aiResult.confidenceScore,
    overallScore: aiResult.overallScore,
    suggestions: aiResult.suggestions
  };
}
