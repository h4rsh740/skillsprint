"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  Upload, Download, FileSpreadsheet, X, ChevronDown, ChevronUp,
  Users, Trophy, TrendingUp, Clock, Star, CheckCircle, AlertTriangle,
  XCircle, GitBranch, Link2, Globe, Eye, FileText, BarChart2,
  Brain, Zap, Target, Filter, Search, SortAsc, SortDesc,
  Building2, MapPin, Briefcase, GraduationCap, Award, Code2,
  Sparkles, ArrowRight, RefreshCw, ExternalLink, BookOpen,
  LayoutGrid, List, ChevronRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import { generateCandidates, type Candidate } from "@/lib/candidateData";
import { rankCandidates, getShortlisted, getInsights, type ScoredCandidate, type JobRequirements } from "@/lib/aiShortlist";

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = "upload" | "requirements" | "processing" | "results";

const PROCESSING_STEPS = [
  "Reading Candidate Dataset...",
  "Parsing Excel File...",
  "Extracting Candidate Skills...",
  "Matching Job Requirements...",
  "Evaluating Experience Levels...",
  "Checking Education Qualifications...",
  "Analyzing Resume Scores...",
  "Calculating ATS Scores...",
  "Evaluating GitHub Profiles...",
  "Generating AI Match Scores...",
  "Ranking Candidates by Score...",
  "Shortlisting Best Candidates...",
  "Generating AI Insights & Reports...",
  "✓ Analysis Complete!",
];

