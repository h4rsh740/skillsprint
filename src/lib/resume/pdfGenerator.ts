// Client-side PDF generation using jsPDF.
//
// Produces selectable, searchable, ATS-friendly text PDFs (never images).
// `jspdf` is imported dynamically so it never runs during server rendering.

import { titleCase } from "./resumeEnhancementEngine";
import type { ResumeData, ResumeAnalysis } from "./types";
import { CATEGORIES } from "./skillDictionary";

type Doc = any;

const MARGIN = 40;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;
const INDENT = 14; // bullet indent

// ── Colour palette ──────────────────────────────────────────────────────────
const C = {
  name:     [15,  23,  42]  as const,  // slate-950
  accent:   [79,  70,  229] as const,  // indigo-600
  label:    [30,  41,  59]  as const,  // slate-800
  body:     [51,  65,  85]  as const,  // slate-700
  muted:    [100, 116, 139] as const,  // slate-500
  divider:  [203, 213, 225] as const,  // slate-300
  catLabel: [99,  102, 241] as const,  // indigo-400
};

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

  // Section heading with underline rule.
  heading(text: string) {
    this.ensureSpace(28);
    this.y += 4;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(...C.accent);
    this.doc.text(text.toUpperCase(), MARGIN, this.y);
    this.y += 5;
    this.doc.setDrawColor(...C.divider);
    this.doc.setLineWidth(0.5);
    this.doc.line(MARGIN, this.y, MARGIN + CONTENT_W, this.y);
    this.y += 10;
    this.doc.setTextColor(...C.body);
  }

  // Entry header (bold, dark).
  entryHeader(text: string) {
    this.ensureSpace(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...C.label);
    const lines = this.doc.splitTextToSize(text, CONTENT_W);
    for (const line of lines) {
      this.doc.text(line, MARGIN, this.y);
      this.y += 13;
    }
  }

  // Normal paragraph text.
  paragraph(text: string, size = 9.5, gapAfter = 4) {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...C.body);
    const lines = this.doc.splitTextToSize(text, CONTENT_W);
    for (const line of lines) {
      this.ensureSpace(size + 3);
      this.doc.text(line, MARGIN, this.y);
      this.y += size + 2;
    }
    this.y += gapAfter;
  }

  // Bullet point with hanging indent.
  bullet(text: string, size = 9.5) {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...C.body);
    const lines = this.doc.splitTextToSize(text, CONTENT_W - INDENT - 6);
    lines.forEach((line: string, i: number) => {
      this.ensureSpace(size + 3);
      if (i === 0) {
        this.doc.setTextColor(...C.accent);
        this.doc.text("▸", MARGIN + 2, this.y);
        this.doc.setTextColor(...C.body);
      }
      this.doc.text(line, MARGIN + INDENT, this.y);
      this.y += size + 2;
    });
    this.y += 1.5;
  }

  // Skill category row: bold label + normal skill list.
  skillRow(category: string, skills: string[]) {
    this.ensureSpace(14);
    const labelText = `${category}: `;
    const skillText = skills.map(titleCase).join(", ");

    // Measure label width.
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9);
    this.doc.setTextColor(...C.catLabel);
    const labelW = this.doc.getTextWidth(labelText);
    this.doc.text(labelText, MARGIN, this.y);

    // Skill list flows after the label, with wrapping.
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.setTextColor(...C.body);
    const availableW = CONTENT_W - labelW;
    const skillLines = this.doc.splitTextToSize(skillText, availableW);
    skillLines.forEach((line: string, i: number) => {
      this.ensureSpace(12);
      const xOffset = i === 0 ? MARGIN + labelW : MARGIN + labelW;
      this.doc.text(line, xOffset, this.y);
      if (i < skillLines.length - 1) this.y += 12;
    });
    this.y += 13;
  }

  gap(h = 5) {
    this.y += h;
  }
}

function safeName(name: string): string {
  const cleaned = (name || "Candidate").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  return cleaned || "Candidate";
}

// Group the skill list by CATEGORIES dictionary; returns ordered [cat, skills] pairs.
function groupedSkills(skills: string[]): [string, string[]][] {
  const result: [string, string[]][] = [];
  const used = new Set<string>();

  for (const [cat, list] of Object.entries(CATEGORIES)) {
    const hit = skills.filter((s) => list.includes(s) && !used.has(s));
    if (hit.length) {
      hit.forEach((s) => used.add(s));
      result.push([cat, hit]);
    }
  }
  // Uncategorized remainder
  const rest = skills.filter((s) => !used.has(s));
  if (rest.length) result.push(["Other", rest]);
  return result;
}

