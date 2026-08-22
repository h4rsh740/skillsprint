import { NextRequest, NextResponse } from "next/server";
import { generateResumePdf } from "@/lib/resumeiq/pdfGenerator";
import type { EnhancedResume } from "@/lib/resumeiq/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.resume) {
      return NextResponse.json({ ok: false, error: "Missing enhanced resume data." }, { status: 400 });
    }

    const resumeData: EnhancedResume = body.resume;

    // Generate PDF in this same request — no tmp file, no cross-container issues
    const pdfBytes = await generateResumePdf(resumeData);

    if (!pdfBytes || pdfBytes.byteLength === 0) {
      return NextResponse.json({ ok: false, error: "PDF generation returned an empty file." }, { status: 500 });
    }

    const rawName = resumeData.personal?.name || resumeData.name || "Candidate";
    const cleanName = rawName
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "") || "Candidate";
    const filename = `${cleanName}_Enhanced_Resume.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[PDF] Error generating resume PDF:", error);
    return NextResponse.json({ ok: false, error: error.message || "Failed to generate PDF resume." }, { status: 500 });
  }
}
