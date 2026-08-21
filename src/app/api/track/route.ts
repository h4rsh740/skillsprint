import { type NextRequest, NextResponse } from "next/server";
import { track } from "@/lib/track";
import { cookies } from "next/headers";

/**
 * POST /api/track
 * Body: { userId?: string, eventType: string, metadata?: Record<string, unknown> }
 *
 * Thin HTTP wrapper around track() so client components can fire analytics
 * events without importing the server-only track.ts module.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, metadata } = body;

    if (!eventType || typeof eventType !== "string") {
      return NextResponse.json({ error: "eventType required" }, { status: 400 });
    }

    // Try to read userId from session cookie first, fall back to body, then anonymous
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session_user_id");
    const userId: string =
      sessionCookie?.value ?? body.userId ?? "anonymous";

    await track(userId, eventType, metadata ?? {});
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[/api/track] error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
