import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { JobInput, ResumeData } from "@/lib/resumeiq/types";
import { analyzeResume } from "@/lib/resumeiq/analyze";

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
    return NextResponse.json({ ok: false, error: `Invalid request body: ${err.message}` }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Missing resume or job data.", details: parsed.error.format() }, { status: 400 });
  }

  const resume = parsed.data.resume as ResumeData;
  const job = parsed.data.job as JobInput;

  try {
    const originalAnalysis = analyzeResume(resume, job);
    return NextResponse.json({
      ok: true,
      originalAnalysis
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to analyze resume." }, { status: 500 });
  }
}
