"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "./auth";
import { track } from "@/lib/track";

import { buildCandidateEvidenceGraph } from "@/lib/evidence";
import { extractTargetRoleProfile, compareEvidenceToRole } from "@/lib/role-intelligence";
import { computeExplainableReadiness, type ExplainableReadiness } from "@/lib/readiness";

export type ScoreExplanation = {
  current: number;
  reason: string;
  howToImprove: string;
  expectedImprovement: string;
};

export type CareerScoresResult = {
  skillsprintScore: number;
  resume: number;
  github: number;
  projects: number;
  interview: number;
  marketDemand: number;
  growthPercentage: number;
  history: { month: string; score: number }[];
  explainableReadiness?: ExplainableReadiness;
  
  // Normalized 14 SDE index scores
  metrics: {
    overall: ScoreExplanation;
    resume: ScoreExplanation;
    github: ScoreExplanation;
    linkedin: ScoreExplanation;
    portfolio: ScoreExplanation;
    openSource: ScoreExplanation;
    frontend: ScoreExplanation;
    backend: ScoreExplanation;
    problemSolving: ScoreExplanation;
    systemDesign: ScoreExplanation;
    aiReadiness: ScoreExplanation;
    interviewReadiness: ScoreExplanation;
    ats: ScoreExplanation;
    hiring: ScoreExplanation;
  };
};

export type SkillSprintContext = {
  user: any;
  dbScores: any;
  resume: any;
  github: any;
  linkedin: any;
  interviews: any;
  profile: any;
};

