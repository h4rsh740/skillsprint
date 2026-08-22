import { NextRequest, NextResponse } from "next/server";
import { generateReportPdf } from "@/lib/resumeiq/pdfGenerator";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const reportPayload = await req.json();
    if (!reportPayload) {
      return NextResponse.json({ ok: false, error: "Missing report payload." }, { status: 400 });
    }

    const uuid = randomUUID();
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `${uuid}_report.json`);
    
    await fs.writeFile(filePath, JSON.stringify(reportPayload), "utf-8");

    return NextResponse.json({ ok: true, id: uuid });
  } catch (error: any) {
    console.error("Error preparing report PDF:", error);
    return NextResponse.json({ ok: false, error: error.message || "Failed to prepare PDF report." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing report ID." }, { status: 400 });
    }

    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `${id}_report.json`);
    
    let fileContent;
    try {
      fileContent = await fs.readFile(filePath, "utf-8");
    } catch {
      return NextResponse.json({ ok: false, error: "Report export session expired or invalid." }, { status: 404 });
    }
    
    const reportPayload = JSON.parse(fileContent);
    const pdfBytes = await generateReportPdf(reportPayload);
    
    // Cleanup
    await fs.unlink(filePath).catch(() => {});

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
      },
    });
  } catch (error: any) {
    console.error("Error generating report PDF:", error);
    return NextResponse.json({ ok: false, error: error.message || "Failed to generate PDF report." }, { status: 500 });
  }
}
