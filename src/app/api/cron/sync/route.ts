import { NextRequest, NextResponse } from "next/server";
import { syncAllJobs } from "@/lib/opportunities/jobs/providers";
import { syncAllHackathons } from "@/lib/opportunities/hackathons/providers";

/**
 * Daily sync cron endpoint.
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/sync", "schedule": "0 0 * * *" }]
 * }
 *
 * Secured by CRON_SECRET env var (set in Vercel dashboard).
 * Vercel passes it automatically via the `Authorization` header.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  // Allow either: a matching CRON_SECRET header, or no secret configured (dev mode)
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const results: Record<string, unknown> = {};

  // ── Sync Jobs ──────────────────────────────────────────────────────────────
  try {
    const jobResult = await syncAllJobs();
    results.jobs = { ...jobResult, ok: true };
    console.log("[Cron] Jobs sync complete:", jobResult);
  } catch (err: any) {
    results.jobs = { ok: false, error: err?.message || String(err) };
    console.error("[Cron] Jobs sync failed:", err);
  }

  // ── Sync Hackathons (includes purge of ended events) ───────────────────────
  try {
    const hackResult = await syncAllHackathons();
    results.hackathons = { ...hackResult, ok: true };
    console.log("[Cron] Hackathons sync complete:", hackResult);
  } catch (err: any) {
    results.hackathons = { ok: false, error: err?.message || String(err) };
    console.error("[Cron] Hackathons sync failed:", err);
  }

  const durationMs = Date.now() - startedAt;

  return NextResponse.json({
    success: true,
    syncedAt: new Date().toISOString(),
    durationMs,
    results,
  });
}
