"use server";

import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";
import { syncAllJobs } from "@/lib/opportunities/jobs/providers";
import { computeJobMatch, simulateSkillAcquisition, type MatchResult } from "@/lib/matching/jobMatcher";
import type { ApplicationStatus } from "@prisma/client";

export type VerifiedJobCard = {
  id: string;
  externalId: string;
  source: string;
  company: string;
  title: string;
  description: string;
  location: string;
  workMode: string;
  employmentType: string;
  department?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  officialUrl: string;
  applicationUrl: string;
  requiredSkills: string[];
  preferredSkills: string[];
  publishedAt?: Date | null;
  lastVerifiedAt: Date;
  match: MatchResult;
  applicationStatus?: ApplicationStatus | null;
  appliedAt?: Date | null;
};

export type JobsOverviewStats = {
  totalJobs: number;
  avgMatchScore: number;
  avgHiringProbability: number;
  appliedCount: number;
  interviewCount: number;
  offerCount: number;
  topVerifiedSkills: string[];
};

/**
 * Retrieves student profile context for matching (combining DB profile, GitHub analysis, and Resume)
 */
async function getStudentMatchingContext(userId: string, ctx?: { profile: any; githubAnalysis: any; resume: any }) {
  let profile = ctx?.profile;
  let githubAnalysis = ctx?.githubAnalysis;
  let resume = ctx?.resume;

  if (!ctx) {
    [profile, githubAnalysis, resume] = await Promise.all([
      db.getProfileByUserId(userId),
      db.getLatestGitHubAnalysis(userId),
      db.getLatestResumeByUserId(userId)
    ]);
  }

  // Extract verified skills from GitHub repos/analyses
  const verifiedGithubSkills: string[] = [];
  if (githubAnalysis?.suggestions && Array.isArray((githubAnalysis.suggestions as any)?.topSkills)) {
    verifiedGithubSkills.push(...(githubAnalysis.suggestions as any).topSkills);
  }

  return {
    targetRole: profile?.targetRole || "Software Engineer",
    skills: profile?.skills || ["React", "JavaScript", "HTML", "CSS", "Git"],
    verifiedGithubSkills: Array.from(new Set(verifiedGithubSkills)),
    experienceYears: 0,
    education: profile?.college ? `${profile.college} - ${profile.branch || "CS"}` : undefined,
    location: profile?.college || "India",
    preferredWorkMode: "Remote",
    resumeAtsScore: resume?.atsScore || 70,
  };
}

/**
 * Returns verified real jobs ranked by match score with full AI-estimated hiring probability
 */
export async function getVerifiedJobs(filters?: {
  search?: string;
  workMode?: string;
  minMatchScore?: number;
  status?: string;
}): Promise<{ jobs: VerifiedJobCard[]; stats: JobsOverviewStats }> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  // Execute independent database queries concurrently
  const [initialDbJobs, userApplications, profile, githubAnalysis, resume] = await Promise.all([
    prisma.job.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobApplication.findMany({
      where: { userId: user.id },
    }),
    db.getProfileByUserId(user.id),
    db.getLatestGitHubAnalysis(user.id),
    db.getLatestResumeByUserId(user.id)
  ]);

  let dbJobs = initialDbJobs;
  if (dbJobs.length === 0) {
    await syncAllJobs();
    dbJobs = await prisma.job.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  const appMap = new Map<string, { status: ApplicationStatus; appliedAt: Date | null }>();
  for (const app of userApplications) {
    appMap.set(app.jobId, { status: app.status, appliedAt: app.appliedAt });
  }

  const profileContext = await getStudentMatchingContext(user.id, { profile, githubAnalysis, resume });

  // Compute matches for all jobs
  const cards: VerifiedJobCard[] = [];
  for (const job of dbJobs) {
    const match = await computeJobMatch(
      profileContext,
      {
        id: job.id,
        company: job.company,
        title: job.title,
        description: job.description,
        location: job.location,
        workMode: job.workMode,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        experienceYears: job.experienceYears || 0,
      },
      false // quick deterministic for list view
    );

    const appInfo = appMap.get(job.id);

    cards.push({
      id: job.id,
      externalId: job.externalId,
      source: job.source,
      company: job.company,
      title: job.title,
      description: job.description,
      location: job.location,
      workMode: job.workMode,
      employmentType: job.employmentType,
      department: job.department,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      officialUrl: job.officialUrl,
      applicationUrl: job.applicationUrl,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      publishedAt: job.publishedAt,
      lastVerifiedAt: job.lastVerifiedAt,
      match,
      applicationStatus: appInfo?.status || null,
      appliedAt: appInfo?.appliedAt || null,
    });
  }

  // Filter
  let filtered = cards;
  if (filters?.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.company.toLowerCase().includes(query) ||
        c.requiredSkills.some((s) => s.toLowerCase().includes(query))
    );
  }
  if (filters?.workMode && filters.workMode !== "All") {
    filtered = filtered.filter((c) => c.workMode.toLowerCase() === filters.workMode!.toLowerCase());
  }
  if (filters?.minMatchScore) {
    filtered = filtered.filter((c) => c.match.overallMatchScore >= filters.minMatchScore!);
  }
  if (filters?.status && filters.status !== "ALL") {
    filtered = filtered.filter((c) => c.applicationStatus === filters.status);
  }

  // Sort by match score desc
  filtered.sort((a, b) => b.match.overallMatchScore - a.match.overallMatchScore);

  // Compute summary stats
  const totalJobs = cards.length;
  const avgMatchScore = totalJobs > 0 ? Math.round(cards.reduce((acc, j) => acc + j.match.overallMatchScore, 0) / totalJobs) : 0;
  const avgHiringProbability = totalJobs > 0 ? Math.round(cards.reduce((acc, j) => acc + j.match.hiringProbability, 0) / totalJobs) : 0;
  const appliedCount = userApplications.filter((a) => a.status === "APPLIED" || a.status === "INTERVIEW" || a.status === "OFFER").length;
  const interviewCount = userApplications.filter((a) => a.status === "INTERVIEW").length;
  const offerCount = userApplications.filter((a) => a.status === "OFFER").length;

  return {
    jobs: filtered,
    stats: {
      totalJobs,
      avgMatchScore,
      avgHiringProbability,
      appliedCount,
      interviewCount,
      offerCount,
      topVerifiedSkills: profileContext.verifiedGithubSkills.length > 0 ? profileContext.verifiedGithubSkills : profileContext.skills.slice(0, 4),
    },
  };
}

