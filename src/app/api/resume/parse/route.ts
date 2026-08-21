import { NextRequest, NextResponse } from "next/server";
import { parsePdfResume } from "@/lib/resumeiq/resumeParser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (buffer.length === 0) {
      return NextResponse.json({ ok: false, error: "Empty file buffer." }, { status: 400 });
    }

    const resumeData = await parsePdfResume(buffer);
    return NextResponse.json({ ok: true, resume: resumeData });
  } catch (error: any) {
    console.error("Error parsing resume PDF:", error);
    return NextResponse.json({ ok: false, error: error.message || "Failed to parse PDF resume." }, { status: 500 });
  }
}
