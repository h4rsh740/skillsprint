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
    missingSkills: ["Advanced TypeScript", "Next.js", "Testing", "Performance"],
    dailyTasks: (latest.dailyTasks as TaskItem[]) || [],
    weeklyTasks: (latest.weeklyTasks as TaskItem[]) || [],
    monthlyTasks: (latest.monthlyTasks as TaskItem[]) || [],
    completionPercentage: latest.completionPercentage || 0,
  };
}

export async function generateRoadmap(formData: FormData): Promise<RoadmapResult> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const targetCompany = (formData.get("targetCompany") as string) || "Google";
  const profile = await db.getProfileByUserId(user.id);
  const targetRole = profile?.targetRole || "Software Developer";
  const skills = profile?.skills?.join(", ") || "React, JavaScript";

  const prompt = `Generate a 30-60-90 day learning roadmap for a student aiming for ${targetRole} at ${targetCompany}.
  Current Skills: ${skills}
  Provide 4 daily habits/tasks, 4 weekly goals, and 4 monthly milestones.`;

  const systemPrompt = `You are a career development architect. Design a roadmap for a tech student. Return a JSON object matching this schema:
  {
    "dailyTasks": [
      { "text": "task description (e.g. solve 2 DSA problems)", "completed": false }
    ],
    "weeklyTasks": [
      { "text": "weekly target (e.g. build a Node/Express API)", "completed": false }
    ],
    "monthlyTasks": [
      { "text": "monthly milestone (e.g. publish full-stack portfolio)", "completed": false }
    ]
  }`;

  const simulatedPayload = {
    dailyTasks: [
      { text: "Solve 2 LeetCode problems (Array / String) in Python/JS", completed: false },
      { text: "Review 1 System Design concept (Caching, Load Balancers)", completed: false },
      { text: "Commit at least once to GitHub project repositories", completed: false },
      { text: "Read 1 technical blog post or framework documentation page", completed: false },
    ],
    weeklyTasks: [
      { text: "Build a responsive Next.js page integrating third-party APIs", completed: false },
      { text: "Conduct a mock interview on behavioral/technical fundamentals", completed: false },
      { text: "Refactor a project using TypeScript and ESLint configuration", completed: false },
      { text: "Review mock interview transcripts and fix suggested gaps", completed: false },
    ],
    monthlyTasks: [
      { text: "Complete a full portfolio project with complete unit tests", completed: false },
      { text: "Write and publish a detailed blog post on a coding pattern", completed: false },
      { text: "Get resume ATS score above 85/100 using AI suggestions", completed: false },
      { text: "Contribute 1 PR to an open source library or public repository", completed: false },
    ]
  };

  const aiResult = await generateStructuredAIResponse(
    prompt,
    systemPrompt,
    MODELS.CAREER_TWIN,
    simulatedPayload
  );

  const roadmap = await db.createRoadmap({
    userId: user.id,
    targetCompany,
    targetRole,
    dailyTasks: aiResult.dailyTasks,
    weeklyTasks: aiResult.weeklyTasks,
    monthlyTasks: aiResult.monthlyTasks,
    completionPercentage: 0,
  });

  return {
    id: roadmap.id,
    targetCompany,
    targetRole,
    missingSkills: ["Advanced TypeScript", "Next.js", "Testing", "Performance"],
    dailyTasks: aiResult.dailyTasks,
    weeklyTasks: aiResult.weeklyTasks,
    monthlyTasks: aiResult.monthlyTasks,
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
