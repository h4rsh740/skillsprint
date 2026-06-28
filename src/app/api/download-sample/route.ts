import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { generateCandidates } from "@/lib/candidateData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const candidates = generateCandidates();
    const rows = candidates.map(c => ({
      "Candidate ID": c.id,
      "Full Name": c.name,
      "Email": c.email,
      "Phone": c.phone,
      "College": c.education.college,
      "Degree": c.education.degree,
      "Graduation Year": c.education.year,
      "CGPA": c.cgpa,
      "Skills": c.skills.join(", "),
      "Experience": c.experience,
      "Current Company": c.company,
      "GitHub URL": c.github,
      "LinkedIn URL": c.linkedin,
      "Portfolio": c.portfolio,
      "Projects": c.projects.map(p => p.name).join(" | "),
      "Certifications": c.certifications.join(", "),
      "Resume Score": c.resumeScore,
      "ATS Score": c.atsScore,
      "Location": c.location,
      "Preferred Role": c.role,
      "Expected Salary": c.expectedSalary,
      "Availability": c.noticePeriod,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");

    // Style header row width
    const colWidths = Object.keys(rows[0]).map(() => ({ wch: 22 }));
    ws["!cols"] = colWidths;

    // Generate REAL Excel workbook using write() with bookType 'xlsx' and type 'array'
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="sample_candidates.xlsx"',
      },
    });
  } catch (err: any) {
    console.error("Failed to generate sample candidates excel:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
