"use server";

import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";
import { syncAllHackathons } from "@/lib/opportunities/hackathons/providers";
import { computeHackathonFit, type HackathonFitResult } from "@/lib/matching/hackathonMatcher";
import type { SavedHackathonStatus, OpportunityStatus } from "@prisma/client";

export type VerifiedHackathonCard = {
  id: string;
  externalId: string;
  source: string;
  name: string;
  organizer: string;
  description: string;
  officialUrl: string;
  registrationUrl: string;
  registrationDeadline?: Date | null;
  submissionDeadline?: Date | null;
  teamSizeMin: number;
  teamSizeMax: number;
  eligibility: string;
  themes: string[];
  technologies: string[];
  prize?: string | null;
  currency?: string | null;
  mode: string;
  location?: string | null;
  status: OpportunityStatus;
  lastVerifiedAt: Date;
  fit: HackathonFitResult;
  savedStatus?: SavedHackathonStatus | null;
  daysRemaining: number;
};

export type HackathonOverviewStats = {
  totalActive: number;
  avgFitScore: number;
  bridgingOpportunitiesCount: number;
  savedCount: number;
  registeredCount: number;
};

/**
 * Returns verified active hackathons with fit scoring and the Skill-to-Hackathon Bridge
 */
export async function getVerifiedHackathons(filters?: {
  search?: string;
  platform?: string;
  theme?: string;
  mode?: string;
}): Promise<{ hackathons: VerifiedHackathonCard[]; stats: HackathonOverviewStats }> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  // Execute independent database queries concurrently
  const [initialDbHackathons, profile, activeJobs, savedList] = await Promise.all([
    prisma.hackathon.findMany({
      orderBy: { registrationDeadline: "asc" },
    }),
    db.getProfileByUserId(user.id),
    prisma.job.findMany({
      where: { isActive: true },
      select: { requiredSkills: true, preferredSkills: true },
      take: 10,
    }),
    prisma.savedHackathon.findMany({
      where: { userId: user.id },
    })
  ]);

  let dbHackathons = initialDbHackathons;
  if (dbHackathons.length === 0) {
    await syncAllHackathons();
    dbHackathons = await prisma.hackathon.findMany({
      orderBy: { registrationDeadline: "asc" },
    });
  }

  const studentSkills = profile?.skills || ["React", "JavaScript", "HTML", "CSS"];

  const allJobSkills = new Set<string>();
  for (const j of activeJobs) {
    j.requiredSkills.forEach((s) => allJobSkills.add(s));
    j.preferredSkills.forEach((s) => allJobSkills.add(s));
  }
  const targetJobMissingSkills = Array.from(allJobSkills).filter(
    (s) => !studentSkills.some((us: string) => us.toLowerCase() === s.toLowerCase())
  );

  const savedMap = new Map<string, SavedHackathonStatus>();
  for (const s of savedList) {
    savedMap.set(s.hackathonId, s.status);
  }

  const now = new Date();
  const cards: VerifiedHackathonCard[] = [];

  for (const h of dbHackathons) {
    const fit = await computeHackathonFit(
      studentSkills,
      targetJobMissingSkills,
      {
        id: h.id,
        name: h.name,
        organizer: h.organizer,
        description: h.description,
        themes: h.themes,
        technologies: h.technologies,
        eligibility: h.eligibility,
        mode: h.mode,
        registrationDeadline: h.registrationDeadline,
        prize: h.prize,
      },
      false
    );

    const deadlineMs = h.registrationDeadline ? h.registrationDeadline.getTime() - now.getTime() : 0;
    const daysRemaining = Math.max(0, Math.ceil(deadlineMs / 86400000));

    cards.push({
      id: h.id,
      externalId: h.externalId,
      source: h.source,
      name: h.name,
      organizer: h.organizer,
      description: h.description,
      officialUrl: h.officialUrl,
      registrationUrl: h.registrationUrl,
      registrationDeadline: h.registrationDeadline,
      submissionDeadline: h.submissionDeadline,
      teamSizeMin: h.teamSizeMin,
      teamSizeMax: h.teamSizeMax,
      eligibility: h.eligibility,
      themes: h.themes,
      technologies: h.technologies,
      prize: h.prize,
      currency: h.currency,
      mode: h.mode,
      location: h.location,
      status: h.status,
      lastVerifiedAt: h.lastVerifiedAt,
      fit,
      savedStatus: savedMap.get(h.id) || null,
      daysRemaining,
    });
  }

  // Filter
  let filtered = cards;
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.organizer.toLowerCase().includes(q) ||
        c.technologies.some((t) => t.toLowerCase().includes(q)) ||
        c.themes.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (filters?.platform && filters.platform !== "All") {
    filtered = filtered.filter((c) => c.source.toLowerCase() === filters.platform!.toLowerCase());
  }
  if (filters?.mode && filters.mode !== "All") {
    filtered = filtered.filter((c) => c.mode.toLowerCase() === filters.mode!.toLowerCase());
  }

  filtered.sort((a, b) => b.fit.fitScore - a.fit.fitScore);

  const totalActive = cards.filter((c) => c.status !== "ENDED").length;
  const avgFitScore = cards.length > 0 ? Math.round(cards.reduce((acc, h) => acc + h.fit.fitScore, 0) / cards.length) : 0;
  const bridgingOpportunitiesCount = cards.filter((c) => c.fit.bridgedJobSkills.length > 0).length;
  const savedCount = savedList.filter((s) => s.status === "SAVED").length;
  const registeredCount = savedList.filter((s) => s.status === "REGISTERED").length;

  return {
    hackathons: filtered,
    stats: {
      totalActive,
      avgFitScore,
      bridgingOpportunitiesCount,
      savedCount,
      registeredCount,
    },
  };
}

/**
 * Updates hackathon saved/registered tracking status
 */
export async function updateSavedHackathonStatus(
  hackathonId: string,
  status: SavedHackathonStatus,
  notes?: string
) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const saved = await prisma.savedHackathon.upsert({
    where: {
      userId_hackathonId: {
        userId: user.id,
        hackathonId,
      },
    },
    update: {
      status,
      notes: notes ?? undefined,
    },
    create: {
      userId: user.id,
      hackathonId,
      status,
      notes,
    },
  });

  return { success: true, saved };
}
