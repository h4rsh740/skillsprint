import { NextRequest, NextResponse } from "next/server";
import { generateResumePdf } from "@/lib/resumeiq/pdfGenerator";
import { EnhancedResume } from "@/lib/resumeiq/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.resume) {
      return NextResponse.json({ ok: false, error: "Missing enhanced resume data." }, { status: 400 });
    }

    const pdfBytes = await generateResumePdf(body.resume as EnhancedResume);
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=enhanced-resume.pdf",
      },
    });
  } catch (error: any) {
    console.error("Error generating resume PDF:", error);
    return NextResponse.json({ ok: false, error: error.message || "Failed to generate PDF resume." }, { status: 500 });
  }
}
