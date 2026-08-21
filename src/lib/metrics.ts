/**
 * metrics.ts — Activation and retention query layer
 *
 * getActivationRate()     — % of users who completed resume upload + GitHub ingestion
 * getRetentionRate(7|30)  — % of users who returned within N days of gap analysis
 *
 * Uses Prisma when DATABASE_URL is set; reads local JSON store otherwise.
 */

import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "prisma", "db.json");
const USE_PRISMA = !!process.env.DATABASE_URL;

// ─── Local JSON helpers ───────────────────────────────────────────────────────

function readLocalDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return { users: [], events: [] };
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return { users: [], events: [] };
  }
}

// ─── Activation Rate ─────────────────────────────────────────────────────────

export type ActivationResult = {
  total: number;
  activated: number;
  rate: number; // 0–100 percentage
};

/**
 * Returns the % of signed-up users who have completed BOTH
 * resume upload AND GitHub ingestion.
 */
export async function getActivationRate(): Promise<ActivationResult> {
  if (USE_PRISMA) {
    const [total, activated] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { resumeUploaded: true, githubIngested: true },
      }),
    ]);
    return {
      total,
      activated,
      rate: total === 0 ? 0 : Math.round((activated / total) * 100),
    };
  }

  // Local JSON fallback
  const store = readLocalDB();
  const users: any[] = store.users || [];
  const total = users.length;
  const activated = users.filter(
    (u: any) => u.resumeUploaded && u.githubIngested
  ).length;
  return {
    total,
    activated,
    rate: total === 0 ? 0 : Math.round((activated / total) * 100),
  };
}

// ─── Retention Rate ───────────────────────────────────────────────────────────

export type RetentionResult = {
  windowDays: 7 | 30;
  cohortSize: number;    // users who completed gap analysis ≥ windowDays ago
  returned: number;      // cohort members who had a session_start in the return window
  rate: number;          // 0–100 percentage
};

/**
 * Retention cohort logic:
 *   cohort  = users with a `gap_analysis_completed` event at least `windowDays` ago
 *   returned = cohort members with a `session_start` event that occurred AFTER
 *              their first gap analysis AND within `windowDays` of it.
 *
 * Example for 7-day window:
 *   User A completed gap analysis on Day 1 → comes back on Day 5 → counted as retained.
 *   User B completed gap analysis on Day 1 → never returns → not retained.
 */
