import { NextResponse } from "next/server";
import { syncAllJobs } from "@/lib/opportunities/jobs/providers";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await syncAllJobs();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error("[API jobs/sync] Error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Sync failed" }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
