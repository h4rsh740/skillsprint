import { NextRequest, NextResponse } from "next/server";
import { generateReportPdf } from "@/lib/resumeiq/pdfGenerator";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const reportPayload = await req.json();
    if (!reportPayload) {
      return NextResponse.json({ ok: false, error: "Missing report payload." }, { status: 400 });
    }

    // Generate PDF in this same request — no tmp file, no cross-container issues
    const pdfBytes = await generateReportPdf(reportPayload);

    if (!pdfBytes || pdfBytes.byteLength === 0) {
      return NextResponse.json({ ok: false, error: "Report PDF generation returned an empty file." }, { status: 500 });
    }

    const cleanName = (reportPayload.name || "Candidate")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "") || "Candidate";
    const filename = `${cleanName}_ATS_Analysis_Report.pdf`;

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
    console.error("[PDF] Error generating report PDF:", error);
    return NextResponse.json({ ok: false, error: error.message || "Failed to generate PDF report." }, { status: 500 });
  }
}
