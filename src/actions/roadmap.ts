"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

import { buildCandidateEvidenceGraph } from "@/lib/evidence";
import { extractTargetRoleProfile, compareEvidenceToRole } from "@/lib/role-intelligence";
import { selectHighestImpactAction } from "@/lib/action-engine";

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

async function getCandidateMissingSkills(userId: string, targetRoleTitle: string): Promise<string[]> {
  try {
    const [profile, resume, github] = await Promise.all([
      db.getProfileByUserId(userId).catch(() => null),
      db.getLatestResumeAnalysis(userId).catch(() => null),
      db.getLatestGitHubAnalysis(userId).catch(() => null),
    ]);

    const evidence = buildCandidateEvidenceGraph({
      resume: resume ? { skills: profile?.skills || [], atsScore: resume.atsScore } : null,
      github: github ? { languages: Array.isArray(github.languagesUsed) ? github.languagesUsed : [] } : null,
      profile: { targetRole: targetRoleTitle, skills: profile?.skills || [] }
    });

    const role = extractTargetRoleProfile({ title: targetRoleTitle });
    const readiness = compareEvidenceToRole(evidence, role);
    return readiness.criticalGaps.length > 0
      ? readiness.criticalGaps
      : (readiness.weakEvidenceRequirements.length > 0
          ? readiness.weakEvidenceRequirements.map(w => w.requirement.name).slice(0, 4)
          : ["System Architecture", "Performance Optimization", "Automated Testing"]);
  } catch {
    return ["System Architecture", "Automated Testing", "Performance Optimization"];
  }
}

export async function getRoadmap(): Promise<RoadmapResult | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const [latest, profile] = await Promise.all([
    db.getLatestRoadmap(user.id),
    db.getProfileByUserId(user.id).catch(() => null),
  ]);

  if (!latest) return null;

  const targetRoleTitle = latest.targetRole || profile?.targetRole || "Software Engineer";
  const missingSkills = await getCandidateMissingSkills(user.id, targetRoleTitle);

  return {
    id: latest.id,
    targetCompany: latest.targetCompany || "Google",
    targetRole: targetRoleTitle,
    missingSkills,
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
  const duration = (formData.get("duration") as string) || "90";
  
  const [profile, resume, github, interviews] = await Promise.all([
    db.getProfileByUserId(user.id).catch(() => null),
    db.getLatestResumeAnalysis(user.id).catch(() => null),
    db.getLatestGitHubAnalysis(user.id).catch(() => null),
    db.getInterviewsByUserId(user.id).catch(() => null),
  ]);

  const targetRoleTitle = profile?.targetRole || "Software Developer";
  const skills = profile?.skills?.join(", ") || "React, JavaScript";

  // Build real evidence & role gap analysis
  const evidence = buildCandidateEvidenceGraph({
    resume: resume ? { skills: profile?.skills || [], atsScore: resume.atsScore } : null,
    github: github ? { languages: Array.isArray(github.languagesUsed) ? github.languagesUsed : [] } : null,
    interviews: interviews || null,
    profile: { targetRole: targetRoleTitle, skills: profile?.skills || [] }
  });

  const role = extractTargetRoleProfile({ title: targetRoleTitle });
  const readiness = compareEvidenceToRole(evidence, role);
  const actionPlan = selectHighestImpactAction({
    evidenceGraph: evidence,
    roleReadiness: readiness,
    targetRoleTitle,
    hasResume: !!resume,
    hasGithub: !!github,
    hasInterview: !!(interviews && interviews.length > 0),
  });

  const missingSkills = readiness.criticalGaps.length > 0
    ? readiness.criticalGaps
    : (readiness.weakEvidenceRequirements.length > 0
        ? readiness.weakEvidenceRequirements.map(w => w.requirement.name).slice(0, 4)
        : ["Automated Testing", "CI/CD Deployment", "System Design"]);

  const topGap = missingSkills[0] || "Testing";

  const prompt = `Generate an evidence-based ${duration}-day career roadmap for a student targeting ${targetRoleTitle} at ${targetCompany}.
  Verified Skills: ${skills}
  Highest Priority Evidence Gap: ${topGap}
  Next Best Action: ${actionPlan.primaryAction.title} (${actionPlan.primaryAction.whyThisAction})
  Required Evidence to Produce: ${actionPlan.primaryAction.evidenceToProduce.join("; ")}
  Provide exactly:
  - 4 daily habits/tasks
  - 4 weekly core milestones
  - 4 monthly checkpoints.`;

  const systemPrompt = `You are a technical career development architect. Design a roadmap that guides a candidate from current evidence to target role readiness. Return a JSON object matching this schema:
  {
    "dailyTasks": [
      { "text": "task description", "completed": false }
    ],
    "weeklyTasks": [
      { "text": "weekly milestone", "completed": false }
    ],
    "monthlyTasks": [
      { "text": "monthly checkpoint", "completed": false }
    ]
  }`;

  const simulatedPayload = {
    dailyTasks: [
      { text: `[${topGap}] Write and run 2 automated test cases verifying core logic`, completed: false },
      { text: "Solve 2 LeetCode problems (Array / String / Tree) in TypeScript/Python", completed: false },
      { text: "Review 1 System Architecture pattern (Caching, Event-driven queues)", completed: false },
      { text: "Push at least 1 verified git commit with clear conventional commit message", completed: false },
    ],
    weeklyTasks: [
      { text: `[${topGap}] Implement test runner in repository and integrate into npm test script`, completed: false },
      { text: "Build a responsive feature branch and deploy preview build", completed: false },
      { text: "Conduct a mock interview on behavioral and architecture fundamentals", completed: false },
      { text: "Refactor project following Clean Architecture and TypeScript strict mode", completed: false },
    ],
    monthlyTasks: [
      { text: `[${topGap}] Complete full test coverage milestone and verify 0 failing test cases`, completed: false },
      { text: "Configure GitHub Actions CI/CD to run test suite on every pull request", completed: false },
      { text: "Elevate resume ATS score above 85/100 by documenting STAR project metrics", completed: false },
      { text: "Rescan Career Twin to measure score improvement and verify next best action", completed: false },
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
    targetRole: targetRoleTitle,
    dailyTasks: aiResult.dailyTasks,
    weeklyTasks: aiResult.weeklyTasks,
    monthlyTasks: aiResult.monthlyTasks,
    completionPercentage: 0,
  });

  return {
    id: roadmap.id,
    targetCompany,
    targetRole: targetRoleTitle,
    missingSkills,
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
    missingSkills: await getCandidateMissingSkills(user.id, updated!.targetRole || "Software Engineer"),
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
    missingSkills: await getCandidateMissingSkills(user.id, updated!.targetRole || "Software Engineer"),
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
    missingSkills: await getCandidateMissingSkills(user.id, updated!.targetRole || "Software Engineer"),
    dailyTasks,
    weeklyTasks,
    monthlyTasks,
    completionPercentage
  };
}
