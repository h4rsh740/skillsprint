import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { generateResumePdf } from "@/lib/resumeiq/pdfGenerator";
import type { EnhancedResume } from "@/lib/resumeiq/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.resume) {
      return NextResponse.json({ ok: false, error: "Missing enhanced resume data." }, { status: 400 });
    }

    const uuid = randomUUID();
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `${uuid}.json`);
    
    // Save to temp file for the GET route
    await fs.writeFile(filePath, JSON.stringify(body.resume), "utf-8");

    return NextResponse.json({ ok: true, id: uuid });
  } catch (error: any) {
    console.error("Error preparing resume PDF:", error);
    return NextResponse.json({ ok: false, error: error.message || "Failed to prepare PDF resume." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing resume ID." }, { status: 400 });
    }

    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `${id}.json`);
    
    let fileContent;
    try {
      fileContent = await fs.readFile(filePath, "utf-8");
    } catch {
      return NextResponse.json({ ok: false, error: "Resume export session expired or invalid." }, { status: 404 });
    }
    
    const resumeData: EnhancedResume = JSON.parse(fileContent);

    // Clean up temporary storage immediately after reading
    await fs.unlink(filePath).catch(() => {});

    // Generate ATS-compliant PDF bytes via pdf-lib
    const pdfBytes = await generateResumePdf(resumeData);
    
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
      },
    });
  } catch (error: any) {
    console.error("Error generating resume PDF:", error);
    return NextResponse.json({ ok: false, error: error.message || "Failed to generate PDF resume." }, { status: 500 });
  }
}