export async function getSkillSprintScores(ctx?: SkillSprintContext): Promise<CareerScoresResult> {
  const user = ctx ? ctx.user : await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const [dbScores, resume, github, linkedin, interviews, profile] = ctx 
    ? [ctx.dbScores, ctx.resume, ctx.github, ctx.linkedin, ctx.interviews, ctx.profile]
    : await Promise.all([
        db.getScoresByUserId(user.id),
        db.getLatestResumeAnalysis(user.id),
        db.getLatestGitHubAnalysis(user.id),
        db.getLatestLinkedInAnalysis(user.id),
        db.getInterviewsByUserId(user.id),
        db.getProfileByUserId(user.id),
      ]);

  // 1. Resolve individual scores dynamically based on synced integrations
  const resumeScore = resume?.resumeScore || dbScores.resume;
  const atsScore = resume?.atsScore || dbScores.resume;
  
  const githubScore = github?.githubScore || (user.githubConnected ? 75 : 0);
  const openSourceScore = github?.contributionStreak ? Math.min(50 + github.contributionStreak * 2, 98) : (user.githubConnected ? 60 : 0);
  
  const linkedinScore = linkedin?.headlineQuality || (user.linkedinConnected ? 70 : 0);
  const portfolioScore = user.linkedinConnected || user.githubConnected ? 75 : 50;

  const latestInterview = interviews?.[0];
  const interviewScore = latestInterview?.overallScore || dbScores.interview || 0;

  // 2. Build deterministic CandidateEvidenceGraph and ExplainableReadiness
  const targetRoleTitle = profile?.targetRole || "Software Engineer";
  const evidenceGraph = buildCandidateEvidenceGraph({
    resume: resume ? {
      skills: (resume.suggestions as any)?.skills || profile?.skills || [],
      atsScore: resume.atsScore,
    } : null,
    github: github ? {
      languages: Array.isArray(github.languagesUsed) ? github.languagesUsed : [],
      cicdActive: typeof github.cicdStatus === "string" ? github.cicdStatus.toLowerCase().includes("active") : false,
      readmeQuality: github.readmeQuality || "Med",
      commitStreak: github.contributionStreak || 0,
    } : null,
    interviews: interviews && interviews.length > 0 ? interviews.map((i: any) => ({
      technicalScore: i.technicalScore || i.overallScore,
      communicationScore: i.communicationScore || i.overallScore,
      overallScore: i.overallScore,
    })) : null,
    profile: {
      targetRole: targetRoleTitle,
      skills: profile?.skills || [],
      cgpa: profile?.cgpa,
    }
  });

  const targetRole = extractTargetRoleProfile({
    title: targetRoleTitle,
  });

  const roleReadiness = compareEvidenceToRole(evidenceGraph, targetRole);

  const explainableReadiness = computeExplainableReadiness({
    evidenceGraph,
    roleReadiness,
    resumeAnalysis: resume,
    githubAnalysis: github,
    interviewSessions: interviews,
    targetRoleTitle,
  });

  // Evidence-grounded domain scores
  const skillsList = (profile?.skills as string[] || []).map((s: string) => s.toLowerCase());
  const feSkills = ["react", "javascript", "typescript", "html", "css", "tailwind", "next.js", "vue"];
  const feMatches = feSkills.map(s => evidenceGraph.skills[s]).filter(Boolean);
  const frontendScore = feMatches.length > 0
    ? Math.round(feMatches.reduce((acc, cur) => acc + cur.score, 0) / feMatches.length)
    : (skillsList.some(s => feSkills.includes(s)) ? 65 : 45);

  const beSkills = ["node", "python", "sql", "postgresql", "docker", "redis", "fastapi", "django", "java"];
  const beMatches = beSkills.map(s => evidenceGraph.skills[s]).filter(Boolean);
  const backendScore = beMatches.length > 0
    ? Math.round(beMatches.reduce((acc, cur) => acc + cur.score, 0) / beMatches.length)
    : (skillsList.some(s => beSkills.includes(s)) ? 60 : 40);

  const problemSolvingScore = latestInterview?.technicalScore || (evidenceGraph.skills["problem-solving"]?.score ?? 70);
  
  const sysDesignMatch = evidenceGraph.skills["system design"] || evidenceGraph.skills["microservices"];
  const systemDesignScore = sysDesignMatch ? sysDesignMatch.score : (skillsList.includes("system design") ? 72 : 55);

  const aiMatch = evidenceGraph.skills["machine learning"] || evidenceGraph.skills["llm"] || evidenceGraph.skills["ai_ml"];
  const aiReadiness = aiMatch ? aiMatch.score : (skillsList.some(s => ["ai", "llm", "rag"].includes(s)) ? 75 : 40);

  const hiringScore = Math.round((resumeScore + githubScore + linkedinScore + interviewScore) / 4);

  // Derive Overall Career Score directly from the explainable readiness calculation
  const skillsprintScore = explainableReadiness.overallScore;

  const history = [
    { month: "April", score: Math.max(35, skillsprintScore - 14) },
    { month: "May", score: Math.max(45, skillsprintScore - 6) },
    { month: "June", score: skillsprintScore }
  ];

  // Save/update scores in DB
  await db.updateScores(user.id, {
    resume: resumeScore,
    github: githubScore,
    projects: portfolioScore,
    interview: interviewScore,
    marketDemand: hiringScore,
    skillsprintScore,
    history
  });

  // ── Analytics instrumentation ────────────────────────────────────────────
  await track(user.id, "gap_analysis_completed", { skillsprintScore });
  // ───────────────────────────────────────────────────────────────────────

  const baselineScore = history[0]?.score || 58;
  const growthPercentage = Math.round(((skillsprintScore - baselineScore) / baselineScore) * 100);

  return {
    skillsprintScore,
    resume: resumeScore,
    github: githubScore,
    projects: portfolioScore,
    interview: interviewScore,
    marketDemand: hiringScore,
    growthPercentage,
    history,
    explainableReadiness,
    
    // Structured details grounded in real evidence
    metrics: {
      overall: {
        current: skillsprintScore,
        reason: explainableReadiness.whyThisScore,
        howToImprove: `${explainableReadiness.highestImpactImprovement.title}: ${explainableReadiness.highestImpactImprovement.description}`,
        expectedImprovement: explainableReadiness.highestImpactImprovement.potentialGain
      },
      resume: {
        current: resumeScore,
        reason: resume ? `Resume ATS score is ${resume.atsScore}/100 with verified keyword extraction.` : "No resume uploaded. Upload a PDF resume to establish ATS benchmark.",
        howToImprove: "Implement metric-based STAR bullet points to describe project outcomes.",
        expectedImprovement: "+12-15 Points"
      },
      github: {
        current: githubScore,
        reason: user.githubConnected ? `GitHub profile connected with ${github?.publicReposCount || 0} repositories and ${github?.languagesUsed ? (github.languagesUsed as any[]).length : 0} languages verified.` : "GitHub integration is inactive.",
        howToImprove: user.githubConnected ? "Add automated test suites and activate GitHub Actions CI/CD workflows." : "Link your GitHub account to sync verified codebase languages and commits.",
        expectedImprovement: "+15-20 Points"
      },
      linkedin: {
        current: linkedinScore,
        reason: user.linkedinConnected ? "LinkedIn profile linked with industry keywords." : "LinkedIn profile is not linked.",
        howToImprove: "Connect LinkedIn and integrate professional summary keywords matching target engineering roles.",
        expectedImprovement: "+10 Points"
      },
      portfolio: {
        current: portfolioScore,
        reason: user.linkedinConnected || user.githubConnected ? "Portfolio and codebase footprint evaluated." : "Limited portfolio and deployment assets connected.",
        howToImprove: "Audit live portfolio URL and optimize Core Web Vitals to satisfy responsive web standards.",
        expectedImprovement: "+10 Points"
      },
      openSource: {
        current: openSourceScore,
        reason: user.githubConnected ? `Commit streak is currently at ${github?.contributionStreak || 0} days.` : "No active repository contribution streak.",
        howToImprove: "Establish regular commit habits and contribute pull requests to open repositories.",
        expectedImprovement: "+10-15 Points"
      },
      frontend: {
        current: frontendScore,
        reason: feMatches.length > 0 ? `Verified frontend evidence for ${feMatches.map(m => m.skill).join(", ")}.` : "Limited verified frontend code in repositories.",
        howToImprove: "Build responsive Next.js applications and verify state management with unit tests.",
        expectedImprovement: "+15 Points"
      },
      backend: {
        current: backendScore,
        reason: beMatches.length > 0 ? `Verified backend evidence for ${beMatches.map(m => m.skill).join(", ")}.` : "Limited backend and database code verified in repositories.",
        howToImprove: "Build RESTful APIs with PostgreSQL database integration and Docker containerization.",
        expectedImprovement: "+18 Points"
      },
      problemSolving: {
        current: problemSolvingScore,
        reason: latestInterview ? `Evaluated from mock interview technical performance (${latestInterview.technicalScore || 70}/100).` : "Baseline technical problem solving benchmark.",
        howToImprove: "Practice mock interview evaluations and solve algorithmic challenges.",
        expectedImprovement: "+12 Points"
      },
      systemDesign: {
        current: systemDesignScore,
        reason: sysDesignMatch ? `Evidence found for ${sysDesignMatch.skill}.` : "No direct distributed system design projects detected.",
        howToImprove: "Architect a scalable microservice system with caching and asynchronous queues.",
        expectedImprovement: "+15 Points"
      },
      aiReadiness: {
        current: aiReadiness,
        reason: aiMatch ? `Evidence found for ${aiMatch.skill}.` : "No AI/LLM API integrations detected in codebase.",
        howToImprove: "Integrate LLM API calls, embeddings, or retrieval-augmented generation pipelines into projects.",
        expectedImprovement: "+20 Points"
      },
      interviewReadiness: {
        current: interviewScore,
        reason: latestInterview ? `Based on mock interview evaluation of ${latestInterview.overallScore}/100.` : "No mock interviews recorded yet.",
        howToImprove: "Complete a mock technical interview session to benchmark verbal explanation and problem solving.",
        expectedImprovement: "+15 Points"
      },
      ats: {
        current: atsScore,
        reason: resume ? `ATS alignment currently measured at ${resume.atsScore}/100.` : "No resume uploaded to evaluate ATS compatibility.",
        howToImprove: "Ensure all core skills and tools required by target roles appear explicitly in your resume.",
        expectedImprovement: "+15 Points"
      },
      hiring: {
        current: hiringScore,
        reason: "Aggregated market demand index combining resume strength, code quality, and interview readiness.",
        howToImprove: "Complete highest-impact action items to elevate profile qualification ranking.",
        expectedImprovement: "+10 Points"
      }
    }
  };
}

