"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

export type TaskItem = {
  text: string;
  completed: boolean;
};

export type RoadmapResult = {
  id: string;
  targetCompany: string;
  targetRole: string;
  duration?: string;
  experienceLevel?: string;
  weeklyCommitment?: string;
  overview?: string;
  missingSkills: string[];
  dailyTasks: TaskItem[];
  weeklyTasks: TaskItem[];
  monthlyTasks: TaskItem[];
  completionPercentage: number;
};

export async function getRoadmap(): Promise<RoadmapResult | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const latest = await db.getLatestRoadmap(user.id);
  if (!latest) return null;

  return {
    id: latest.id,
    targetCompany: latest.targetCompany || "Google",
    targetRole: latest.targetRole || "Software Engineer",
    duration: latest.duration || "90",
    experienceLevel: latest.experienceLevel || "Intermediate",
    weeklyCommitment: latest.weeklyCommitment || "15 hrs/week",
    overview: latest.overview || "Customized Gemini AI career development roadmap.",
    missingSkills: latest.missingSkills || ["Advanced TypeScript", "Next.js", "System Design", "Testing"],
    dailyTasks: (latest.dailyTasks as TaskItem[]) || [],
    weeklyTasks: (latest.weeklyTasks as TaskItem[]) || [],
    monthlyTasks: (latest.monthlyTasks as TaskItem[]) || [],
    completionPercentage: latest.completionPercentage || 0,
  };
}

