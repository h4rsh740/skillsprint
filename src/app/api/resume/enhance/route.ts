import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { AnalysisBundle, EnhanceResponse, JobInput, ResumeData } from "@/lib/resumeiq/types";
import { analyzeResume } from "@/lib/resumeiq/analyze";
import { enhanceResumeWithGemini, GeminiError } from "@/lib/resumeiq/gemini";
import { validateEnhancedResume } from "@/lib/resumeiq/resumeEnhancementValidator";
import { enhancedToResumeData } from "@/lib/resumeiq/resumeText";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  resume: z.any(),
  job: z.object({
    jobTitle: z.string(),
    jobDescription: z.string(),
    additionalSkills: z.array(z.string()).default([]),
  }),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (err: any) {
    console.error("Failed to parse JSON body:", err);
    return NextResponse.json({ ok: false, error: `Invalid request body: ${err.message}` }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    console.error("Zod parse failed:", parsed.error.format());
    return NextResponse.json({ ok: false, error: "Missing resume or job data.", details: parsed.error.format() }, { status: 400 });
  }

  const resume = parsed.data.resume as ResumeData;
  const job = parsed.data.job as JobInput;

  // Run local ATS analysis
  const originalAnalysis = analyzeResume(resume, job);

  let aiResult: EnhanceResponse;
  try {
    aiResult = await enhanceResumeWithGemini(
      resume,
      job,
      originalAnalysis.keywords,
      originalAnalysis.ats,
      originalAnalysis.issues
    );
  } catch (err) {
    const code = err instanceof GeminiError ? err.code : "UNKNOWN";
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: `Gemini enhancement failed: ${msg}`, code, aiUnavailable: true, originalAnalysis },
      { status: 502 }
    );
  }

  // Anti-hallucination validation
  const { sanitized, violations } = validateEnhancedResume(aiResult.enhancedResume, resume);
  
  // Recalculate enhanced ATS score using the same scoring engine
  const enhancedResumeData = enhancedToResumeData(sanitized);
  const enhancedAnalysis = analyzeResume(enhancedResumeData, job);

  return NextResponse.json({
    ok: true,
    enhancedResume: sanitized,
    changes: aiResult.changes,
    recommendations: aiResult.recommendations,
    violations,
    originalAnalysis,
    enhancedAnalysis,
    provider: "gemini",
  });
}