/**
 * Returns deep AI-enhanced analysis for a single job
 */
export async function getJobDetail(jobId: string): Promise<VerifiedJobCard | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return null;

  const profileContext = await getStudentMatchingContext(user.id);
  const match = await computeJobMatch(
    profileContext,
    {
      id: job.id,
      company: job.company,
      title: job.title,
      description: job.description,
      location: job.location,
      workMode: job.workMode,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      experienceYears: job.experienceYears || 0,
    },
    true // full AI enhancement with OpenRouter
  );

  const app = await prisma.jobApplication.findUnique({
    where: { userId_jobId: { userId: user.id, jobId: job.id } },
  });

  return {
    id: job.id,
    externalId: job.externalId,
    source: job.source,
    company: job.company,
    title: job.title,
    description: job.description,
    location: job.location,
    workMode: job.workMode,
    employmentType: job.employmentType,
    department: job.department,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    currency: job.currency,
    officialUrl: job.officialUrl,
    applicationUrl: job.applicationUrl,
    requiredSkills: job.requiredSkills,
    preferredSkills: job.preferredSkills,
    publishedAt: job.publishedAt,
    lastVerifiedAt: job.lastVerifiedAt,
    match,
    applicationStatus: app?.status || null,
    appliedAt: app?.appliedAt || null,
  };
}

/**
 * Updates application tracking status for a job (Saved, Applied, Interview, Offer, Rejected, Archived)
 */
export async function updateApplicationStatus(
  jobId: string,
  status: ApplicationStatus,
  notes?: string
) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const appliedAt = status === "APPLIED" || status === "INTERVIEW" || status === "OFFER" ? new Date() : undefined;

  const application = await prisma.jobApplication.upsert({
    where: {
      userId_jobId: {
        userId: user.id,
        jobId,
      },
    },
    update: {
      status,
      appliedAt: appliedAt ?? undefined,
      notes: notes ?? undefined,
    },
    create: {
      userId: user.id,
      jobId,
      status,
      appliedAt,
      notes,
    },
  });

  return { success: true, application };
}

/**
 * Simulates match score increase if student acquires specified skills
 */
export async function simulateJobSkillGain(jobId: string, acquiredSkills: string[]) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");

  const profileContext = await getStudentMatchingContext(user.id);
  const currentMatch = await computeJobMatch(
    profileContext,
    {
      id: job.id,
      company: job.company,
      title: job.title,
      description: job.description,
      location: job.location,
      workMode: job.workMode,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      experienceYears: job.experienceYears || 0,
    },
    false
  );

  const simulation = simulateSkillAcquisition(currentMatch, acquiredSkills, job.requiredSkills.length);
  return simulation;
}