export async function generateRoadmap(formData: FormData): Promise<RoadmapResult> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  // Read brief questionnaire inputs
  const profile = await db.getProfileByUserId(user.id);
  const targetRole = (formData.get("targetRole") as string) || profile?.targetRole || "Full Stack Engineer";
  const targetCompany = (formData.get("targetCompany") as string) || "Google / FAANG";
  const experienceLevel = (formData.get("experienceLevel") as string) || "Intermediate";
  const duration = (formData.get("duration") as string) || "90";
  const weeklyCommitment = (formData.get("weeklyCommitment") as string) || "15 hrs/week";

  const userSkills = profile?.skills?.join(", ") || "React, JavaScript, Node.js";

  const prompt = `Generate a customized ${duration}-day learning roadmap for a student aiming to become a "${targetRole}" at "${targetCompany}".
Candidate Parameters:
- Target Role: ${targetRole}
- Target Company / Tier: ${targetCompany}
- Current Level: ${experienceLevel}
- Duration: ${duration} Days
- Time Commitment: ${weeklyCommitment}
- Current Skills: ${userSkills}

Provide:
1. dailyTasks (4-6 daily habits): actionable routines tailored for ${targetRole}.
2. weeklyTasks (4-6 weekly milestones): concrete project & skill goals for the ${duration}-day timeline.
3. monthlyTasks (4 monthly checkpoints): major career checkpoints.
4. missingSkills (4-6 items): top technical gaps to master for ${targetRole} at ${targetCompany}.
5. overview: 2 concise sentences summarizing the learning strategy and focus area created by Gemini.`;

  const systemPrompt = `You are a Principal Engineering Lead & Career Architect using Google Gemini AI.
Generate a structured learning roadmap. Return a JSON object matching this exact schema:
{
  "overview": "<2 concise sentences summarizing the roadmap strategy created by Gemini>",
  "missingSkills": ["<skill 1>", "<skill 2>", "<skill 3>", "<skill 4>"],
  "dailyTasks": [
    { "text": "<daily routine 1>", "completed": false },
    { "text": "<daily routine 2>", "completed": false },
    { "text": "<daily routine 3>", "completed": false },
    { "text": "<daily routine 4>", "completed": false }
  ],
  "weeklyTasks": [
    { "text": "<weekly goal 1>", "completed": false },
    { "text": "<weekly goal 2>", "completed": false },
    { "text": "<weekly goal 3>", "completed": false },
    { "text": "<weekly goal 4>", "completed": false }
  ],
  "monthlyTasks": [
    { "text": "<monthly milestone 1>", "completed": false },
    { "text": "<monthly milestone 2>", "completed": false },
    { "text": "<monthly milestone 3>", "completed": false },
    { "text": "<monthly milestone 4>", "completed": false }
  ]
}`;

  const simulatedPayload = {
    overview: `Google Gemini AI generated a ${duration}-day roadmap for ${targetRole} at ${targetCompany}, focusing on project building and system fundamentals.`,
    missingSkills: ["System Architecture & Caching", "TypeScript Generics", "CI/CD & Docker", "API Design & Testing"],
    dailyTasks: [
      { text: `Solve 2 DSA problems tailored for ${targetCompany} interview patterns`, completed: false },
      { text: `Review 1 core ${targetRole} concept (System Design, Async Patterns)`, completed: false },
      { text: `Commit production code updates to active GitHub repositories`, completed: false },
      { text: `Read 1 official technical documentation guide or engineering post`, completed: false },
    ],
    weeklyTasks: [
      { text: `Build a production-grade ${targetRole} project module with unit tests`, completed: false },
      { text: `Conduct a technical mock interview focused on core algorithms`, completed: false },
      { text: `Refactor backend/frontend codebase using strict TypeScript & ESLint`, completed: false },
      { text: `Review AI resume ATS feedback and update project bullet points`, completed: false },
    ],
    monthlyTasks: [
      { text: `Deploy a full-stack portfolio application with live database & auth`, completed: false },
      { text: `Publish a technical blog post detailing a complex coding solution`, completed: false },
      { text: `Achieve 85+ ATS resume match score for ${targetCompany} roles`, completed: false },
      { text: `Submit 1 open-source contribution to a public GitHub repository`, completed: false },
    ]
  };

  const aiResult = await generateStructuredAIResponse(
    prompt,
    systemPrompt,
    MODELS.CAREER_TWIN,
    simulatedPayload
  );

  const missingSkills = Array.isArray(aiResult.missingSkills) ? aiResult.missingSkills : simulatedPayload.missingSkills;
  const dailyTasks = Array.isArray(aiResult.dailyTasks) ? aiResult.dailyTasks : simulatedPayload.dailyTasks;
  const weeklyTasks = Array.isArray(aiResult.weeklyTasks) ? aiResult.weeklyTasks : simulatedPayload.weeklyTasks;
  const monthlyTasks = Array.isArray(aiResult.monthlyTasks) ? aiResult.monthlyTasks : simulatedPayload.monthlyTasks;
  const overview = aiResult.overview || simulatedPayload.overview;

  const roadmap = await db.createRoadmap({
    userId: user.id,
    targetCompany,
    targetRole,
    dailyTasks,
    weeklyTasks,
    monthlyTasks,
    completionPercentage: 0,
  });

  return {
    id: roadmap.id,
    targetCompany,
    targetRole,
    duration,
    experienceLevel,
    weeklyCommitment,
    overview,
    missingSkills,
    dailyTasks,
    weeklyTasks,
    monthlyTasks,
    completionPercentage: 0,
  };
}

export async function toggleTask(
  roadmapId: string,
  period: "daily" | "weekly" | "monthly",
  taskIndex: number,
  completed: boolean
): Promise<RoadmapResult> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const store = await db.getLatestRoadmap(user.id);
  if (!store || store.id !== roadmapId) {
    throw new Error("Roadmap not found");
  }

  const dailyTasks = (store.dailyTasks as TaskItem[]) || [];
  const weeklyTasks = (store.weeklyTasks as TaskItem[]) || [];
  const monthlyTasks = (store.monthlyTasks as TaskItem[]) || [];

  if (period === "daily" && dailyTasks[taskIndex]) {
    dailyTasks[taskIndex].completed = completed;
  } else if (period === "weekly" && weeklyTasks[taskIndex]) {
    weeklyTasks[taskIndex].completed = completed;
  } else if (period === "monthly" && monthlyTasks[taskIndex]) {
    monthlyTasks[taskIndex].completed = completed;
  }

  // Recalculate percentage
  const total = dailyTasks.length + weeklyTasks.length + monthlyTasks.length;
  const done = 
    dailyTasks.filter(t => t.completed).length +
    weeklyTasks.filter(t => t.completed).length +
    monthlyTasks.filter(t => t.completed).length;
  
  const completionPercentage = total > 0 ? Math.round((done / total) * 100) : 0;

  const updated = await db.updateRoadmap(roadmapId, {
    dailyTasks,
    weeklyTasks,
    monthlyTasks,
    completionPercentage
  });

  return {
    id: updated!.id,
    targetCompany: updated!.targetCompany || "Google",
    targetRole: updated!.targetRole || "Software Engineer",
    missingSkills: ["Advanced TypeScript", "Next.js", "Testing", "Performance"],
    dailyTasks,
    weeklyTasks,
    monthlyTasks,
    completionPercentage
  };
}