export async function getRetentionRate(
  windowDays: 7 | 30
): Promise<RetentionResult> {
  if (USE_PRISMA) {
    // Raw SQL for correctness with window functions.
    // Cohort: first gap_analysis_completed per user, at least windowDays ago.
    // Returned: that user also has a session_start AFTER their first gap analysis
    //           AND within the window [firstGap, firstGap + windowDays].
    const rows = await prisma.$queryRaw<{ cohort_size: bigint; returned: bigint }[]>`
      WITH first_gap AS (
        SELECT
          "userId",
          MIN("createdAt") AS gap_date
        FROM events
        WHERE "eventType" = 'gap_analysis_completed'
          AND "createdAt" <= NOW() - INTERVAL '1 day' * ${windowDays}
        GROUP BY "userId"
      ),
      returned AS (
        SELECT DISTINCT fg."userId"
        FROM first_gap fg
        JOIN events e
          ON  e."userId"    = fg."userId"
          AND e."eventType" = 'session_start'
          AND e."createdAt" > fg.gap_date
          AND e."createdAt" <= fg.gap_date + INTERVAL '1 day' * ${windowDays}
      )
      SELECT
        (SELECT COUNT(*) FROM first_gap)  AS cohort_size,
        (SELECT COUNT(*) FROM returned)   AS returned
    `;

    const cohortSize = Number(rows[0]?.cohort_size ?? 0);
    const returned = Number(rows[0]?.returned ?? 0);
    return {
      windowDays,
      cohortSize,
      returned,
      rate: cohortSize === 0 ? 0 : Math.round((returned / cohortSize) * 100),
    };
  }

  // Local JSON fallback (in-memory calculation)
  const store = readLocalDB();
  const events: any[] = store.events || [];
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Find each user's earliest gap_analysis_completed event that is old enough
  const gapMap = new Map<string, Date>();
  for (const ev of events) {
    if (ev.eventType !== "gap_analysis_completed") continue;
    const d = new Date(ev.createdAt);
    if (d > cutoff) continue; // not old enough yet
    const existing = gapMap.get(ev.userId);
    if (!existing || d < existing) gapMap.set(ev.userId, d);
  }

  const cohortSize = gapMap.size;
  if (cohortSize === 0) {
    return { windowDays, cohortSize: 0, returned: 0, rate: 0 };
  }

  // Find how many returned: session_start after gap_date and within window
  const returnedSet = new Set<string>();
  for (const ev of events) {
    if (ev.eventType !== "session_start") continue;
    const gapDate = gapMap.get(ev.userId);
    if (!gapDate) continue;
    const sessionDate = new Date(ev.createdAt);
    const windowEnd = new Date(gapDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
    if (sessionDate > gapDate && sessionDate <= windowEnd) {
      returnedSet.add(ev.userId);
    }
  }

  const returned = returnedSet.size;
  return {
    windowDays,
    cohortSize,
    returned,
    rate: Math.round((returned / cohortSize) * 100),
  };
}

// ─── Paywall CTR ─────────────────────────────────────────────────────────────

export type PaywallCTRResult = {
  shown: number;
  clicked: number;
  rate: number; // 0–100 percentage
};

/**
 * Paywall click-through rate:
 *   shown   = count of `paywall_shown` events
 *   clicked = count of `paywall_upgrade_clicked` events
 *   rate    = clicked / shown * 100
 */
export async function getPaywallCTR(): Promise<PaywallCTRResult> {
  if (USE_PRISMA) {
    const [shown, clicked] = await Promise.all([
      prisma.event.count({ where: { eventType: "paywall_shown" } }),
      prisma.event.count({ where: { eventType: "paywall_upgrade_clicked" } }),
    ]);
    return { shown, clicked, rate: shown === 0 ? 0 : Math.round((clicked / shown) * 100) };
  }

  const store = readLocalDB();
  const events: any[] = store.events || [];
  const shown = events.filter((e) => e.eventType === "paywall_shown").length;
  const clicked = events.filter((e) => e.eventType === "paywall_upgrade_clicked").length;
  return { shown, clicked, rate: shown === 0 ? 0 : Math.round((clicked / shown) * 100) };
}

// ─── Pricing Option Clicks ─────────────────────────────────────────────────────

export type PricingOptionClicksResult = {
  monthly: number;
  season_pass: number;
};

/**
 * Counts how many times each pricing option CTA was clicked,
 * read from `pricing_option_clicked` events grouped by metadata.option.
 */
export async function getPricingOptionClicks(): Promise<PricingOptionClicksResult> {
  if (USE_PRISMA) {
    const rows = await prisma.$queryRaw<{ option: string; cnt: bigint }[]>`
      SELECT
        metadata->>'option' AS option,
        COUNT(*) AS cnt
      FROM events
      WHERE "eventType" = 'pricing_option_clicked'
        AND metadata->>'option' IS NOT NULL
      GROUP BY metadata->>'option'
    `;
    const map = Object.fromEntries(rows.map((r) => [r.option, Number(r.cnt)]));
    return { monthly: map["monthly"] ?? 0, season_pass: map["season_pass"] ?? 0 };
  }

  const store = readLocalDB();
  const events: any[] = store.events || [];
  const clicks = events.filter((e) => e.eventType === "pricing_option_clicked");
  const monthly = clicks.filter((e) => e.metadata?.option === "monthly").length;
  const season_pass = clicks.filter((e) => e.metadata?.option === "season_pass").length;
  return { monthly, season_pass };
}

// ─── Waitlist Signups ────────────────────────────────────────────────────────────────

export type WaitlistSignupsResult = {
  total: number;
  monthly: number;
  season_pass: number;
};

/**
 * Counts completed waitlist submissions (eventType = 'waitlist_signup'),
 * split by which pricing option the user chose.
 */
export async function getWaitlistSignups(): Promise<WaitlistSignupsResult> {
  if (USE_PRISMA) {
    const rows = await prisma.$queryRaw<{ option: string; cnt: bigint }[]>`
      SELECT
        metadata->>'option' AS option,
        COUNT(*) AS cnt
      FROM events
      WHERE "eventType" = 'waitlist_signup'
        AND metadata->>'option' IS NOT NULL
      GROUP BY metadata->>'option'
    `;
    const map = Object.fromEntries(rows.map((r) => [r.option, Number(r.cnt)]));
    const monthly = map["monthly"] ?? 0;
    const season_pass = map["season_pass"] ?? 0;
    return { total: monthly + season_pass, monthly, season_pass };
  }

  const store = readLocalDB();
  const events: any[] = store.events || [];
  const signups = events.filter((e) => e.eventType === "waitlist_signup");
  const monthly = signups.filter((e) => e.metadata?.option === "monthly").length;
  const season_pass = signups.filter((e) => e.metadata?.option === "season_pass").length;
  return { total: monthly + season_pass, monthly, season_pass };
}
