// Client-side PDF generation using jsPDF.
//
// Produces selectable, searchable, ATS-friendly text PDFs (never images).
// `jspdf` is imported dynamically so it never runs during server rendering.

import { titleCase } from "./resumeEnhancementEngine";
import type { ResumeData, ResumeAnalysis } from "./types";

type Doc = any;

const MARGIN = 40;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

class PdfWriter {
  doc: Doc;
  y: number;
  constructor(doc: Doc) {
    this.doc = doc;
    this.y = MARGIN;
  }
  ensureSpace(h: number) {
    if (this.y + h > PAGE_H - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }
  heading(text: string, color = [79, 70, 229]) {
    this.ensureSpace(26);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(color[0], color[1], color[2]);
    this.doc.text(text.toUpperCase(), MARGIN, this.y);
    this.y += 6;
    this.doc.setDrawColor(210, 214, 230);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN, this.y, MARGIN + CONTENT_W, this.y);
    this.y += 12;
    this.doc.setTextColor(30, 41, 59);
  }
  paragraph(text: string, size = 10, gap = 4) {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(51, 65, 85);
    const lines = this.doc.splitTextToSize(text, CONTENT_W);
    for (const line of lines) {
      this.ensureSpace(size + 2);
      this.doc.text(line, MARGIN, this.y);
      this.y += size + 2;
    }
    this.y += gap;
  }
  bullet(text: string, size = 10) {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(51, 65, 85);
    const lines = this.doc.splitTextToSize(text, CONTENT_W - 14);
    lines.forEach((line: string, i: number) => {
      this.ensureSpace(size + 2);
      if (i === 0) this.doc.text("•", MARGIN + 4, this.y);
      this.doc.text(line, MARGIN + 16, this.y);
      this.y += size + 2;
    });
    this.y += 1;
  }
  spaced() {
    this.y += 6;
  }
}

function safeName(name: string): string {
  const cleaned = (name || "Candidate").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  return cleaned || "Candidate";
}

export async function generateEnhancedResumePDF(data: ResumeData, fileName?: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc: Doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = new PdfWriter(doc);

  // Name + contact
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(data.personalInfo.name || "Candidate", MARGIN, w.y);
  w.y += 22;

  const contactParts = [
    data.personalInfo.email,
    data.personalInfo.phone,
    data.personalInfo.location,
    data.personalInfo.github,
    data.personalInfo.linkedin,
  ].filter(Boolean);
  if (contactParts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    const lines = doc.splitTextToSize(contactParts.join("  |  "), CONTENT_W);
    for (const line of lines) {
      w.ensureSpace(12);
      doc.text(line, MARGIN, w.y);
      w.y += 12;
    }
    w.y += 6;
  }

  if (data.summary) w.heading("Professional Summary"), w.paragraph(data.summary);

  if (data.skills.length) {
    w.heading("Technical Skills");
    w.paragraph(data.skills.map(titleCase).join("  •  "), 9.5, 6);
  }

  if (data.experience.length) {
    w.heading("Experience");
    for (const e of data.experience) {
      w.ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(e.heading || "Role", MARGIN, w.y);
      w.y += 14;
      for (const b of e.bullets) w.bullet(b, 9.5);
      w.spaced();
    }
  }

  if (data.projects.length) {
    w.heading("Projects");
    for (const p of data.projects) {
      w.ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(p.heading || "Project", MARGIN, w.y);
      w.y += 14;
      for (const b of p.bullets) w.bullet(b, 9.5);
      w.spaced();
    }
  }

  if (data.education.length) {
    w.heading("Education");
    for (const e of data.education) w.paragraph(e.text || "", 9.5, 2);
    w.spaced();
  }

  if (data.certifications.length) {
    w.heading("Certifications");
    for (const c of data.certifications) w.paragraph(c.text || "", 9.5, 2);
    w.spaced();
  }

  if (data.achievements.length) {
    w.heading("Achievements");
    for (const a of data.achievements) w.bullet(a, 9.5);
  }

  const outName = fileName || `${safeName(data.personalInfo.name)}_Enhanced_Resume.pdf`;
  doc.save(outName);
}

export async function generateAnalysisReportPDF(analysis: ResumeAnalysis): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc: Doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = new PdfWriter(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("Resume Analysis Report", MARGIN, w.y);
  w.y += 20;
  w.paragraph(`Candidate: ${analysis.original.personalInfo.name || "Candidate"}`, 10);
  w.paragraph(`Target role: ${analysis.job.title || "Not specified"}`, 10);
  w.paragraph(`Source file: ${analysis.fileName}`, 10);

  w.heading("ATS Score Summary");
  const improvement = analysis.afterScore.total - analysis.beforeScore.total;
  w.paragraph(`Original ATS Score: ${analysis.beforeScore.total}/100 (${analysis.beforeScore.grade})`, 11);
  w.paragraph(`Enhanced ATS Score: ${analysis.afterScore.total}/100 (${analysis.afterScore.grade})`, 11);
  w.paragraph(`Improvement: ${improvement >= 0 ? "+" : ""}${improvement} points`, 11, 6);

  w.heading("Estimated Resume Screening Chance");
  w.paragraph(`${analysis.screening.percent}%`, 12, 4);
  w.paragraph(analysis.screening.disclaimer, 9, 6);
  if (analysis.screening.factorsIncreasing.length) {
    w.paragraph("Factors increasing the chance:", 10);
    analysis.screening.factorsIncreasing.forEach((f) => w.bullet(f, 9.5));
  }
  if (analysis.screening.factorsDecreasing.length) {
    w.paragraph("Factors decreasing the chance:", 10);
    analysis.screening.factorsDecreasing.forEach((f) => w.bullet(f, 9.5));
  }

  w.heading("Score Comparison (Before → After)");
  for (const c of analysis.beforeScore.categories) {
    const after = analysis.afterScore.categories.find((a) => a.key === c.key);
    w.paragraph(`${c.label}: ${c.score}/${c.max}  →  ${after ? after.score : c.score}/${c.max}`, 9.5, 1);
  }
  w.spaced();

  w.heading("Missing Keywords (recommendations)");
  if (analysis.keywords.missing.length) w.paragraph(analysis.keywords.missing.map(titleCase).join(", "), 9.5, 6);
  else w.paragraph("None — all target keywords were found.", 9.5, 6);

  w.heading("ATS Weaknesses & Issues");
  if (analysis.issues.length) {
    for (const issue of analysis.issues) {
      w.paragraph(`[${issue.severity}] ${issue.title}`, 10);
      w.paragraph(`Why: ${issue.why}`, 9);
      w.paragraph(`Fix: ${issue.recommendation}`, 9, 4);
    }
  } else {
    w.paragraph("No significant weaknesses detected.", 9.5, 6);
  }

  w.heading("Recommended Changes Applied");
  analysis.enhanced.changes.slice(0, 30).forEach((ch) => {
    w.paragraph(`• [${ch.changeType}] ${ch.section}: ${ch.reason}`, 9);
    w.paragraph(`   ATS impact: ${ch.atsImpact}`, 8.5, 4);
  });

  const outName = `${safeName(analysis.original.personalInfo.name)}_Resume_Analysis.pdf`;
  doc.save(outName);
}