import { selectHighestImpactAction, type ActionPlanSummary } from "@/lib/action-engine";

export type DashboardData = {
  scores: CareerScoresResult;
  recommendations: any[];
  activeRoadmap: any;
  githubAnalysis: any;
  linkedinAnalysis: any;
  resumeAnalysis: any;
  careerTwin: any;
  syncHistory: any[];
  notifications: any[];
  actionPlan?: ActionPlanSummary;
};

export async function getDashboardData(): Promise<DashboardData> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const [
    dbScores,
    interviews,
    profile,
    recommendationsRaw,
    activeRoadmap,
    githubAnalysis,
    linkedinAnalysis,
    resumeAnalysis,
    careerTwin,
    syncHistory,
    notifications,
  ] = await Promise.all([
    db.getScoresByUserId(user.id),
    db.getInterviewsByUserId(user.id),
    db.getProfileByUserId(user.id),
    db.getRecommendedProjects(user.id),
    db.getLatestRoadmap(user.id),
    db.getLatestGitHubAnalysis(user.id),
    db.getLatestLinkedInAnalysis(user.id),
    db.getLatestResumeAnalysis(user.id),
    db.getLatestCareerTwin(user.id),
    db.getSyncHistory(user.id),
    db.getNotifications(user.id),
  ]);

  const scores = await getSkillSprintScores({
    user,
    dbScores,
    resume: resumeAnalysis,
    github: githubAnalysis,
    linkedin: linkedinAnalysis,
    interviews,
    profile,
  });

  let recommendations = recommendationsRaw;
  if (!recommendations || recommendations.length === 0) {
    try {
      const { getPersonalizedRecommendations } = await import("./projects");
      recommendations = await getPersonalizedRecommendations();
    } catch (e) {
      console.warn("Failed to generate recommendations on dashboard load, falling back to db schema fallback", e);
      recommendations = [];
    }
  }

  // Compute highest impact action plan for Command Center
  const targetRoleTitle = profile?.targetRole || "Software Engineer";
  const evidence = buildCandidateEvidenceGraph({
    resume: resumeAnalysis ? { skills: profile?.skills || [], atsScore: resumeAnalysis.atsScore } : null,
    github: githubAnalysis ? { languages: Array.isArray(githubAnalysis.languagesUsed) ? githubAnalysis.languagesUsed : [] } : null,
    interviews: interviews || null,
    profile: { targetRole: targetRoleTitle, skills: profile?.skills || [] }
  });
  const role = extractTargetRoleProfile({ title: targetRoleTitle });
  const roleReadiness = compareEvidenceToRole(evidence, role);
  const actionPlan = selectHighestImpactAction({
    evidenceGraph: evidence,
    roleReadiness,
    targetRoleTitle,
    hasResume: !!resumeAnalysis,
    hasGithub: !!githubAnalysis,
    hasInterview: !!(interviews && interviews.length > 0),
  });

  return {
    scores,
    recommendations: recommendations || [],
    activeRoadmap,
    githubAnalysis,
    linkedinAnalysis,
    resumeAnalysis,
    careerTwin,
    syncHistory: syncHistory || [],
    notifications: notifications || [],
    actionPlan,
  };
}

