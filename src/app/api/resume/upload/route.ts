import { NextResponse } from "next/server";
import { getSessionUser } from "@/actions/auth";
import { analyzeResume } from "@/actions/resume";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // analyzeResume performs validation, real text extraction, deterministic
    // ATS scoring, optional AI enrichment, and persistence to the database.
    const analysisResult = await analyzeResume(formData);

    return NextResponse.json({ success: true, result: analysisResult });
  } catch (err: any) {
    console.error("Resume upload API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