export async function generateEnhancedResumePDF(data: ResumeData, fileName?: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc: Doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = new PdfWriter(doc);

  // ── Header: Name ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.name);
  doc.text(data.personalInfo.name || "Candidate", MARGIN, w.y);
  w.y += 26;

  // ── Contact line ─────────────────────────────────────────────────────────
  const contactParts = [
    data.personalInfo.email,
    data.personalInfo.phone,
    data.personalInfo.location,
    data.personalInfo.github,
    data.personalInfo.linkedin,
  ].filter(Boolean) as string[];

  if (contactParts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    const contactLines = doc.splitTextToSize(contactParts.join("   |   "), CONTENT_W);
    for (const line of contactLines) {
      doc.text(line, MARGIN, w.y);
      w.y += 12;
    }
    w.y += 4;
  }

  // Thin divider under header
  doc.setDrawColor(...C.divider);
  doc.setLineWidth(1);
  doc.line(MARGIN, w.y, MARGIN + CONTENT_W, w.y);
  w.y += 14;

  // ── Sections rendered in the ORIGINAL resume's order ─────────────────────
  // Use the stored sectionOrder; fall back to a sensible default.
  const DEFAULT_ORDER = ["summary", "skills", "experience", "projects", "education", "certifications", "achievements"];
  const order: string[] = (data.sectionOrder && data.sectionOrder.length > 0)
    ? data.sectionOrder
    : DEFAULT_ORDER;

  // Ensure every section that has content is shown, even if not in sectionOrder.
  const rendered = new Set<string>();

  const renderSection = (key: string) => {
    if (rendered.has(key)) return;
    rendered.add(key);

    switch (key) {
      case "summary":
        if (data.summary) {
          w.heading("Professional Summary");
          w.paragraph(data.summary, 9.5, 6);
        }
        break;

      case "skills":
        if (data.skills.length) {
          w.heading("Technical Skills");
          const groups = groupedSkills(data.skills);
          for (const [cat, skills] of groups) {
            w.skillRow(cat, skills);
          }
          w.gap(2);
        }
        break;

      case "experience":
        if (data.experience.length) {
          w.heading("Experience");
          for (const e of data.experience) {
            w.entryHeader(e.heading || "Role");
            for (const b of e.bullets) w.bullet(b);
            w.gap(6);
          }
        }
        break;

      case "projects":
        if (data.projects.length) {
          w.heading("Projects");
          for (const p of data.projects) {
            w.entryHeader(p.heading || "Project");
            for (const b of p.bullets) w.bullet(b);
            w.gap(6);
          }
        }
        break;

      case "education":
        if (data.education.length) {
          w.heading("Education");
          for (const e of data.education) w.paragraph(e.text || "", 9.5, 3);
          w.gap(2);
        }
        break;

      case "certifications":
        if (data.certifications.length) {
          w.heading("Certifications");
          for (const c of data.certifications) w.paragraph(c.text || "", 9.5, 3);
          w.gap(2);
        }
        break;

      case "achievements":
        if (data.achievements.length) {
          w.heading("Achievements");
          for (const a of data.achievements) w.bullet(a);
        }
        break;
    }
  };

  // Render in original order first...
  for (const key of order) renderSection(key);
  // ...then any remaining sections not in sectionOrder.
  for (const key of DEFAULT_ORDER) renderSection(key);

  const outName = fileName || `${safeName(data.personalInfo.name)}_Enhanced_Resume.pdf`;
  doc.save(outName);
}


export async function generateAnalysisReportPDF(analysis: ResumeAnalysis): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc: Doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = new PdfWriter(doc);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...C.name);
  doc.text("Resume ATS Analysis Report", MARGIN, w.y);
  w.y += 24;
  w.paragraph(`Candidate: ${analysis.original.personalInfo.name || "Candidate"}`, 10, 2);
  w.paragraph(`Target role: ${analysis.job.title || "Not specified"}`, 10, 2);
  w.paragraph(`Source file: ${analysis.fileName}`, 10, 6);

  // ATS Score
  w.heading("ATS Score Summary");
  w.paragraph(`Your ATS Score: ${analysis.beforeScore.total}/100 (${analysis.beforeScore.grade})`, 11, 2);
  w.paragraph(`With Suggestions Applied: ${analysis.afterScore.total}/100 (${analysis.afterScore.grade})`, 11, 6);

  // Screening
  w.heading("Estimated Screening Chance");
  w.paragraph(`${analysis.screening.percent}%`, 14, 4);
  w.paragraph(analysis.screening.disclaimer, 9, 6);
  if (analysis.screening.factorsIncreasing.length) {
    w.paragraph("Factors increasing the chance:", 9.5, 2);
    analysis.screening.factorsIncreasing.forEach((f) => w.bullet(f));
  }
  if (analysis.screening.factorsDecreasing.length) {
    w.paragraph("Factors decreasing the chance:", 9.5, 2);
    analysis.screening.factorsDecreasing.forEach((f) => w.bullet(f));
  }

  // Score Breakdown
  w.heading("Score Breakdown (Before → With Suggestions)");
  for (const c of analysis.beforeScore.categories) {
    const after = analysis.afterScore.categories.find((a) => a.key === c.key);
    w.paragraph(
      `${c.label}: ${c.score}/${c.max}  →  ${after ? after.score : c.score}/${c.max}`,
      9.5, 1
    );
  }
  w.gap(6);

  // Keywords
  w.heading("Missing Keywords (Recommendations)");
  if (analysis.keywords.missing.length) {
    w.paragraph(analysis.keywords.missing.map(titleCase).join(", "), 9.5, 6);
  } else {
    w.paragraph("None — all target keywords were found.", 9.5, 6);
  }

  // Issues
  w.heading("ATS Weaknesses & Issues");
  if (analysis.issues.length) {
    for (const issue of analysis.issues) {
      w.paragraph(`[${issue.severity}] ${issue.title}`, 10, 1);
      w.paragraph(`Why: ${issue.why}`, 9, 1);
      w.paragraph(`Fix: ${issue.recommendation}`, 9, 5);
    }
  } else {
    w.paragraph("No significant weaknesses detected.", 9.5, 6);
  }

  // Changes applied
  w.heading("Suggested Changes");
  analysis.enhanced.changes.slice(0, 30).forEach((ch) => {
    w.bullet(`[${ch.changeType.toUpperCase()}] ${ch.section}: ${ch.reason}`);
    w.paragraph(`ATS impact: ${ch.atsImpact}`, 8.5, 4);
  });

  const outName = `${safeName(analysis.original.personalInfo.name)}_Resume_Analysis.pdf`;
  doc.save(outName);
}

