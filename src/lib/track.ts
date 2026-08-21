/**
 * track.ts — Lightweight event tracking utility
 *
 * Safe to call from server actions and API routes.
 * Never throws — a tracking failure must never break the calling feature.
 * Uses Prisma when DATABASE_URL is set; falls back to the local JSON store otherwise.
 */

import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "prisma", "db.json");
const USE_PRISMA = !!process.env.DATABASE_URL;

/** Append an event to the local JSON fallback store */
function trackLocal(userId: string, eventType: string, metadata?: Record<string, unknown>) {
  try {
    let store: Record<string, any[]> = { events: [] };
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      store = JSON.parse(raw || "{}");
      if (!Array.isArray(store.events)) store.events = [];
    }
    store.events.push({
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      eventType,
      metadata: metadata ?? null,
      createdAt: new Date().toISOString(),
    });
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("[track] Local JSON fallback write failed:", err);
  }
}

/**
 * Track an analytics event for a user.
 *
 * @param userId    - The user's DB ID
 * @param eventType - e.g. "session_start" | "resume_uploaded" | "github_ingested" | "gap_analysis_completed"
 * @param metadata  - Optional JSON payload
 */
export async function track(
  userId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    if (USE_PRISMA) {
      await prisma.event.create({
        data: {
          userId,
          eventType,
          // Prisma requires InputJsonValue — cast from Record<string, unknown>
          metadata: metadata as Parameters<typeof prisma.event.create>[0]["data"]["metadata"],
        },
      });
    } else {
      trackLocal(userId, eventType, metadata);
    }
  } catch (err) {
    // Never let a tracking failure break the caller.
    console.error(`[track] Failed to record event "${eventType}" for user "${userId}":`, err);
  }
}
