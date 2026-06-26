import { NextResponse } from "next/server";
import { getSessionUser } from "@/actions/auth";
import { analyzeResume } from "@/actions/resume";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("resume") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Call analyzeResume server action
    // This action parses the resume, scores it, checks keyword gaps, and saves it in database
    const analysisResult = await analyzeResume(formData);

    // Save resume file metadata
    await db.saveResumeFile(user.id, {
      fileName: file.name,
      fileUrl: `/uploads/${user.id}/${Date.now()}_${file.name}`,
      fileSize: file.size,
      fileType: file.type || "application/pdf"
    });

    // Save resume analysis details in PostgreSQL/JSON DB
    await db.saveResumeAnalysis(user.id, {
      atsScore: analysisResult.atsScore,
      resumeScore: analysisResult.resumeScore,
      impactScore: Math.round(analysisResult.atsScore * 0.9),
      technicalScore: Math.round(analysisResult.resumeScore * 0.95),
      formattingScore: 85,
      grammarScore: 90,
      weakBulletPoints: analysisResult.improvementSuggestions.map(s => s.title),
      missingMetrics: ["Missing specific KPIs in projects"],
      duplicateContent: [],
      missingActionVerbs: [],
      suggestions: analysisResult
    });

    // Track sync history
    await db.createSyncHistory(user.id, {
      provider: "resume",
      status: "success",
      details: { fileName: file.name, atsScore: analysisResult.atsScore }
    });

    // Notify user
    await db.createNotification(user.id, {
      title: "Resume Analyzed",
      message: `Your resume "${file.name}" was scanned. ATS Score: ${analysisResult.atsScore}/100.`
    });

    return NextResponse.json({ success: true, result: analysisResult });
  } catch (err: any) {
    console.error("Resume upload API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
