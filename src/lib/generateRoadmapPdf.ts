import jsPDF from "jspdf";

interface RoadmapDay {
  day: number;
  task: string;
  resources?: { name: string; url: string }[];
}
interface RoadmapWeek {
  week: number;
  goal: string;
  deliverable: string;
  days: RoadmapDay[];
}
interface ProjectRoadmap {
  projectName: string;
  architecture?: { pattern: string; description: string };
  databaseDesign?: { provider: string };
  apiDesign?: { endpoints?: { method: string; path: string; description: string }[] };
  authStrategy?: { provider: string; flowDescription: string };
  weeklyRoadmap?: RoadmapWeek[];
  commonMistakes?: string[];
  expectedDeliverables?: string[];
  resumeBulletPoints?: string[];
  interviewPrep?: { behavioralQuestions?: string[]; technicalDeepDives?: string[] };
}

const PW = 210;
const PH = 297;
const ML = 15;
const MR = 195;
const CW = 180;

// ─── Build AI agent prompt string ─────────────────────────────────────────────
function buildAgentPrompt(roadmap: ProjectRoadmap): string {
  const allSteps = (roadmap.weeklyRoadmap ?? []).flatMap(w => w.days ?? []);
  const steps = allSteps.map((d, i) => `${i + 1}. ${d.task}`).join("\n");
  const deliverables = (roadmap.expectedDeliverables ?? []).map(d => `- ${d}`).join("\n");
  const mistakes = (roadmap.commonMistakes ?? []).map(m => `- ${m}`).join("\n");
  const endpoints = (roadmap.apiDesign?.endpoints ?? [])
    .map(e => `  ${e.method} ${e.path} — ${e.description}`)
    .join("\n");

  return `You are a senior software engineer and technical lead.

Build the following project from scratch, end to end, with production-quality code.

==============================================
PROJECT: ${roadmap.projectName}
==============================================

ARCHITECTURE
Pattern: ${roadmap.architecture?.pattern ?? "N/A"}
Description: ${roadmap.architecture?.description ?? "N/A"}

TECH STACK
Database: ${roadmap.databaseDesign?.provider ?? "N/A"}
Auth: ${roadmap.authStrategy?.provider ?? "N/A"}
Auth Flow: ${roadmap.authStrategy?.flowDescription ?? "N/A"}
${endpoints ? `\nAPI ENDPOINTS\n${endpoints}` : ""}

IMPLEMENTATION STEPS
Complete these steps in order. Do not skip any step.

${steps}

EXPECTED DELIVERABLES
${deliverables}

IMPORTANT — AVOID THESE MISTAKES
${mistakes}

INSTRUCTIONS FOR THE AI AGENT
- Write complete, working code for every step.
- Do not use placeholders or TODO comments.
- Follow best practices for the chosen tech stack.
- Add error handling and input validation throughout.
- Include a README.md with setup instructions.
- Make the project production-ready.

Start immediately with Step 1 and continue through all steps without stopping.`;
}

