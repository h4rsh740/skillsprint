"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";
import { prisma } from "@/lib/prisma";

// ─── Free-tier cap ──────────────────────────────────────────────────────────
const FREE_INTERVIEW_LIMIT = 5;

export type InterviewUsage = {
  count: number;
  limit: number;
  hasReachedLimit: boolean;
};

export async function getInterviewUsage(): Promise<InterviewUsage> {
  const user = await getSessionUser();
  if (!user) return { count: 0, limit: FREE_INTERVIEW_LIMIT, hasReachedLimit: false };

  try {
    let count = 0;
    try {
      count = await prisma.mentorSession.count({
        where: { userId: user.id, sessionType: "Mock Interview" },
      });
    } catch {
      const sessions = await db.getInterviewsByUserId(user.id);
      count = sessions.length;
    }
    return { count, limit: FREE_INTERVIEW_LIMIT, hasReachedLimit: count >= FREE_INTERVIEW_LIMIT };
  } catch {
    return { count: 0, limit: FREE_INTERVIEW_LIMIT, hasReachedLimit: false };
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────
export type InterviewSettings = {
  jobRole: string;
  experienceLevel: "Fresher" | "0-1 years" | "1-3 years";
  interviewType: "Technical" | "Behavioral" | "Mixed" | "System Design";
  difficulty: "Easy" | "Medium" | "Hard";
  totalQuestions: number;
};

export type QuestionEvaluation = {
  technicalScore: number;
  communicationScore: number;
  relevanceScore: number;
  confidenceScore: number;
  depthScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  improvement: string;
};

export type FinalReport = {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  relevanceScore: number;
  confidenceScore: number;
  strongAreas: string[];
  weakAreas: string[];
  improvements: string[];
  practiceSuggestions: string[];
  hiringReadiness: number;
};

export type PastInterview = {
  id: string;
  settings: InterviewSettings;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  hiringReadiness: number;
  questions: string[];
  createdAt: string;
};

// ─── Get candidate profile context ───────────────────────────────────────────
async function getCandidateContext(userId: string) {
  const [profile, resume, github] = await Promise.all([
    db.getProfileByUserId(userId),
    db.getLatestResumeAnalysis(userId),
    db.getLatestGitHubAnalysis(userId),
  ]);
  return {
    targetRole: profile?.targetRole || "Software Engineer",
    skills: (profile?.skills as string[] || []).join(", "),
    college: profile?.college || "",
    branch: profile?.branch || "",
    githubConnected: !!github,
    resumeAtsScore: resume?.atsScore || 0,
  };
}

// ─── Generate opening question with profile personalization ──────────────────
export async function startInterview(settings: InterviewSettings): Promise<{
  question: string;
  questionType: string;
}> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const ctx = await getCandidateContext(user.id);

  const prompt = `You are a senior ${settings.jobRole} interviewer at a top tech company.
The candidate is applying for a ${settings.experienceLevel} position.
Interview type: ${settings.interviewType}
Difficulty: ${settings.difficulty}
Candidate skills: ${ctx.skills || "Not specified"}
${ctx.college ? `College: ${ctx.college} - ${ctx.branch}` : ""}

Generate the FIRST opening interview question. 
- For "Technical": ask a coding/system concept question relevant to ${settings.jobRole}
- For "Behavioral": ask about a past situation or approach
- For "Mixed": start with a brief introduction request then a relevant question
- For "System Design": present a system design scenario
Keep it professional, concise, and appropriate for ${settings.difficulty} difficulty.`;

  const systemPrompt = `You are a professional technical interviewer. Return a JSON object:
{
  "question": "the interview question text",
  "questionType": "Technical" | "Behavioral" | "System Design" | "Introduction"
}`;

  const fallback = {
    question: `Tell me about yourself and why you're interested in the ${settings.jobRole} role.`,
    questionType: "Introduction",
  };

  try {
    const result = await generateStructuredAIResponse(
      prompt,
      systemPrompt,
      MODELS.MOCK_INTERVIEW,
      fallback
    );
    return {
      question: result.question || fallback.question,
      questionType: result.questionType || fallback.questionType,
    };
  } catch (err) {
    console.error("[Interview] startInterview failed:", err);
    return fallback;
  }
}

// ─── Evaluate a single answer and generate next question ────────────────────
export async function submitAnswer(params: {
  settings: InterviewSettings;
  history: { role: "interviewer" | "candidate"; content: string; questionType?: string }[];
  currentAnswer: string;
  currentQuestionIndex: number;
}): Promise<{
  evaluation: QuestionEvaluation;
  nextQuestion?: string;
  nextQuestionType?: string;
  isFinished: boolean;
}> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const ctx = await getCandidateContext(user.id);
  const { settings, history, currentAnswer, currentQuestionIndex } = params;
  const lastQuestion = [...history].reverse().find(h => h.role === "interviewer")?.content || "";
  const isLastQuestion = currentQuestionIndex >= settings.totalQuestions - 1;

  const evalPrompt = `You are evaluating a mock interview answer.
Job Role: ${settings.jobRole}
Experience Level: ${settings.experienceLevel}
Interview Type: ${settings.interviewType}
Difficulty: ${settings.difficulty}
Candidate skills profile: ${ctx.skills || "general"}

Question asked: "${lastQuestion}"
Candidate answered: "${currentAnswer}"

Evaluate the answer semantically — not just keyword matching. Judge communication clarity, technical depth, relevance and confidence.`;

  const evalSystem = `You are a senior hiring manager. Evaluate the interview answer and return JSON:
{
  "technicalScore": 0-100,
  "communicationScore": 0-100,
  "relevanceScore": 0-100,
  "confidenceScore": 0-100,
  "depthScore": 0-100,
  "overallScore": 0-100,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1"],
  "improvement": "One concrete suggestion to improve this specific answer"
}`;

  const evalFallback: QuestionEvaluation = {
    technicalScore: 72,
    communicationScore: 75,
    relevanceScore: 78,
    confidenceScore: 70,
    depthScore: 68,
    overallScore: 73,
    strengths: ["Clear communication", "Relevant approach"],
    weaknesses: ["Could add more technical depth"],
    improvement: "Support your answer with a concrete example or metric.",
  };

  let evaluation: QuestionEvaluation;
  try {
    const raw = await generateStructuredAIResponse(
      evalPrompt,
      evalSystem,
      MODELS.MOCK_INTERVIEW,
      evalFallback
    );
    evaluation = {
      technicalScore: raw.technicalScore ?? evalFallback.technicalScore,
      communicationScore: raw.communicationScore ?? evalFallback.communicationScore,
      relevanceScore: raw.relevanceScore ?? evalFallback.relevanceScore,
      confidenceScore: raw.confidenceScore ?? evalFallback.confidenceScore,
      depthScore: raw.depthScore ?? evalFallback.depthScore,
      overallScore: raw.overallScore ?? evalFallback.overallScore,
      strengths: raw.strengths || evalFallback.strengths,
      weaknesses: raw.weaknesses || evalFallback.weaknesses,
      improvement: raw.improvement || evalFallback.improvement,
    };
  } catch (err) {
    console.error("[Interview] evaluateAnswer failed:", err);
    evaluation = evalFallback;
  }

  if (isLastQuestion) {
    return { evaluation, isFinished: true };
  }

  // Generate next question
  const conversationText = history
    .map(h => `${h.role === "interviewer" ? "Interviewer" : "Candidate"}: ${h.content}`)
    .join("\n") + `\nCandidate: ${currentAnswer}`;

  const nextQPrompt = `You are a ${settings.jobRole} interviewer continuing an interview.
Interview type: ${settings.interviewType}, Difficulty: ${settings.difficulty}
Candidate skills: ${ctx.skills || "general"}
Previous conversation:
${conversationText}

Generate the NEXT interview question (question ${currentQuestionIndex + 2} of ${settings.totalQuestions}).
- Do NOT repeat topics already covered above
- Progressively challenge the candidate based on their previous answers
- Keep the question concise and focused
- Mix question types if interview type is "Mixed"`;

  const nextQSystem = `You are a professional interviewer. Return JSON:
{
  "question": "the next interview question",
  "questionType": "Technical" | "Behavioral" | "System Design"
}`;

  const nextFallback = {
    question: `Can you walk me through a challenging technical problem you solved recently and how you approached it?`,
    questionType: "Technical",
  };

  try {
    const nextQ = await generateStructuredAIResponse(
      nextQPrompt,
      nextQSystem,
      MODELS.MOCK_INTERVIEW,
      nextFallback
    );
    return {
      evaluation,
      nextQuestion: nextQ.question || nextFallback.question,
      nextQuestionType: nextQ.questionType || nextFallback.questionType,
      isFinished: false,
    };
  } catch (err) {
    console.error("[Interview] nextQuestion generation failed:", err);
    return {
      evaluation,
      nextQuestion: nextFallback.question,
      nextQuestionType: nextFallback.questionType,
      isFinished: false,
    };
  }
}

