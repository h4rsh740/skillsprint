import { NextRequest, NextResponse } from "next/server";
import { generateReportPdf } from "@/lib/resumeiq/pdfGenerator";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const reportPayload = await req.json();
    if (!reportPayload) {
      return NextResponse.json({ ok: false, error: "Missing report payload." }, { status: 400 });
    }

    const pdfBytes = await generateReportPdf(reportPayload);
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=ats-report.pdf",
      },
    });
  } catch (error: any) {
    console.error("Error generating report PDF:", error);
    return NextResponse.json({ ok: false, error: error.message || "Failed to generate PDF report." }, { status: 500 });
  }
}