export async function addRoadmapTask(
  roadmapId: string,
  period: "daily" | "weekly" | "monthly",
  text: string
): Promise<RoadmapResult> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const store = await db.getLatestRoadmap(user.id);
  if (!store || store.id !== roadmapId) {
    throw new Error("Roadmap not found");
  }

  const dailyTasks = (store.dailyTasks as TaskItem[]) || [];
  const weeklyTasks = (store.weeklyTasks as TaskItem[]) || [];
  const monthlyTasks = (store.monthlyTasks as TaskItem[]) || [];

  const newTask = { text, completed: false };

  if (period === "daily") {
    dailyTasks.push(newTask);
  } else if (period === "weekly") {
    weeklyTasks.push(newTask);
  } else if (period === "monthly") {
    monthlyTasks.push(newTask);
  }

  // Calculate completion percentage
  const total = dailyTasks.length + weeklyTasks.length + monthlyTasks.length;
  const done = 
    dailyTasks.filter(t => t.completed).length +
    weeklyTasks.filter(t => t.completed).length +
    monthlyTasks.filter(t => t.completed).length;
  const completionPercentage = total > 0 ? Math.round((done / total) * 100) : 0;

  const updated = await db.updateRoadmap(roadmapId, {
    dailyTasks,
    weeklyTasks,
    monthlyTasks,
    completionPercentage
  });

  return {
    id: updated!.id,
    targetCompany: updated!.targetCompany || "Google",
    targetRole: updated!.targetRole || "Software Engineer",
    missingSkills: ["Advanced TypeScript", "Next.js", "Testing", "Performance"],
    dailyTasks,
    weeklyTasks,
    monthlyTasks,
    completionPercentage
  };
}

export async function deleteRoadmapTask(
  roadmapId: string,
  period: "daily" | "weekly" | "monthly",
  taskIndex: number
): Promise<RoadmapResult> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const store = await db.getLatestRoadmap(user.id);
  if (!store || store.id !== roadmapId) {
    throw new Error("Roadmap not found");
  }

  const dailyTasks = (store.dailyTasks as TaskItem[]) || [];
  const weeklyTasks = (store.weeklyTasks as TaskItem[]) || [];
  const monthlyTasks = (store.monthlyTasks as TaskItem[]) || [];

  if (period === "daily") {
    dailyTasks.splice(taskIndex, 1);
  } else if (period === "weekly") {
    weeklyTasks.splice(taskIndex, 1);
  } else if (period === "monthly") {
    monthlyTasks.splice(taskIndex, 1);
  }

  // Calculate completion percentage
  const total = dailyTasks.length + weeklyTasks.length + monthlyTasks.length;
  const done = 
    dailyTasks.filter(t => t.completed).length +
    weeklyTasks.filter(t => t.completed).length +
    monthlyTasks.filter(t => t.completed).length;
  const completionPercentage = total > 0 ? Math.round((done / total) * 100) : 0;

  const updated = await db.updateRoadmap(roadmapId, {
    dailyTasks,
    weeklyTasks,
    monthlyTasks,
    completionPercentage
  });

  return {
    id: updated!.id,
    targetCompany: updated!.targetCompany || "Google",
    targetRole: updated!.targetRole || "Software Engineer",
    missingSkills: ["Advanced TypeScript", "Next.js", "Testing", "Performance"],
    dailyTasks,
    weeklyTasks,
    monthlyTasks,
    completionPercentage
  };
}