// ─── Generate final interview report ─────────────────────────────────────────
export async function generateFinalReport(params: {
  settings: InterviewSettings;
  history: { role: "interviewer" | "candidate"; content: string }[];
  perQuestionEvals: QuestionEvaluation[];
}): Promise<FinalReport> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const ctx = await getCandidateContext(user.id);
  const { settings, history, perQuestionEvals } = params;

  // Compute weighted averages
  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  const avgTech = avg(perQuestionEvals.map(e => e.technicalScore));
  const avgComm = avg(perQuestionEvals.map(e => e.communicationScore));
  const avgRel = avg(perQuestionEvals.map(e => e.relevanceScore));
  const avgConf = avg(perQuestionEvals.map(e => e.confidenceScore));
  const avgDepth = avg(perQuestionEvals.map(e => e.depthScore));
  const avgOverall = avg(perQuestionEvals.map(e => e.overallScore));

  const conversationText = history
    .map(h => `${h.role === "interviewer" ? "Interviewer" : "Candidate"}: ${h.content}`)
    .join("\n");

  const reportPrompt = `Generate a comprehensive mock interview report.
Job Role: ${settings.jobRole}
Experience Level: ${settings.experienceLevel}
Interview Type: ${settings.interviewType}
Candidate skills: ${ctx.skills || "general"}

Full interview transcript:
${conversationText}

Average scores computed:
- Technical: ${avgTech}/100
- Communication: ${avgComm}/100
- Relevance: ${avgRel}/100
- Confidence: ${avgConf}/100
- Depth: ${avgDepth}/100
- Overall: ${avgOverall}/100

Based on this transcript and scores, generate the final report.`;

  const reportSystem = `You are a senior hiring manager writing a post-interview report. Return JSON:
{
  "strongAreas": ["area 1", "area 2", "area 3"],
  "weakAreas": ["area 1", "area 2"],
  "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
  "practiceSuggestions": ["LeetCode topic to practice", "concept to study", "resource to use"],
  "hiringReadiness": 0-100,
  "problemSolvingScore": 0-100
}`;

  const reportFallback = {
    strongAreas: ["Clear communication style", "Structured problem approach", "Relevant domain knowledge"],
    weakAreas: ["Could improve technical depth", "Needs more specific examples"],
    improvements: [
      "Practice explaining technical concepts with concrete code examples",
      "Structure behavioral answers using STAR format (Situation, Task, Action, Result)",
      "Deepen understanding of system scalability patterns",
    ],
    practiceSuggestions: [
      "Solve medium-level LeetCode problems daily",
      "Study system design concepts on ByteByteGo",
      "Practice behavioral questions using the STAR framework",
    ],
    hiringReadiness: Math.min(Math.round(avgOverall * 0.9 + 5), 90),
    problemSolvingScore: avgDepth,
  };

  let reportData: any;
  try {
    reportData = await generateStructuredAIResponse(
      reportPrompt,
      reportSystem,
      MODELS.MOCK_INTERVIEW,
      reportFallback
    );
  } catch (err) {
    console.error("[Interview] generateFinalReport AI failed:", err);
    reportData = reportFallback;
  }

  const finalReport: FinalReport = {
    overallScore: avgOverall,
    technicalScore: avgTech,
    communicationScore: avgComm,
    problemSolvingScore: reportData.problemSolvingScore ?? avgDepth,
    relevanceScore: avgRel,
    confidenceScore: avgConf,
    strongAreas: reportData.strongAreas || reportFallback.strongAreas,
    weakAreas: reportData.weakAreas || reportFallback.weakAreas,
    improvements: reportData.improvements || reportFallback.improvements,
    practiceSuggestions: reportData.practiceSuggestions || reportFallback.practiceSuggestions,
    hiringReadiness: Math.min(
      Math.max(reportData.hiringReadiness ?? reportFallback.hiringReadiness, 10),
      95
    ),
  };

  // Save to database
  try {
    await db.createInterview({
      userId: user.id,
      mode: settings.interviewType,
      transcript: history,
      communicationScore: finalReport.communicationScore,
      confidenceScore: finalReport.confidenceScore,
      technicalScore: finalReport.technicalScore,
      leadershipScore: finalReport.problemSolvingScore,
      overallScore: finalReport.overallScore,
      improvementSuggestions: finalReport.improvements,
    });
  } catch (err) {
    console.error("[Interview] Failed to save interview to database:", err);
  }

  return finalReport;
}

// ─── Get past interviews ──────────────────────────────────────────────────────
export async function getPastInterviews(): Promise<PastInterview[]> {
  const user = await getSessionUser();
  if (!user) return [];

  try {
    const sessions = await db.getInterviewsByUserId(user.id);
    return sessions.map((s: any) => ({
      id: s.id,
      settings: (s.transcript as any)?.settings || {
        jobRole: "Software Engineer",
        experienceLevel: "Fresher",
        interviewType: s.mode || "Mixed",
        difficulty: "Medium",
        totalQuestions: 5,
      },
      overallScore: s.overallScore || 0,
      technicalScore: s.technicalScore || 0,
      communicationScore: s.communicationScore || 0,
      confidenceScore: s.confidenceScore || 0,
      hiringReadiness: Math.round((s.overallScore || 0) * 0.9),
      questions: Array.isArray(s.transcript)
        ? s.transcript.filter((h: any) => h.role === "interviewer").map((h: any) => h.content).slice(0, 3)
        : [],
      createdAt: s.createdAt || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("[Interview] Failed to load past interviews:", err);
    return [];
  }
}

// ─── Legacy exports kept for backward compatibility ──────────────────────────
export async function getInterviewUsageLegacy() {
  return getInterviewUsage();
}
