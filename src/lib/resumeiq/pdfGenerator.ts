import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { EnhancedResume } from "./types";

interface DrawContext {
  doc: PDFDocument;
  fontRegular: any;
  fontBold: any;
  fontSize: number;
  lineHeight: number;
  width: number;
  height: number;
  margin: number;
  x: number;
  y: number;
  currentPage: any;
}

// Wrap text to fit page width
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word itself is wider than width, force break
        lines.push(word);
        currentLine = "";
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// Add a page and reset position
function addNewPage(ctx: DrawContext): void {
  ctx.currentPage = ctx.doc.addPage([595.28, 841.89]); // A4
  ctx.y = 841.89 - ctx.margin;
}

// Draw text and handle page wraps
function drawText(ctx: DrawContext, text: string, options: { bold?: boolean; size?: number; align?: "left" | "center" } = {}) {
  const font = options.bold ? ctx.fontBold : ctx.fontRegular;
  const size = options.size || ctx.fontSize;
  const align = options.align || "left";
  const textLineHeight = size * 1.25;

  const lines = wrapText(text, ctx.width - 2 * ctx.margin, font, size);

  lines.forEach(line => {
    if (ctx.y < ctx.margin + textLineHeight) {
      addNewPage(ctx);
    }

    let drawX = ctx.x;
    if (align === "center") {
      const textWidth = font.widthOfTextAtSize(line, size);
      drawX = (ctx.width - textWidth) / 2;
    }

    ctx.currentPage.drawText(line, {
      x: drawX,
      y: ctx.y,
      size,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    ctx.y -= textLineHeight;
  });
}

// Draw a bullet point
function drawBullet(ctx: DrawContext, text: string, options: { size?: number } = {}) {
  const size = options.size || ctx.fontSize;
  const textLineHeight = size * 1.25;
  const bulletSymbol = "\u2022";
  const bulletWidth = ctx.fontRegular.widthOfTextAtSize(bulletSymbol, size) + 8;
  const indentWidth = 15;

  const printableWidth = ctx.width - 2 * ctx.margin - indentWidth - bulletWidth;
  const lines = wrapText(text, printableWidth, ctx.fontRegular, size);

  lines.forEach((line, index) => {
    if (ctx.y < ctx.margin + textLineHeight) {
      addNewPage(ctx);
    }

    if (index === 0) {
      ctx.currentPage.drawText(bulletSymbol, {
        x: ctx.margin + indentWidth,
        y: ctx.y,
        size,
        font: ctx.fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    ctx.currentPage.drawText(line, {
      x: ctx.margin + indentWidth + bulletWidth,
      y: ctx.y,
      size,
      font: ctx.fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    ctx.y -= textLineHeight;
  });
}

// Draw a horizontal divider line
function drawDivider(ctx: DrawContext) {
  if (ctx.y < ctx.margin + 20) {
    addNewPage(ctx);
  }
  ctx.y -= 5;
  ctx.currentPage.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end: { x: ctx.width - ctx.margin, y: ctx.y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  ctx.y -= 12;
}

export async function generateResumePdf(resume: EnhancedResume): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: DrawContext = {
    doc,
    fontRegular,
    fontBold,
    fontSize: 10,
    lineHeight: 12.5,
    width: 595.28,
    height: 841.89,
    margin: 50,
    x: 50,
    y: 841.89 - 50,
    currentPage: null,
  };

  addNewPage(ctx);

  const name = resume.personal?.name || resume.name || "Candidate Name";
  const title = resume.personal?.title || resume.title || "";
  const email = resume.personal?.email || resume.email || "";
  const phone = resume.personal?.phone || resume.phone || "";
  const location = resume.personal?.location || resume.location || "";
  const linkedin = resume.personal?.linkedin || resume.linkedin || "";
  const github = resume.personal?.github || resume.github || "";
  const portfolio = resume.personal?.portfolio || resume.portfolio || "";

  // 1. Name & Subtitle
  drawText(ctx, name, { bold: true, size: 18, align: "center" });
  if (title) {
    ctx.y -= 2;
    drawText(ctx, title, { bold: true, size: 10, align: "center" });
  }
  ctx.y -= 3;

  // Contact info line
  const contactParts: string[] = [];
  if (email) contactParts.push(email);
  if (phone) contactParts.push(phone);
  if (location) contactParts.push(location);
  if (contactParts.length > 0) {
    drawText(ctx, contactParts.join("  |  "), { size: 9, align: "center" });
    ctx.y -= 2;
  }

  // Social links line
  const socialParts: string[] = [];
  if (linkedin) socialParts.push(linkedin.replace(/^https?:\/\/(?:www\.)?/, ""));
  if (github) socialParts.push(github.replace(/^https?:\/\/(?:www\.)?/, ""));
  if (portfolio) socialParts.push(portfolio.replace(/^https?:\/\/(?:www\.)?/, ""));
  
  if (socialParts.length > 0) {
    drawText(ctx, socialParts.join("  |  "), { size: 9, align: "center" });
  }
  ctx.y -= 10;

  // 2. Summary Section
  if (resume.summary) {
    drawText(ctx, "PROFESSIONAL SUMMARY", { bold: true, size: 11 });
    drawDivider(ctx);
    drawText(ctx, resume.summary);
    ctx.y -= 12;
  }

  // 3. Technical Skills Section
  if (resume.skills && resume.skills.length > 0) {
    drawText(ctx, "TECHNICAL SKILLS", { bold: true, size: 11 });
    drawDivider(ctx);
    drawText(ctx, resume.skills.join(", "));
    ctx.y -= 12;
  }

  // 4. Experience Section
  if (resume.experience && resume.experience.length > 0) {
    drawText(ctx, "WORK EXPERIENCE", { bold: true, size: 11 });
    drawDivider(ctx);

    resume.experience.forEach(exp => {
      // Company name and Dates on same line
      const companyWidth = ctx.fontBold.widthOfTextAtSize(exp.company || "Company", 10);
      const dateStr = `${exp.startDate || ""} - ${exp.endDate || ""}`;
      const dateWidth = ctx.fontRegular.widthOfTextAtSize(dateStr, 9);

      if (ctx.y < ctx.margin + 25) {
        addNewPage(ctx);
      }

      ctx.currentPage.drawText(exp.company || "Company", {
        x: ctx.margin,
        y: ctx.y,
        font: ctx.fontBold,
        size: 10,
        color: rgb(0.1, 0.1, 0.1),
      });

      if (exp.startDate || exp.endDate) {
        ctx.currentPage.drawText(dateStr, {
          x: ctx.width - ctx.margin - dateWidth,
          y: ctx.y,
          font: ctx.fontRegular,
          size: 9,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      ctx.y -= 12;

      // Position
      if (exp.position) {
        drawText(ctx, exp.position, { bold: true, size: 9 });
        ctx.y -= 2;
      }

      // Bullets
      (exp.bullets || []).forEach(b => {
        drawBullet(ctx, b, { size: 9.5 });
      });
      ctx.y -= 8;
    });
  }

  // 5. Projects Section
  if (resume.projects && resume.projects.length > 0) {
    drawText(ctx, "PROJECTS", { bold: true, size: 11 });
    drawDivider(ctx);

    resume.projects.forEach(proj => {
      drawText(ctx, proj.name, { bold: true, size: 10 });
      ctx.y -= 2;
      
      if (proj.description) {
        drawText(ctx, proj.description, { size: 9 });
        ctx.y -= 2;
      }

      (proj.bullets || []).forEach(b => {
        drawBullet(ctx, b, { size: 9.5 });
      });
      ctx.y -= 8;
    });
  }

  // 6. Education Section
  if (resume.education && resume.education.length > 0) {
    drawText(ctx, "EDUCATION", { bold: true, size: 11 });
    drawDivider(ctx);

    resume.education.forEach(edu => {
      const schoolWidth = ctx.fontBold.widthOfTextAtSize(edu.school || "Institution", 10);
      const dateStr = `${edu.startDate || ""} - ${edu.endDate || ""}`;
      const dateWidth = ctx.fontRegular.widthOfTextAtSize(dateStr, 9);

      if (ctx.y < ctx.margin + 25) {
        addNewPage(ctx);
      }

      ctx.currentPage.drawText(edu.school || "Institution", {
        x: ctx.margin,
        y: ctx.y,
        font: ctx.fontBold,
        size: 10,
        color: rgb(0.1, 0.1, 0.1),
      });

      if (edu.startDate || edu.endDate) {
        ctx.currentPage.drawText(dateStr, {
          x: ctx.width - ctx.margin - dateWidth,
          y: ctx.y,
          font: ctx.fontRegular,
          size: 9,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      ctx.y -= 12;

      const degreeStr = edu.fieldOfStudy ? `${edu.degree} in ${edu.fieldOfStudy}` : edu.degree;
      if (degreeStr) {
        drawText(ctx, degreeStr, { size: 9.5 });
        ctx.y -= 8;
      }
    });
  }

  // 7. Certifications
  if (resume.certifications && resume.certifications.length > 0) {
    drawText(ctx, "CERTIFICATIONS", { bold: true, size: 11 });
    drawDivider(ctx);
    resume.certifications.forEach(cert => {
      drawBullet(ctx, cert, { size: 9.5 });
    });
    ctx.y -= 8;
  }

  // 8. Achievements
  if (resume.achievements && resume.achievements.length > 0) {
    drawText(ctx, "ACHIEVEMENTS", { bold: true, size: 11 });
    drawDivider(ctx);
    resume.achievements.forEach(ach => {
      drawBullet(ctx, ach, { size: 9.5 });
    });
    ctx.y -= 8;
  }

  // 9. Extracurricular & Activities
  if (resume.extracurricular && resume.extracurricular.length > 0) {
    drawText(ctx, "EXTRACURRICULAR ACTIVITIES", { bold: true, size: 11 });
    drawDivider(ctx);
    resume.extracurricular.forEach(act => {
      drawBullet(ctx, act, { size: 9.5 });
    });
    ctx.y -= 8;
  }

  // 10. Areas of Interest
  if (resume.areasOfInterest && resume.areasOfInterest.length > 0) {
    drawText(ctx, "AREAS OF INTEREST", { bold: true, size: 11 });
    drawDivider(ctx);
    drawText(ctx, resume.areasOfInterest.join(", "));
  }

  return await doc.save();
}

export async function generateReportPdf(report: {
  name: string;
  jobTitle: string;
  originalScore: number;
  enhancedScore: number;
  screeningChance: number;
  breakdownOriginal: any;
  breakdownEnhanced: any;
  matchedKeywords: string[];
  missingKeywords: string[];
  weakKeywords: string[];
  positiveFactors: string[];
  negativeFactors: string[];
  issues: any[];
  changes: any[];
  recommendations: any[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: DrawContext = {
    doc,
    fontRegular,
    fontBold,
    fontSize: 10,
    lineHeight: 12.5,
    width: 595.28,
    height: 841.89,
    margin: 50,
    x: 50,
    y: 841.89 - 50,
    currentPage: null,
  };

  addNewPage(ctx);

  // Header Title
  drawText(ctx, "RESUMEIQ AI - ATS ANALYSIS & ENHANCEMENT REPORT", { bold: true, size: 14, align: "center" });
  ctx.y -= 4;
  drawText(ctx, `Candidate: ${report.name || "Candidate Name"}   |   Target Job: ${report.jobTitle}`, { size: 10, align: "center" });
  drawDivider(ctx);

  // Summary Metrics Table/Layout
  drawText(ctx, "SCORE SUMMARY", { bold: true, size: 11 });
  drawDivider(ctx);

  drawText(ctx, `Original ATS Score:  ${report.originalScore} / 100`, { bold: true, size: 10 });
  drawText(ctx, `Enhanced ATS Score:  ${report.enhancedScore} / 100`, { bold: true, size: 10 });
  drawText(ctx, `Score Improvement:   +${report.enhancedScore - report.originalScore} Points`, { bold: true, size: 10 });
  drawText(ctx, `Estimated Screening Chance:  ${report.screeningChance}%`, { bold: true, size: 10 });
  ctx.y -= 12;

  // Category Breakdown comparison
  drawText(ctx, "ATS CATEGORY SCORE COMPARISON (ORIGINAL vs ENHANCED)", { bold: true, size: 11 });
  drawDivider(ctx);

  const formatRow = (label: string, orig: number, enh: number, max: number) => {
    return `${label.padEnd(28)} |   Original: ${orig}/${max}   |   Enhanced: ${enh}/${max}`;
  };

  const bo = report.breakdownOriginal || {};
  const be = report.breakdownEnhanced || {};

  drawText(ctx, formatRow("Keyword Match", bo.keywordMatch || 0, be.keywordMatch || 0, 30), { size: 9 });
  drawText(ctx, formatRow("Technical Skills", bo.technicalSkills || 0, be.technicalSkills || 0, 20), { size: 9 });
  drawText(ctx, formatRow("Experience Relevance", bo.experienceRelevance || 0, be.experienceRelevance || 0, 15), { size: 9 });
  drawText(ctx, formatRow("Project Relevance", bo.projectRelevance || 0, be.projectRelevance || 0, 10), { size: 9 });
  drawText(ctx, formatRow("Structure & Formatting", bo.resumeStructure || 0, be.resumeStructure || 0, 10), { size: 9 });
  drawText(ctx, formatRow("Action Verbs & Impact", bo.actionVerbs || 0, be.actionVerbs || 0, 5), { size: 9 });
  drawText(ctx, formatRow("Quantified Achievements", bo.quantifiedAchievements || 0, be.quantifiedAchievements || 0, 5), { size: 9 });
  drawText(ctx, formatRow("ATS Formatting compatibility", bo.formattingCompatibility || 0, be.formattingCompatibility || 0, 5), { size: 9 });
  ctx.y -= 12;

  // Keywords Analysis
  drawText(ctx, "JOB KEYWORDS ANALYSIS", { bold: true, size: 11 });
  drawDivider(ctx);

  drawText(ctx, `Matched Keywords: ${report.matchedKeywords.join(", ") || "None"}`, { size: 9.5 });
  drawText(ctx, `Missing Keywords: ${report.missingKeywords.join(", ") || "None"}`, { size: 9.5 });
  if (report.weakKeywords && report.weakKeywords.length > 0) {
    drawText(ctx, `Weakly Represented Keywords: ${report.weakKeywords.join(", ")}`, { size: 9.5 });
  }
  ctx.y -= 12;

  // Positive & Negative Factors
  drawText(ctx, "KEY FACTOR ANALYSIS", { bold: true, size: 11 });
  drawDivider(ctx);

  drawText(ctx, "Positive Factors:", { bold: true, size: 9.5 });
  report.positiveFactors.forEach(f => drawBullet(ctx, f, { size: 9 }));
  ctx.y -= 4;

  drawText(ctx, "Negative Factors:", { bold: true, size: 9.5 });
  report.negativeFactors.forEach(f => drawBullet(ctx, f, { size: 9 }));
  ctx.y -= 12;

  // Detected Issues
  if (report.issues && report.issues.length > 0) {
    drawText(ctx, "DETECTED RESUME ISSUES", { bold: true, size: 11 });
    drawDivider(ctx);

    report.issues.forEach(issue => {
      drawText(ctx, `[${issue.severity}] ${issue.section}: ${issue.title}`, { bold: true, size: 9.5 });
      drawText(ctx, `Issue: ${issue.description}`, { size: 9 });
      drawText(ctx, `Recommendation: ${issue.recommendation}`, { size: 9 });
      ctx.y -= 6;
    });
    ctx.y -= 6;
  }

  // Major AI Improvements
  if (report.changes && report.changes.length > 0) {
    drawText(ctx, "MAJOR GEMINI AI IMPROVEMENTS", { bold: true, size: 11 });
    drawDivider(ctx);

    report.changes.slice(0, 10).forEach(change => {
      drawText(ctx, `[${change.changeType}] Section: ${change.section}`, { bold: true, size: 9.5 });
      drawText(ctx, `Original: ${change.original.slice(0, 150)}${change.original.length > 150 ? "..." : ""}`, { size: 9 });
      drawText(ctx, `Enhanced: ${change.enhanced.slice(0, 150)}${change.enhanced.length > 150 ? "..." : ""}`, { size: 9 });
      drawText(ctx, `Reason: ${change.reason}`, { size: 9 });
      ctx.y -= 6;
    });
    ctx.y -= 6;
  }

  // Recommendations
  if (report.recommendations && report.recommendations.length > 0) {
    drawText(ctx, "RECOMMENDED NEXT STEPS", { bold: true, size: 11 });
    drawDivider(ctx);

    report.recommendations.forEach(rec => {
      drawText(ctx, rec.title, { bold: true, size: 9.5 });
      drawText(ctx, rec.description, { size: 9 });
      ctx.y -= 6;
    });
    ctx.y -= 6;
  }

  // Disclaimer
  drawText(ctx, "DISCLAIMER", { bold: true, size: 9 });
  drawText(ctx, "This percentage is an estimate based on resume-to-job alignment and ATS compatibility. Actual hiring decisions depend on the employer, recruiter, applicant pool, and recruitment process.", { size: 8.5 });

  return await doc.save();
}
