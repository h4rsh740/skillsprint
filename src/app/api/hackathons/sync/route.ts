import { NextResponse } from "next/server";
import { syncAllHackathons } from "@/lib/opportunities/hackathons/providers";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await syncAllHackathons();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error("[API hackathons/sync] Error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Sync failed" }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