export function generateRoadmapPdf(roadmap: ProjectRoadmap): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 0;

  // ─── Page management ──────────────────────────────────────────────────────
  const newPage = () => {
    doc.addPage();
    y = 18;
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.4);
    doc.line(ML, 10, MR, 10);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 190);
    doc.text("SkillSprint AI  -  Project Roadmap", ML, 8);
    doc.text(roadmap.projectName, MR, 8, { align: "right" });
  };

  const guard = (need = 12) => {
    if (y + need > PH - 16) newPage();
  };

  const gap = (n = 5) => { y += n; };

  // ─── Section header ────────────────────────────────────────────────────────
  const section = (title: string) => {
    guard(18);
    gap(8);
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(ML - 2, y - 1, CW + 4, 9, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), ML + 3, y + 5.5);
    y += 13;
  };

  // ─── Key-value row ─────────────────────────────────────────────────────────
  const kv = (key: string, value: string) => {
    guard(8);
    const label = `${key}: `;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(99, 102, 241);
    doc.text(label, ML, y);
    const kw = doc.getStringUnitWidth(label) * 9 / doc.internal.scaleFactor;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 80);
    const lines = doc.splitTextToSize(value, CW - kw);
    doc.text(lines[0], ML + kw, y);
    gap(6);
    lines.slice(1).forEach((l: string) => { guard(6); doc.text(l, ML + kw, y); gap(5.5); });
  };

  // ─── Bullet ────────────────────────────────────────────────────────────────
  const bullet = (text: string, dotColor: [number, number, number] = [99, 102, 241]) => {
    guard(7);
    doc.setFillColor(...dotColor);
    doc.circle(ML + 2.5, y - 1.2, 1.1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 80);
    const lines = doc.splitTextToSize(text, CW - 8);
    lines.forEach((line: string, i: number) => {
      if (i > 0) guard(6);
      doc.text(line, ML + 6, y);
      gap(5.5);
    });
  };

  // ─── Numbered step ─────────────────────────────────────────────────────────
  const step = (num: number, task: string, resources?: { name: string; url: string }[]) => {
    guard(22);

    // Number circle
    doc.setFillColor(99, 102, 241);
    doc.circle(ML + 4, y + 1, 4.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(String(num), ML + 4, y + 3, { align: "center" });

    // Task text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 60);
    const lines = doc.splitTextToSize(task, CW - 12);
    lines.forEach((line: string, i: number) => {
      guard(6);
      doc.text(line, ML + 11, y + (i === 0 ? 1.5 : 0));
      gap(i === 0 ? 6 : 5.5);
    });

    // Resources
    if (resources?.length) {
      resources.forEach(r => {
        guard(5);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(140, 140, 190);
        doc.text(`Resource: ${r.name}`, ML + 12, y);
        gap(4.5);
      });
    }

    // Divider line
    guard(4);
    doc.setDrawColor(225, 225, 240);
    doc.setLineWidth(0.25);
    doc.line(ML + 9, y + 1, MR, y + 1);
    gap(6);
  };

  // ─── Info box ──────────────────────────────────────────────────────────────
  const infoBox = (text: string, bg: [number, number, number] = [240, 242, 255]) => {
    guard(20);
    const lines = doc.splitTextToSize(text, CW - 8);
    const bh = lines.length * 5.5 + 8;
    doc.setFillColor(...bg);
    doc.roundedRect(ML - 2, y - 2, CW + 4, bh, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 80);
    lines.forEach((line: string) => { doc.text(line, ML + 2, y + 4); gap(5.5); });
    gap(6);
  };

  // ─── Prompt box (monospaced style, dark bg) ────────────────────────────────
  const promptBox = (text: string) => {
    const lines = doc.splitTextToSize(text, CW - 10);
    const bh = lines.length * 5 + 12;

    // check if it fits; if not, add pages naturally
    let startY = y;
    if (startY + bh > PH - 16) {
      newPage();
      startY = y;
    }

    doc.setFillColor(22, 20, 60);
    doc.roundedRect(ML - 2, startY - 2, CW + 4, bh, 3, 3, "F");

    // "COPY THIS PROMPT" label
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(ML + 2, startY + 2, 38, 5.5, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("COPY THIS PROMPT", ML + 4, startY + 6);

    y = startY + 12;
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(200, 210, 240);

    lines.forEach((line: string) => {
      if (y + 5 > PH - 16) {
        // finish current box visually — start a new page for the rest
        newPage();
        doc.setFillColor(22, 20, 60);
        doc.roundedRect(ML - 2, y - 4, CW + 4, PH - y - 14, 0, 0, "F");
      }
      doc.text(line, ML + 2, y);
      gap(5);
    });
    gap(8);
  };

  // ==========================================================================
  // COVER PAGE
  // ==========================================================================
  doc.setFillColor(22, 20, 60);
  doc.rect(0, 0, PW, 60, "F");
  doc.setFillColor(99, 102, 241);
  doc.circle(PW - 18, 12, 24, "F");
  doc.setFillColor(168, 85, 247);
  doc.circle(8, 55, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(roadmap.projectName, 145);
  titleLines.forEach((l: string, i: number) => doc.text(l, ML, 22 + i * 10));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 185, 225);
  doc.text("SkillSprint AI  -  Step-by-Step Project Roadmap", ML, 48);
  doc.setFontSize(8);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Generated: ${today}`, ML, 55);

  y = 70;

  // Stat boxes
  const allSteps = (roadmap.weeklyRoadmap ?? []).flatMap(w => w.days ?? []);
  const stats = [
    { label: "Total Steps", val: String(allSteps.length) },
    { label: "Deliverables", val: String(roadmap.expectedDeliverables?.length ?? 0) },
    { label: "Resume Bullets", val: String(roadmap.resumeBulletPoints?.length ?? 0) },
    { label: "Interview Qs", val: String((roadmap.interviewPrep?.behavioralQuestions?.length ?? 0) + (roadmap.interviewPrep?.technicalDeepDives?.length ?? 0)) },
  ];
  const bw = 41;
  stats.forEach((s, i) => {
    const bx = ML - 2 + i * (bw + 4);
    doc.setFillColor(245, 246, 255);
    doc.roundedRect(bx, y, bw, 20, 3, 3, "F");
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(bx, y, bw, 3, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(22, 20, 60);
    doc.text(s.val, bx + bw / 2, y + 13.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 160);
    doc.text(s.label, bx + bw / 2, y + 18.5, { align: "center" });
  });
  y += 30;

  // ==========================================================================
  // PROJECT OVERVIEW
  // ==========================================================================
  section("PROJECT OVERVIEW");
  if (roadmap.architecture) {
    kv("What you're building", roadmap.architecture.description);
    kv("Pattern", roadmap.architecture.pattern);
  }
  if (roadmap.databaseDesign) kv("Database", roadmap.databaseDesign.provider);
  if (roadmap.authStrategy) kv("Auth", roadmap.authStrategy.provider);

  // ==========================================================================
  // STEP-BY-STEP ROADMAP
  // ==========================================================================
  if (allSteps.length > 0) {
    section("COMPLETE STEP-BY-STEP ROADMAP");
    infoBox(
      "Follow these steps in order. Complete each step fully before moving to the next. Tick each one off as you go.",
      [240, 248, 255]
    );
    allSteps.forEach((day, idx) => {
      step(idx + 1, day.task, day.resources);
    });
  }

  // ==========================================================================
  // DELIVERABLES
  // ==========================================================================
  if (roadmap.expectedDeliverables?.length) {
    section("WHAT YOU WILL DELIVER");
    roadmap.expectedDeliverables.forEach(d => bullet(d, [34, 197, 94]));
  }

  // ==========================================================================
  // MISTAKES TO AVOID
  // ==========================================================================
  if (roadmap.commonMistakes?.length) {
    section("MISTAKES TO AVOID");
    roadmap.commonMistakes.forEach(m => bullet(m, [239, 68, 68]));
  }

  // ==========================================================================
  // RESUME BULLETS
  // ==========================================================================
  if (roadmap.resumeBulletPoints?.length) {
    section("ADD TO YOUR RESUME");
    infoBox("Copy these bullet points directly into your resume when the project is done.", [245, 255, 245]);
    roadmap.resumeBulletPoints.forEach(b => bullet(b, [99, 102, 241]));
  }

  // ==========================================================================
  // INTERVIEW PREP
  // ==========================================================================
  if (roadmap.interviewPrep?.behavioralQuestions?.length || roadmap.interviewPrep?.technicalDeepDives?.length) {
    section("INTERVIEW PREP");
    if (roadmap.interviewPrep.behavioralQuestions?.length) {
      guard(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 80);
      doc.text("Questions to prepare for:", ML, y);
      gap(7);
      roadmap.interviewPrep.behavioralQuestions.forEach(q => bullet(q, [168, 85, 247]));
    }
    if (roadmap.interviewPrep.technicalDeepDives?.length) {
      guard(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 80);
      doc.text("Technical concepts to study:", ML, y);
      gap(7);
      roadmap.interviewPrep.technicalDeepDives.forEach(q => bullet(q, [99, 102, 241]));
    }
  }

  // ==========================================================================
  // AI AGENT PROMPT (last page)
  // ==========================================================================
  section("AI AGENT PROMPT — PASTE INTO ANY AI OR IDE");
  infoBox(
    "Copy the prompt below and paste it into Claude, ChatGPT, Cursor, Windsurf, GitHub Copilot, or any AI coding assistant. The agent will build the full project for you step by step.",
    [255, 248, 235]
  );

  const agentPrompt = buildAgentPrompt(roadmap);
  promptBox(agentPrompt);

  // ==========================================================================
  // PAGE NUMBERS
  // ==========================================================================
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(210, 210, 230);
    doc.setLineWidth(0.3);
    doc.line(ML, PH - 10, MR, PH - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 190);
    doc.text("SkillSprint AI  -  AI-Powered Career Intelligence", ML, PH - 5.5);
    doc.text(`Page ${i} of ${pageCount}`, MR, PH - 5.5, { align: "right" });
  }

  const safeName = roadmap.projectName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `skillsprint_roadmap_${safeName}.pdf`;

  // Use explicit Blob download — doc.save() omits the extension in some browsers/prod envs
  const pdfBlob = doc.output("blob");
  const blobWithType = new Blob([pdfBlob], { type: "application/pdf" });
  const url = URL.createObjectURL(blobWithType);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 500);

}