const CHART_COLORS = ["#4f46e5", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#14b8a6"];

const RECOMMENDATION_CONFIG = {
  "Highly Recommended": { color: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500", emoji: "⭐" },
  "Recommended": { color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", emoji: "✅" },
  "Consider": { color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", emoji: "⚠" },
  "Not Suitable": { color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-400", emoji: "❌" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMatchColor(score: number) {
  if (score >= 78) return "text-violet-600 bg-violet-50 border-violet-200";
  if (score >= 60) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 42) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-500 bg-red-50 border-red-200";
}

function getMatchBarColor(score: number) {
  if (score >= 78) return "from-violet-500 to-purple-600";
  if (score >= 60) return "from-emerald-500 to-teal-500";
  if (score >= 42) return "from-amber-400 to-orange-500";
  return "from-red-400 to-rose-500";
}

// ─── Score Ring Component ─────────────────────────────────────────────────────
function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label: string }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 78 ? "#7c3aed" : score >= 60 ? "#10b981" : score >= 42 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="text-center -mt-14">
        <div className="text-2xl font-black text-gray-900">{score}</div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
      </div>
      <div className="mt-6" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ShortlistingPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [uploadedCandidates, setUploadedCandidates] = useState<Candidate[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Job Requirements
  const [jdMode, setJdMode] = useState<"jd" | "form">("form");
  const [jobDescription, setJobDescription] = useState("");
  const [jobRole, setJobRole] = useState("Full Stack Developer");
  const [requiredSkillsInput, setRequiredSkillsInput] = useState("React, Node.js, TypeScript, PostgreSQL");
  const [preferredSkillsInput, setPreferredSkillsInput] = useState("Docker, AWS, GraphQL");
  const [minExperience, setMinExperience] = useState(3);
  const [education, setEducation] = useState("Bachelor's");
  const [location, setLocation] = useState("Bangalore, India");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [salaryRange, setSalaryRange] = useState("Rs 15-25 LPA");
  const [workMode, setWorkMode] = useState("Hybrid");

  // Processing
  const [processingStep, setProcessingStep] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Results
  const [rankedCandidates, setRankedCandidates] = useState<ScoredCandidate[]>([]);
  const [shortlisted, setShortlisted] = useState<ScoredCandidate[]>([]);
  const [insights, setInsights] = useState<ReturnType<typeof getInsights> | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

  // Table state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRec, setFilterRec] = useState("All");
  const [sortField, setSortField] = useState<"matchScore" | "experience" | "resumeScore" | "atsScore">("matchScore");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [selectedCandidate, setSelectedCandidate] = useState<ScoredCandidate | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState("shortlisted");

  // ── Download Sample Dataset ──────────────────────────────────────────────
  const downloadSample = useCallback(() => {
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
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_candidates.xlsx";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    
    // Defer clean-up to ensure browser starts download successfully before revoking
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  // ── File Upload / Parse ───────────────────────────────────────────────────
  const parseExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        setPreviewRows(rows.slice(0, 10));

        // Map Excel rows to Candidate type
        const candidates: Candidate[] = rows.map((row, idx) => {
          const rawSkills = String(row["Skills"] || row["skills"] || "");
          const skillsList = rawSkills.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
          const rawCerts = String(row["Certifications"] || row["certifications"] || "");
          const certsList = rawCerts.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
          const rawProjects = String(row["Projects"] || row["projects"] || "");
          const projectsList = rawProjects.split("|").map(pName => ({
            name: pName.trim(),
            tech: "",
            description: "Imported project"
          })).filter(p => p.name);

          return {
            id: Number(row["Candidate ID"] || row["ID"] || row["id"] || idx + 1),
            name: String(row["Full Name"] || row["Name"] || row["name"] || `Candidate ${idx + 1}`),
            email: String(row["Email"] || row["email"] || ""),
            phone: String(row["Phone"] || row["phone"] || ""),
            location: String(row["Location"] || row["location"] || ""),
            role: String(row["Preferred Role"] || row["Current Role"] || row["Role"] || row["role"] || ""),
            skills: skillsList,
            experience: Number(row["Experience"] || row["Experience (Years)"] || row["experience"] || 0),
            education: {
              degree: String(row["Degree"] || row["degree"] || "B.Tech"),
              college: String(row["College"] || row["College/University"] || row["college"] || ""),
              year: Number(row["Graduation Year"] || row["grad_year"] || 2020),
            },
            cgpa: Number(row["CGPA"] || row["cgpa"] || 8.0),
            company: String(row["Current Company"] || row["company"] || "None"),
            resumeScore: Number(row["Resume Score"] || row["resume_score"] || 60),
            atsScore: Number(row["ATS Score"] || row["ats_score"] || 60),
            certifications: certsList,
            github: String(row["GitHub URL"] || row["GitHub"] || row["github"] || ""),
            linkedin: String(row["LinkedIn URL"] || row["LinkedIn"] || row["linkedin"] || ""),
            portfolio: String(row["Portfolio"] || row["portfolio"] || ""),
            projects: projectsList,
            summary: String(row["Summary"] || row["summary"] || ""),
            expectedSalary: String(row["Expected Salary"] || row["salary"] || ""),
            employmentType: String(row["Employment Type"] || row["employment_type"] || "Full-time"),
            workMode: String(row["Work Mode"] || row["work_mode"] || "Hybrid"),
            noticePeriod: String(row["Availability"] || row["Notice Period"] || row["notice_period"] || "30 days"),
          };
        });

        setUploadedCandidates(candidates);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } catch {
        alert("Error parsing Excel file. Please use the sample template.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseExcel(file);
  }, [parseExcel]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcel(file);
  }, [parseExcel]);

  // ── Run AI Analysis ───────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    const candidates = uploadedCandidates.length > 0 ? uploadedCandidates : generateCandidates();
    setStage("processing");
    setProcessingStep(0);
    setProcessingProgress(0);
    const start = Date.now();

    // Animate through processing steps
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 380 + Math.random() * 200));
      setProcessingStep(i + 1);
      setProcessingProgress(Math.round(((i + 1) / PROCESSING_STEPS.length) * 100));
    }

    // Build job requirements
    const job: JobRequirements = {
      jobRole,
      requiredSkills: requiredSkillsInput.split(",").map(s => s.trim()).filter(Boolean),
      preferredSkills: preferredSkillsInput.split(",").map(s => s.trim()).filter(Boolean),
      minExperience,
      education,
      location,
      employmentType,
      salaryRange,
      workMode,
      jobDescription,
    };

    const ranked = rankCandidates(candidates, job);
    const top = getShortlisted(ranked, 50);
    const ins = getInsights(ranked);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    await new Promise(r => setTimeout(r, 600));
    setRankedCandidates(ranked);
    setShortlisted(top);
    setInsights(ins);
    setProcessingTime(parseFloat(elapsed));
    setStage("results");
  }, [uploadedCandidates, jobRole, requiredSkillsInput, preferredSkillsInput, minExperience, education, location, employmentType, salaryRange, workMode, jobDescription]);

  // ── Export Functions ──────────────────────────────────────────────────────
  const exportExcel = useCallback(() => {
    const rows = shortlisted.map(c => ({
      "Rank": c.rank,
      "Candidate Name": c.name,
      "Email": c.email,
      "AI Match Score": `${c.matchScore}%`,
      "Recommendation": `${c.recommendationEmoji} ${c.recommendation}`,
      "Matched Skills": c.matchedSkills.join(", "),
      "Missing Skills": c.missingSkills.join(", "),
      "Experience (Years)": c.experience,
      "Education": `${c.education.degree} — ${c.education.college}`,
      "Resume Score": c.resumeScore,
      "ATS Score": c.atsScore,
      "Certifications": c.certifications.join(", "),
      "Interview Probability": `${c.interviewProbability}%`,
      "Hiring Confidence": c.hiringConfidence,
      "GitHub": c.github,
      "LinkedIn": c.linkedin,
      "Location": c.location,
      "AI Notes": c.aiNotes,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ranked Candidates");
    // Use Blob download — reliable in all browser environments
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SkillSprint_Ranked_Candidates.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [shortlisted]);

  const exportCSV = useCallback(() => {
    const headers = ["Rank","Name","Email","Match Score","Recommendation","Experience","Resume Score","ATS Score","Matched Skills","Missing Skills","AI Notes"];
    const rows = shortlisted.map(c => [
      c.rank, c.name, c.email, `${c.matchScore}%`, c.recommendation,
      `${c.experience}y`, c.resumeScore, c.atsScore,
      c.matchedSkills.join(";"), c.missingSkills.join(";"), c.aiNotes
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "SkillSprint_Candidates.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [shortlisted]);

  const exportJSON = useCallback(() => {
    const data = shortlisted.map(c => ({
      rank: c.rank, name: c.name, email: c.email, matchScore: c.matchScore,
      recommendation: c.recommendation, matchedSkills: c.matchedSkills,
      missingSkills: c.missingSkills, experience: c.experience,
      education: c.education, resumeScore: c.resumeScore, atsScore: c.atsScore,
      certifications: c.certifications, interviewProbability: c.interviewProbability,
      hiringConfidence: c.hiringConfidence, github: c.github, linkedin: c.linkedin,
      aiNotes: c.aiNotes,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "SkillSprint_Candidates.json"; a.click();
    URL.revokeObjectURL(url);
  }, [shortlisted]);

  const exportPDF = useCallback(() => {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 297, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("SkillSprint AI — Shortlisted Candidates Report", 14, 14);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()} | Total Shortlisted: ${shortlisted.length}`, 14, 24);

      doc.setTextColor(30, 30, 30);
      const headers = ["Rank", "Name", "Email", "Score", "Recommendation", "Exp", "Skills Matched"];
      const colW = [15, 40, 55, 18, 40, 12, 80];
      let y = 40;
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 5, 277, 9, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      let x = 14;
      headers.forEach((h, i) => { doc.text(h, x, y); x += colW[i]; });
      y += 8;
      doc.setFont("helvetica", "normal");
      shortlisted.slice(0, 35).forEach((c, i) => {
        if (y > 185) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(10, y - 4, 277, 7, "F"); }
        x = 14;
        const row = [
          String(c.rank), c.name.slice(0, 22), c.email.slice(0, 28),
          `${c.matchScore}%`, c.recommendation.slice(0, 20),
          `${c.experience}y`, c.matchedSkills.slice(0, 4).join(", ")
        ];
        row.forEach((val, j) => { doc.text(String(val), x, y); x += colW[j]; });
        y += 7;
      });
      doc.save("SkillSprint_Candidate_Report.pdf");
    });
  }, [shortlisted]);

  // ── Filtered/Sorted Candidates ────────────────────────────────────────────
  const filteredCandidates = shortlisted
    .filter(c => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.skills.some(s => s.toLowerCase().includes(q)) || c.role.toLowerCase().includes(q);
      const matchRec = filterRec === "All" || c.recommendation === filterRec;
      return matchSearch && matchRec;
    })
    .sort((a, b) => {
      const mult = sortDir === "desc" ? -1 : 1;
      return (a[sortField] - b[sortField]) * mult;
    });

  const displayedCandidates = showAll ? filteredCandidates : filteredCandidates.slice(0, 15);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] p-8 text-white border border-white/10 shadow-2xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #7c3aed 0%, transparent 60%), radial-gradient(circle at 80% 20%, #06b6d4 0%, transparent 50%)" }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-10 animate-pulse"
              style={{ width: 40 + i * 30, height: 40 + i * 30, background: "radial-gradient(circle, #7c3aed, transparent)", top: `${10 + i * 15}%`, left: `${5 + i * 16}%`, animationDelay: `${i * 0.5}s` }} />
          ))}
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Brain className="w-8 h-8 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">AI Candidate Shortlisting</h1>
                <span className="px-2 py-0.5 text-[10px] font-black bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 rounded-full tracking-widest">BETA</span>
              </div>
              <p className="text-slate-300 text-sm font-medium max-w-xl leading-relaxed">
                Upload your candidate dataset and let SkillSprint AI automatically analyze, score, rank, and shortlist the best candidates for your job opening.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {["Upload","Configure","Analyze","Results"].map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  (stage === "upload" && i === 0) || (stage === "requirements" && i === 1) || (stage === "processing" && i === 2) || (stage === "results" && i === 3)
                  ? "bg-white/20 text-white border border-white/30" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                    (stage === "results" && i < 3) || (stage === "processing" && i < 2) || (stage === "requirements" && i < 1)
                    ? "bg-emerald-400 text-white" : "bg-white/10 text-slate-300"}`}>
                    {((stage === "results" && i < 3) || (stage === "processing" && i < 2) || (stage === "requirements" && i < 1)) ? "✓" : i + 1}
                  </span>
                  {s}
                </div>
                {i < 3 && <ChevronRight className="w-3 h-3 text-slate-500" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 1 — UPLOAD
      ══════════════════════════════════════════════════════════════════════ */}
      {(stage === "upload" || stage === "requirements") && (
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Upload Panel */}
          <div className="lg:col-span-3 space-y-5">
            <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-violet-600" /> Dataset Upload
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Upload an Excel file with candidate data</p>
                </div>
                <a href="/api/download-sample" download="sample_candidates.xlsx"
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl px-4 py-2.5 transition-all shadow-lg shadow-violet-500/30 cursor-pointer">
                  <Download className="w-3.5 h-3.5" /> Sample Dataset
                </a>
              </div>

              {/* Drag-and-drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  isDragging ? "border-violet-500 bg-violet-50 scale-[1.01]" : "border-gray-200 hover:border-violet-400 hover:bg-violet-50/50"
                }`}>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
                <AnimatePresence mode="wait">
                  {uploadSuccess ? (
                    <motion.div key="success" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-emerald-700 font-bold text-lg">Dataset Uploaded!</p>
                      <p className="text-gray-500 text-sm">{uploadedCandidates.length} candidates ready for analysis</p>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" className="flex flex-col items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragging ? "bg-violet-200" : "bg-gray-100"}`}>
                        <Upload className={`w-8 h-8 transition-all ${isDragging ? "text-violet-600 scale-110" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-base">{isDragging ? "Drop it here!" : "Drag & Drop your Excel file"}</p>
                        <p className="text-gray-400 text-sm mt-1">or click to browse • .xlsx, .xls, .csv</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-violet-400/30">
                        <FileSpreadsheet className="w-4 h-4" /> Browse Files
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {uploadedCandidates.length > 0 && !uploadSuccess && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700 font-semibold">
                  <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  {uploadedCandidates.length} candidates loaded • Ready to analyze
                </div>
              )}

              {uploadedCandidates.length === 0 && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-medium">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  No upload? We'll use our built-in dataset of 250 demo candidates.
                </div>
              )}
            </div>

            {/* Excel Preview */}
            {previewRows.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="liquid-glass rounded-3xl p-6 border border-white/50 shadow-sm overflow-hidden">
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-violet-600" /> Dataset Preview <span className="text-gray-400 font-normal">(first 10 rows)</span>
                </h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="text-[11px] w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {Object.keys(previewRows[0]).slice(0, 8).map(k => (
                          <th key={k} className="px-3 py-2.5 text-left text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          {Object.values(row).slice(0, 8).map((v, j) => (
                            <td key={j} className="px-3 py-2 text-gray-700 font-medium truncate max-w-[120px]">{String(v ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>

          {/* ── STAGE 2 — JOB REQUIREMENTS ── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm">
              <h2 className="text-lg font-black text-gray-900 mb-1 flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-600" /> Job Requirements
              </h2>
              <p className="text-sm text-gray-500 mb-5">Define what you're hiring for</p>

              {/* Mode toggle */}
              <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                {(["form", "jd"] as const).map(mode => (
                  <button key={mode} onClick={() => setJdMode(mode)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${jdMode === mode ? "bg-white text-violet-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {mode === "form" ? "📋 Fill Form" : "📄 Paste JD"}
                  </button>
                ))}
              </div>

              {jdMode === "jd" ? (
                <div className="space-y-4">
                  <textarea
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    placeholder={`Paste your full job description here...\n\nExample:\nWe are looking for a Senior Full Stack Developer with 3+ years of experience in React, Node.js, TypeScript, and PostgreSQL. The ideal candidate should have experience with cloud platforms (AWS/GCP), Docker, and CI/CD pipelines...`}
                    className="w-full h-52 p-4 text-sm border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 font-medium text-gray-700 bg-white placeholder:text-gray-300"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Job Role</label>
                      <input value={jobRole} onChange={e => setJobRole(e.target.value)} placeholder="Full Stack Developer"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Min Experience</label>
                      <select value={minExperience} onChange={e => setMinExperience(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white cursor-pointer">
                        {[0,1,2,3,4,5,6,7,8,10].map(y => <option key={y} value={y}>{y === 0 ? "Fresher" : `${y}+ years`}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Job Role</label>
                    <input value={jobRole} onChange={e => setJobRole(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Required Skills <span className="text-gray-300 normal-case font-normal">(comma separated)</span></label>
                    <input value={requiredSkillsInput} onChange={e => setRequiredSkillsInput(e.target.value)}
                      placeholder="React, Node.js, TypeScript..."
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Preferred Skills</label>
                    <input value={preferredSkillsInput} onChange={e => setPreferredSkillsInput(e.target.value)}
                      placeholder="Docker, AWS, GraphQL..."
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Min Experience</label>
                      <select value={minExperience} onChange={e => setMinExperience(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white cursor-pointer">
                        {[0,1,2,3,4,5,6,7,8,10].map(y => <option key={y} value={y}>{y === 0 ? "Fresher" : `${y}+ years`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Education</label>
                      <select value={education} onChange={e => setEducation(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white cursor-pointer">
                        {["Any","Bachelor's","Master's","PhD"].map(e => <option key={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Work Mode</label>
                      <select value={workMode} onChange={e => setWorkMode(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white cursor-pointer">
                        {["Remote","Hybrid","Onsite","Any"].map(w => <option key={w}>{w}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Employment</label>
                      <select value={employmentType} onChange={e => setEmploymentType(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white cursor-pointer">
                        {["Full-time","Contract","Part-time"].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Location</label>
                    <input value={location} onChange={e => setLocation(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Salary Range</label>
                    <input value={salaryRange} onChange={e => setSalaryRange(e.target.value)}
                      placeholder="Rs 15-25 LPA"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                </div>
              )}

              <button onClick={runAnalysis}
                className="mt-6 w-full flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl text-base transition-all shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] cursor-pointer">
                <Zap className="w-5 h-5" />
                Analyze Candidates with AI
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-[11px] text-gray-400 mt-2">
                {uploadedCandidates.length > 0 ? `Analyzing ${uploadedCandidates.length} uploaded candidates` : "Will analyze 250 demo candidates"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 3 — AI PROCESSING ANIMATION
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {stage === "processing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-lg bg-[#0f172a] rounded-3xl p-8 border border-white/10 shadow-2xl">

              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                  <Brain className="w-7 h-7 text-violet-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">SkillSprint AI</h3>
                  <p className="text-slate-400 text-sm">Analyzing your candidate pool...</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                  <span>Analysis Progress</span>
                  <span className="text-violet-400 font-bold">{processingProgress}%</span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full"
                    animate={{ width: `${processingProgress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
                </div>
              </div>

              {/* Steps log */}
              <div className="space-y-2 font-mono text-sm max-h-72 overflow-hidden">
                {PROCESSING_STEPS.map((step, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: idx < processingStep ? 1 : 0.2, x: 0 }}
                    transition={{ delay: 0.05 }}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${idx === processingStep - 1 ? "bg-violet-500/10 border border-violet-500/20" : ""}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
                      idx < processingStep - 1 ? "bg-emerald-500 text-white" :
                      idx === processingStep - 1 ? "bg-violet-500 text-white animate-pulse" :
                      "bg-slate-700 text-slate-500"}`}>
                      {idx < processingStep - 1 ? "✓" : idx === processingStep - 1 ? "▶" : "○"}
                    </span>
                    <span className={`${
                      idx < processingStep - 1 ? "text-emerald-400" :
                      idx === processingStep - 1 ? "text-violet-300" :
                      "text-slate-600"}`}>
                      {step}
                    </span>
                    {idx === processingStep - 1 && idx < PROCESSING_STEPS.length - 1 && (
                      <span className="ml-auto flex gap-0.5">
                        {[0,1,2].map(d => (
                          <span key={d} className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                        ))}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>

              <p className="text-center text-slate-500 text-xs mt-6 font-medium">
                Processing {uploadedCandidates.length || 250} candidates against your requirements...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 4 — RESULTS
      ══════════════════════════════════════════════════════════════════════ */}
      {stage === "results" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Candidates", value: rankedCandidates.length, icon: <Users className="w-5 h-5 text-violet-500" />, bg: "from-violet-50 to-indigo-50", border: "border-violet-200" },
              { label: "Shortlisted", value: shortlisted.length, icon: <Trophy className="w-5 h-5 text-amber-500" />, bg: "from-amber-50 to-yellow-50", border: "border-amber-200" },
              { label: "Highest Score", value: `${rankedCandidates[0]?.matchScore ?? 0}%`, icon: <Star className="w-5 h-5 text-emerald-500" />, bg: "from-emerald-50 to-teal-50", border: "border-emerald-200" },
              { label: "Average Score", value: `${Math.round(shortlisted.reduce((s, c) => s + c.matchScore, 0) / (shortlisted.length || 1))}%`, icon: <TrendingUp className="w-5 h-5 text-blue-500" />, bg: "from-blue-50 to-cyan-50", border: "border-blue-200" },
              { label: "Processing Time", value: `${processingTime}s`, icon: <Clock className="w-5 h-5 text-rose-500" />, bg: "from-rose-50 to-pink-50", border: "border-rose-200" },
            ].map(stat => (
              <div key={stat.label} className={`bg-gradient-to-br ${stat.bg} border ${stat.border} rounded-2xl p-4 flex flex-col gap-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">{stat.icon}</div>
                </div>
                <span className="text-2xl font-black text-gray-900">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
            {[
              { id: "shortlisted", label: "Shortlisted Candidates", icon: <Users className="w-4 h-4" /> },
              { id: "insights", label: "AI Insights", icon: <BarChart2 className="w-4 h-4" /> },
              { id: "export", label: "Export", icon: <Download className="w-4 h-4" /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${activeTab === tab.id ? "bg-white text-violet-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── Shortlisted Table ── */}
          {activeTab === "shortlisted" && (
            <div className="space-y-4">
              {/* Search + Filter + Sort */}
              <div className="liquid-glass rounded-2xl p-4 border border-white/50 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, skill, or role..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white" />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={filterRec} onChange={e => setFilterRec(e.target.value)}
                    className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white cursor-pointer font-medium">
                    <option value="All">All Tiers</option>
                    <option value="Highly Recommended">⭐ Highly Recommended</option>
                    <option value="Recommended">✅ Recommended</option>
                    <option value="Consider">⚠ Consider</option>
                    <option value="Not Suitable">❌ Not Suitable</option>
                  </select>
                  <select value={sortField} onChange={e => setSortField(e.target.value as typeof sortField)}
                    className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white cursor-pointer font-medium">
                    <option value="matchScore">Match Score</option>
                    <option value="experience">Experience</option>
                    <option value="resumeScore">Resume Score</option>
                    <option value="atsScore">ATS Score</option>
                  </select>
                  <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    className="p-2.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 cursor-pointer">
                    {sortDir === "desc" ? <SortDesc className="w-4 h-4 text-gray-600" /> : <SortAsc className="w-4 h-4 text-gray-600" />}
                  </button>
                </div>
                <div className="text-xs text-gray-400 font-medium flex-shrink-0">{filteredCandidates.length} candidates</div>
              </div>

              {/* Table */}
              <div className="liquid-glass rounded-3xl border border-white/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        {["Rank","Candidate","Match %","Experience","Skills","Education","Resume","ATS","Recommendation","Actions"].map(h => (
                          <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {displayedCandidates.map((candidate, idx) => (
                        <motion.tr key={candidate.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="hover:bg-violet-50/30 transition-colors group cursor-pointer"
                          onClick={() => setSelectedCandidate(candidate)}>
                          {/* Rank */}
                          <td className="px-4 py-3.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                              candidate.rank === 1 ? "bg-amber-100 text-amber-700" :
                              candidate.rank === 2 ? "bg-gray-100 text-gray-600" :
                              candidate.rank === 3 ? "bg-orange-100 text-orange-600" :
                              "bg-violet-50 text-violet-500"}`}>
                              {candidate.rank <= 3 ? ["🥇","🥈","🥉"][candidate.rank - 1] : candidate.rank}
                            </div>
                          </td>
                          {/* Name */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                {candidate.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 truncate text-sm">{candidate.name}</div>
                                <div className="text-[11px] text-gray-400 truncate">{candidate.role}</div>
                              </div>
                            </div>
                          </td>
                          {/* Match % */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${getMatchColor(candidate.matchScore)}`}>
                                {candidate.matchScore}%
                              </span>
                            </div>
                          </td>
                          {/* Experience */}
                          <td className="px-4 py-3.5">
                            <span className="text-gray-700 font-semibold text-sm">
                              {candidate.experience === 0 ? "Fresher" : `${candidate.experience}y`}
                            </span>
                          </td>
                          {/* Skills */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                              {candidate.matchedSkills.slice(0, 3).map(s => (
                                <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">{s}</span>
                              ))}
                              {candidate.matchedSkills.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold">+{candidate.matchedSkills.length - 3}</span>
                              )}
                            </div>
                          </td>
                          {/* Education */}
                          <td className="px-4 py-3.5">
                            <div className="text-[11px] text-gray-700 font-semibold">{candidate.education.degree}</div>
                            <div className="text-[10px] text-gray-400 truncate max-w-[100px]">{candidate.education.college}</div>
                          </td>
                          {/* Resume */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${getMatchBarColor(candidate.resumeScore)}`}
                                  style={{ width: `${candidate.resumeScore}%` }} />
                              </div>
                              <span className="text-[11px] font-bold text-gray-600">{candidate.resumeScore}</span>
                            </div>
                          </td>
                          {/* ATS */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${getMatchBarColor(candidate.atsScore)}`}
                                  style={{ width: `${candidate.atsScore}%` }} />
                              </div>
                              <span className="text-[11px] font-bold text-gray-600">{candidate.atsScore}</span>
                            </div>
                          </td>
                          {/* Recommendation */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border whitespace-nowrap ${RECOMMENDATION_CONFIG[candidate.recommendation].color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${RECOMMENDATION_CONFIG[candidate.recommendation].dot}`} />
                              {candidate.recommendation}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => setSelectedCandidate(candidate)}
                                className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-600 transition-all cursor-pointer" title="View Profile">
                                <Eye className="w-4 h-4" />
                              </button>
                              {candidate.github && (
                                <a href={candidate.github} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all" title="GitHub">
                                  <GitBranch className="w-4 h-4" />
                                </a>
                              )}
                              {candidate.linkedin && (
                                <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-all" title="LinkedIn">
                                  <Link2 className="w-4 h-4" />
                                </a>
                              )}
                              {candidate.portfolio && (
                                <a href={candidate.portfolio} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-cyan-100 text-gray-400 hover:text-cyan-600 transition-all" title="Portfolio">
                                  <Globe className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredCandidates.length > 15 && (
                  <div className="p-4 border-t border-gray-100 text-center">
                    <button onClick={() => setShowAll(!showAll)}
                      className="flex items-center gap-2 mx-auto text-sm font-bold text-violet-600 hover:text-violet-800 cursor-pointer">
                      {showAll ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> Show All {filteredCandidates.length} Candidates</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── AI Insights ── */}
          {activeTab === "insights" && insights && (
            <div className="grid md:grid-cols-2 gap-6">

              {/* Top Skills */}
              <div className="liquid-glass rounded-3xl p-6 border border-white/50 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-5 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-violet-600" /> Top Skills in Candidate Pool
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={insights.topSkills} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis dataKey="skill" type="category" tick={{ fontSize: 11, fill: "#475569" }} width={90} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="count" name="Candidates" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Experience Distribution */}
              <div className="liquid-glass rounded-3xl p-6 border border-white/50 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-5 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-violet-600" /> Experience Distribution
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={insights.expDistribution} dataKey="count" nameKey="range" cx="50%" cy="50%"
                      outerRadius={80} labelLine={false}
                      label={({ name, percent }) => `${name} (${Math.round((percent ?? 0) * 100)}%)`}>
                      {insights.expDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Skill Gap Analysis */}
              <div className="liquid-glass rounded-3xl p-6 border border-white/50 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Skill Gap Analysis
                </h3>
                <p className="text-xs text-gray-400 mb-5">Skills most frequently missing across candidates</p>
                {insights.skillGaps.length > 0 ? (
                  <div className="space-y-3">
                    {insights.skillGaps.map((g, i) => (
                      <div key={g.skill} className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-gray-600 w-24 truncate">{g.skill}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                            style={{ width: `${(g.count / (insights.skillGaps[0]?.count || 1)) * 100}%` }} />
                        </div>
                        <span className="text-[11px] text-amber-600 font-bold w-8">{g.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">No skill gaps detected — great candidate pool!</p>
                )}
              </div>

              {/* Top Colleges */}
              <div className="liquid-glass rounded-3xl p-6 border border-white/50 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-5 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-violet-600" /> Top Colleges (Shortlisted)
                </h3>
                <div className="space-y-3">
                  {insights.topColleges.map((c, i) => (
                    <div key={c.college} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center text-[10px] font-black text-violet-700">{i + 1}</div>
                      <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{c.college}</span>
                      <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{c.count} candidates</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Avg ATS Score", value: insights.avgATS, icon: <FileText className="w-4 h-4" />, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Avg Match Score", value: `${insights.avgMatch}%`, icon: <Target className="w-4 h-4" />, color: "text-violet-600", bg: "bg-violet-50" },
                  { label: "Highly Recommended", value: rankedCandidates.filter(c => c.recommendation === "Highly Recommended").length, icon: <Star className="w-4 h-4" />, color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Interview Ready", value: shortlisted.filter(c => c.interviewProbability >= 70).length, icon: <CheckCircle className="w-4 h-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex flex-col gap-2`}>
                    <div className={`${s.color}`}>{s.icon}</div>
                    <div className="text-2xl font-black text-gray-900">{s.value}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Export ── */}
          {activeTab === "export" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: "Ranked Excel", desc: "Full candidate report with all AI scores", icon: <FileSpreadsheet className="w-6 h-6" />, color: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/30", action: exportExcel, ext: ".xlsx" },
                { label: "PDF Report", desc: "Formatted report for presentations", icon: <FileText className="w-6 h-6" />, color: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/30", action: exportPDF, ext: ".pdf" },
                { label: "CSV Export", desc: "For spreadsheets and ATS import", icon: <List className="w-6 h-6" />, color: "from-blue-500 to-cyan-600", shadow: "shadow-blue-500/30", action: exportCSV, ext: ".csv" },
                { label: "JSON Data", desc: "Structured data for API integrations", icon: <Code2 className="w-6 h-6" />, color: "from-violet-500 to-indigo-600", shadow: "shadow-violet-500/30", action: exportJSON, ext: ".json" },
              ].map(exp => (
                <button key={exp.label} onClick={exp.action}
                  className={`bg-gradient-to-br ${exp.color} text-white rounded-3xl p-6 text-left flex flex-col gap-4 shadow-lg ${exp.shadow} hover:scale-[1.03] transition-all cursor-pointer`}>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30">
                    {exp.icon}
                  </div>
                  <div>
                    <div className="font-black text-base">{exp.label}</div>
                    <div className="text-white/70 text-xs mt-1">{exp.desc}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold bg-white/20 rounded-xl px-3 py-1.5 w-fit border border-white/20">
                    <Download className="w-3.5 h-3.5" /> Download {exp.ext}
                  </div>
                </button>
              ))}
              <div className="sm:col-span-2 lg:col-span-4 liquid-glass rounded-3xl p-6 border border-white/50">
                <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-violet-600" /> What's included in exports
                </h3>
                <div className="grid sm:grid-cols-3 gap-4 text-xs text-gray-600">
                  {[
                    ["Candidate Info", ["Rank", "Name", "Email", "Location", "Role"]],
                    ["AI Analysis", ["Match Score", "Matched Skills", "Missing Skills", "AI Notes", "Hiring Confidence"]],
                    ["Scores", ["Resume Score", "ATS Score", "Interview Probability", "Education", "Certifications"]],
                  ].map(([title, items]) => (
                    <div key={String(title)}>
                      <div className="font-bold text-gray-700 mb-2">{title}</div>
                      <ul className="space-y-1">
                        {(items as string[]).map(item => (
                          <li key={item} className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Re-analyze button */}
          <div className="flex justify-center pt-2">
            <button onClick={() => { setStage("upload"); setRankedCandidates([]); setShortlisted([]); setSelectedCandidate(null); setSearchQuery(""); }}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-sm transition-all cursor-pointer">
              <RefreshCw className="w-4 h-4" /> Start New Analysis
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CANDIDATE SIDE PANEL
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedCandidate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setSelectedCandidate(null)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-white shadow-2xl overflow-y-auto">
              
              {/* Panel Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#1e1b4b] to-[#312e81] p-6 text-white z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white font-black text-xl">
                      {selectedCandidate.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-black">{selectedCandidate.name}</h3>
                      <p className="text-slate-300 text-sm">{selectedCandidate.role}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-400 text-xs">{selectedCandidate.location}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCandidate(null)}
                    className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score Rings */}
                <div className="flex justify-around mt-6 pt-5 border-t border-white/20">
                  <ScoreRing score={selectedCandidate.matchScore} label="AI Match" size={76} />
                  <ScoreRing score={selectedCandidate.resumeScore} label="Resume" size={76} />
                  <ScoreRing score={selectedCandidate.atsScore} label="ATS" size={76} />
                  <ScoreRing score={selectedCandidate.interviewProbability} label="Interview" size={76} />
                </div>

                {/* Recommendation Badge */}
                <div className="flex items-center justify-center mt-4">
                  <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border bg-white/10 text-white border-white/20`}>
                    {selectedCandidate.recommendationEmoji} {selectedCandidate.recommendation}
                  </span>
                </div>
              </div>

              {/* Panel Body */}
              <div className="p-6 space-y-6">

                {/* AI Notes */}
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-violet-600" />
                    <span className="text-xs font-black text-violet-700 uppercase tracking-wider">AI Analysis</span>
                  </div>
                  <p className="text-sm text-violet-800 font-medium leading-relaxed">{selectedCandidate.aiNotes}</p>
                </div>

                {/* Hiring Confidence */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Hiring Confidence", value: selectedCandidate.hiringConfidence, color: selectedCandidate.hiringConfidence === "High" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : selectedCandidate.hiringConfidence === "Medium" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-500 bg-red-50 border-red-200" },
                    { label: "Experience", value: selectedCandidate.experience === 0 ? "Fresher" : `${selectedCandidate.experience}y exp`, color: "text-blue-600 bg-blue-50 border-blue-200" },
                    { label: "Notice Period", value: selectedCandidate.noticePeriod, color: "text-gray-600 bg-gray-50 border-gray-200" },
                  ].map(item => (
                    <div key={item.label} className={`p-3 border rounded-xl text-center ${item.color}`}>
                      <div className="text-xs font-black uppercase tracking-wider opacity-70 mb-1">{item.label}</div>
                      <div className="text-sm font-black">{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Matched Skills */}
                {selectedCandidate.matchedSkills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Matched Skills ({selectedCandidate.matchedSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.matchedSkills.map(s => (
                        <span key={s} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Skills */}
                {selectedCandidate.missingSkills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <XCircle className="w-3.5 h-3.5 text-red-400" /> Missing Skills ({selectedCandidate.missingSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.missingSkills.map(s => (
                        <span key={s} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Skills */}
                <div>
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-violet-500" /> All Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.skills.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-violet-500" /> Education
                  </h4>
                  <div className="font-bold text-gray-800">{selectedCandidate.education.degree}</div>
                  <div className="text-sm text-gray-600 mt-0.5">{selectedCandidate.education.college}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Class of {selectedCandidate.education.year}</div>
                </div>

                {/* Certifications */}
                {selectedCandidate.certifications.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-amber-500" /> Certifications
                    </h4>
                    <div className="space-y-2">
                      {selectedCandidate.certifications.map(c => (
                        <div key={c} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                          <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" /> {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {selectedCandidate.projects.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-violet-500" /> Projects
                    </h4>
                    <div className="space-y-3">
                      {selectedCandidate.projects.map((p, i) => (
                        <div key={i} className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
                          <div className="font-bold text-sm text-gray-800">{p.name}</div>
                          <div className="text-[10px] text-violet-600 font-bold mt-0.5">{p.tech}</div>
                          <div className="text-xs text-gray-600 mt-1">{p.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {selectedCandidate.strengths.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Strengths
                    </h4>
                    <div className="space-y-2">
                      {selectedCandidate.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weaknesses */}
                {selectedCandidate.weaknesses.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Areas of Concern
                    </h4>
                    <div className="space-y-2">
                      {selectedCandidate.weaknesses.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" /> {w}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Links */}
                <div className="flex gap-3">
                  {selectedCandidate.github && (
                    <a href={selectedCandidate.github} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all">
                      <GitBranch className="w-4 h-4" /> GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedCandidate.linkedin && (
                    <a href={selectedCandidate.linkedin} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all">
                      <Link2 className="w-4 h-4" /> LinkedIn <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedCandidate.portfolio && (
                    <a href={selectedCandidate.portfolio} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-all">
                      <Globe className="w-4 h-4" /> Portfolio <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Contact Info */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 text-sm text-gray-600">
                  <div className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-3">Contact Information</div>
                  <div>{selectedCandidate.email}</div>
                  <div>{selectedCandidate.phone}</div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                    <span>{selectedCandidate.workMode}</span>
                    <span>•</span>
                    <span>{selectedCandidate.employmentType}</span>
                    <span>•</span>
                    <span>{selectedCandidate.expectedSalary}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
