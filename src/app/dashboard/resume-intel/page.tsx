"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Sparkles, Download, RefreshCw,
  Target, Award, TrendingUp, ChevronRight, X, Info, FileCheck2, RotateCcw,
  Bug, ListChecks,
} from "lucide-react";
import { extractResumeFile, saveResumeInsight, type ExtractResult } from "@/actions/resumeAnalyzer";
import {
  analyzeResumeComplete,
} from "@/lib/resume";
import {
  categoryDeltas,
  CHANGE_TYPE_META,
} from "@/lib/resume/resumeComparisonEngine";
import { generateEnhancedResumePDF, generateAnalysisReportPDF } from "@/lib/resume/pdfGenerator";
import { titleCase } from "@/lib/resume/resumeEnhancementEngine";
import type {
  ResumeAnalysis, JobProfile, ResumeChange, ATSCategoryScore, ResumeIssue,
} from "@/lib/resume/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ROLE_PRESETS = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer", "Java Developer",
  "Data Analyst", "Data Scientist", "DevOps Engineer", "Machine Learning Engineer",
  "Mobile Developer", "Software Engineer",
];

const ANALYZE_STAGES = [
  "Extracting resume content...",
  "Analyzing job requirements...",
  "Matching ATS keywords...",
  "Evaluating resume structure...",
  "Optimizing resume content...",
  "Recalculating ATS score...",
  "Generating enhanced resume...",
];

const STEPS = ["Upload Resume", "Target Job", "Analyze", "Results"];

const GRADE_COLOR: Record<string, string> = {
  Poor: "#ef4444",
  "Needs Improvement": "#f59e0b",
  Average: "#eab308",
  Strong: "#22c55e",
  Excellent: "#16a34a",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function CircularScore({ score, grade, size = 132 }: { score: number; grade: string; size?: number }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const color = GRADE_COLOR[grade] || "#4f46e5";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900">{score}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{grade}</span>
      </div>
    </div>
  );
}

function ScoreBar({ cat }: { cat: ATSCategoryScore }) {
  const pct = (cat.score / cat.max) * 100;
  const color = pct >= 80 ? "#16a34a" : pct >= 55 ? "#4f46e5" : pct >= 35 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[13px] font-medium text-slate-700">{cat.label}</span>
        <span className="text-[13px] font-bold text-slate-900 tabular-nums">{cat.score}/{cat.max}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
      </div>
      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{cat.explanation}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: ResumeIssue["severity"] }) {
  const map: Record<string, string> = {
    Critical: "bg-red-100 text-red-700 border-red-200",
    High: "bg-orange-100 text-orange-700 border-orange-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${map[severity]}`}>{severity}</span>;
}

function ChangeBadge({ type }: { type: ResumeChange["changeType"] }) {
  const m = CHANGE_TYPE_META[type];
  return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${m.bg} ${m.color} ${m.border}`}>{m.label}</span>;
}

function SectionCard({ title, icon, children, className = "" }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`liquid-glass-light rounded-3xl p-6 sm:p-8 ${className}`}>
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        {icon}{title}
      </h3>
      {children}
    </div>
  );
}

export default function ResumeIntelPage() {
  const [stage, setStage] = useState<"upload" | "job" | "analyzing" | "results">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [job, setJob] = useState<JobProfile>({ title: "", description: "", skillsText: "" });
  const [loadingMsg, setLoadingMsg] = useState("");
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<"score" | "keywords" | "issues" | "compare" | "download">("score");
  const [selectedChange, setSelectedChange] = useState<ResumeChange | null>(null);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const leftScroll = useRef<HTMLDivElement>(null);
  const rightScroll = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const onFilePicked = (f: File | null) => {
    if (!f) return;
    setUploadError(null);
    const lower = (f.name || "").toLowerCase();
    const mime = f.type || "";
    const isPdf = lower.endsWith(".pdf") || mime.includes("pdf");
    if (!isPdf) {
      setUploadError("Only PDF files are supported. Please upload a .pdf resume.");
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setUploadError("File is too large (max 12MB).");
      return;
    }
    setFile(f);
    setFileName(f.name);
    setFileSize(f.size);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    onFilePicked(f || null);
  };

  const runExtraction = async () => {
    if (!file) return;
    setExtracting(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const res: ExtractResult = await extractResumeFile(fd);
      if (!res.ok || !res.text) {
        setUploadError(res.reason || "Could not extract text from the resume.");
        setExtracting(false);
        return;
      }
      setResumeText(res.text);
      setStage("job");
    } catch (err: any) {
      setUploadError(err?.message || "Failed to extract resume text.");
    } finally {
      setExtracting(false);
    }
  };

  const runAnalysis = async () => {
    if (!resumeText) return;
    setStage("analyzing");
    setLoadingMsg(ANALYZE_STAGES[0]);
    // Compute synchronously (deterministic, local) then walk through the
    // pipeline stages as honest loading feedback.
    const result = analyzeResumeComplete(resumeText, job, fileName, fileSize);
    for (let i = 1; i < ANALYZE_STAGES.length; i++) {
      await delay(280);
      setLoadingMsg(ANALYZE_STAGES[i]);
    }
    await delay(300);
    setAnalysis(result);
    setStage("results");
    setActiveTab("score");
    saveResumeInsight({
      fileName, fileSize,
      beforeScore: result.beforeScore.total,
      afterScore: result.afterScore.total,
      screeningPercent: result.screening.percent,
      issuesCount: result.issues.length,
    }).catch(() => {});
  };

  const reset = () => {
    setStage("upload");
    setFile(null); setFileName(""); setFileSize(0); setResumeText("");
    setJob({ title: "", description: "", skillsText: "" });
    setAnalysis(null); setSelectedChange(null); setUploadError(null);
  };

  const downloadEnhanced = async () => {
    if (!analysis) return;
    setDownloading(true);
    try {
      const name = analysis.original.personalInfo.name || "Candidate";
      const safe = name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "Candidate";
      await generateEnhancedResumePDF(analysis.enhanced.data, `${safe}_Enhanced_Resume.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const downloadReport = async () => {
    if (!analysis) return;
    setDownloading(true);
    try {
      await generateAnalysisReportPDF(analysis);
    } finally {
      setDownloading(false);
    }
  };

  // Sync scroll between comparison panes.
  const onScroll = (src: "left" | "right") => {
    const a = src === "left" ? leftScroll.current : rightScroll.current;
    const b = src === "left" ? rightScroll.current : leftScroll.current;
    if (a && b && b.scrollTop !== a.scrollTop) b.scrollTop = a.scrollTop;
  };

  const improvement = analysis ? analysis.afterScore.total - analysis.beforeScore.total : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden mb-2">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <FileText className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white">
              Resume ATS Analyzer & AI Enhancer
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              100% local analysis — no external AI APIs, no API keys, your resume never leaves your browser session.
            </p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {STEPS.map((s, i) => {
          const order = ["upload", "job", "analyzing", "results"];
          const currentIdx = stage === "upload" ? 0 : stage === "job" ? 1 : stage === "analyzing" ? 2 : 3;
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${active ? "bg-[#4f46e5] text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-white/60 text-slate-500 border border-slate-200"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${active ? "bg-white/20" : done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>{done ? "✓" : i + 1}</span>
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
            </div>
          );
        })}
      </div>

      {/* ============ UPLOAD STAGE ============ */}
      {stage === "upload" && (
        <div className="max-w-3xl mx-auto">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`liquid-glass border-dashed border-2 rounded-3xl p-10 flex flex-col items-center justify-center space-y-6 transition-all ${dragOver ? "border-[#4f46e5] bg-indigo-50/40" : "border-slate-300 hover:bg-white/40"}`}
          >
            <input type="file" ref={inputRef} className="hidden" accept=".pdf,application/pdf" onChange={(e) => onFilePicked(e.target.files?.[0] || null)} />
            <div className="p-6 rounded-full bg-[#4f46e5]/10">
              <Upload className="h-10 w-10 text-[#4f46e5]" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900">Upload your resume (PDF only)</h3>
              <p className="text-sm text-slate-500 mt-1">Drag & drop or browse. Text is extracted locally on our server; nothing is sent to a third party.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => inputRef.current?.click()} disabled={extracting}
                className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] font-medium rounded-full px-6 py-2.5 transition-colors disabled:opacity-70">
                <Upload className="w-4 h-4" /> Select PDF
              </button>
            </div>

            {file && (
              <div className="w-full max-w-md mt-2 p-4 rounded-2xl bg-white/70 border border-slate-200 flex items-center gap-3">
                <FileText className="w-8 h-8 text-[#4f46e5] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 truncate">{fileName}</p>
                  <p className="text-[12px] text-slate-500">{formatBytes(fileSize)} • PDF</p>
                </div>
                <button onClick={() => { setFile(null); setFileName(""); setFileSize(0); }} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500" title="Remove">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {uploadError && (
              <div className="flex items-start gap-2 max-w-md mx-auto p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {file && (
              <button onClick={runExtraction} disabled={extracting}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-[15px] font-semibold rounded-full px-7 py-3 transition-colors disabled:opacity-70">
                {extracting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Extracting…</> : <>Continue to Job Profile <ChevronRight className="w-4 h-4" /></>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============ JOB PROFILE STAGE ============ */}
      {stage === "job" && (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="liquid-glass-light rounded-3xl p-6 sm:p-8 space-y-5">
            <div>
              <label className="text-[14px] font-semibold text-slate-800 flex items-center gap-2"><Target className="w-4 h-4 text-[#4f46e5]" /> Target Job Title</label>
              <input
                value={job.title}
                onChange={(e) => setJob({ ...job, title: e.target.value })}
                placeholder="e.g. Frontend Developer"
                className="mt-2 w-full h-11 rounded-xl border border-slate-300 px-3.5 text-[15px] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/30"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {ROLE_PRESETS.map((r) => (
                  <button key={r} onClick={() => setJob({ ...job, title: r })}
                    className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${job.title === r ? "bg-[#4f46e5] text-white border-[#4f46e5]" : "bg-white/70 border-slate-200 text-slate-600 hover:border-[#4f46e5]"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[14px] font-semibold text-slate-800">Job Description</label>
              <textarea
                value={job.description}
                onChange={(e) => setJob({ ...job, description: e.target.value })}
                rows={5}
                placeholder="Paste the job description. The analyzer extracts required skills and keywords automatically."
                className="mt-2 w-full rounded-xl border border-slate-300 p-3.5 text-[14px] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/30 resize-none"
              />
            </div>

            <div>
              <label className="text-[14px] font-semibold text-slate-800">Key Skills / Requirements <span className="text-slate-400 font-normal">(comma separated, optional)</span></label>
              <input
                value={job.skillsText}
                onChange={(e) => setJob({ ...job, skillsText: e.target.value })}
                placeholder="React, TypeScript, Next.js, REST API, Git…"
                className="mt-2 w-full h-11 rounded-xl border border-slate-300 px-3.5 text-[15px] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/30"
              />
            </div>
          </div>

          <div className="flex justify-between max-w-3xl">
            <button onClick={() => setStage("upload")} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-[14px] font-medium">
              <RotateCcw className="w-4 h-4" /> Replace resume
            </button>
            <button onClick={runAnalysis} className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] font-semibold rounded-full px-7 py-3 transition-colors">
              <Sparkles className="w-4 h-4" /> Analyze Resume
            </button>
          </div>
        </div>
      )}

      {/* ============ ANALYZING STAGE ============ */}
      {stage === "analyzing" && (
        <div className="max-w-xl mx-auto liquid-glass-light rounded-3xl p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#4f46e5]/10 flex items-center justify-center mb-6">
            <RefreshCw className="w-7 h-7 text-[#4f46e5] animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Running local ATS analysis…</h3>
          <div className="space-y-2.5 text-left max-w-sm mx-auto">
            {ANALYZE_STAGES.map((s, i) => {
              const activeIdx = ANALYZE_STAGES.indexOf(loadingMsg);
              const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
              return (
                <div key={s} className="flex items-center gap-3">
                  {state === "done" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                    state === "active" ? <RefreshCw className="w-4 h-4 text-[#4f46e5] animate-spin" /> :
                      <div className="w-4 h-4 rounded-full border border-slate-300" />}
                  <span className={`text-[13.5px] ${state === "pending" ? "text-slate-400" : "text-slate-700 font-medium"}`}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ RESULTS STAGE ============ */}
      {stage === "results" && analysis && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[12px] text-slate-500 font-medium">Original ATS</h3>
              <div className="text-3xl font-bold text-slate-900 mt-1">{analysis.beforeScore.total}<span className="text-base text-slate-400">/100</span></div>
              <div className="mt-1.5 text-[11px] px-2 py-0.5 rounded-full inline-block font-medium bg-slate-100 text-slate-600">{analysis.beforeScore.grade}</div>
            </div>
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[12px] text-slate-500 font-medium">Enhanced ATS</h3>
              <div className="text-3xl font-bold text-emerald-600 mt-1 flex items-baseline gap-1">
                {analysis.afterScore.total}<span className="text-base text-slate-400">/100</span>
              </div>
              <div className="mt-1.5 text-[11px] px-2 py-0.5 rounded-full inline-block font-medium bg-emerald-100 text-emerald-700">{analysis.afterScore.grade}</div>
            </div>
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[12px] text-slate-500 font-medium">ATS Improvement</h3>
              <div className={`text-3xl font-bold mt-1 flex items-baseline gap-1 ${improvement >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
                {improvement >= 0 ? "+" : ""}{improvement}<span className="text-base text-slate-400"> pts</span>
              </div>
              <div className="mt-1.5 text-[11px] px-2 py-0.5 rounded-full inline-block font-medium bg-indigo-100 text-indigo-700">Recalculated, not forced</div>
            </div>
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[12px] text-slate-500 font-medium">Screening Chance</h3>
              <div className="text-3xl font-bold text-slate-900 mt-1">{analysis.screening.percent}<span className="text-base text-slate-400">%</span></div>
              <div className="mt-1.5 text-[11px] px-2 py-0.5 rounded-full inline-block font-medium bg-amber-100 text-amber-700">Estimated</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200/80 gap-1 justify-center flex-wrap">
            {([["score", "ATS Score"], ["keywords", "Keywords"], ["issues", "Issues"], ["compare", "Compare"], ["download", "Download"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`pb-3 px-3 text-[14px] font-semibold transition-all relative ${activeTab === key ? "text-[#4f46e5]" : "text-slate-500 hover:text-slate-800"}`}>
                {label}
                {activeTab === key && <motion.div layoutId="tabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f46e5]" />}
              </button>
            ))}
          </div>

          {/* ---- SCORE TAB ---- */}
          {activeTab === "score" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <SectionCard title="ATS Score Breakdown" icon={<Award className="w-5 h-5 text-[#4f46e5]" />}>
                <div className="flex items-center gap-6">
                  <CircularScore score={analysis.beforeScore.total} grade={analysis.beforeScore.grade} />
                  <div className="text-[13px] text-slate-600">
                    <p className="font-semibold text-slate-800 mb-1">How the score is built</p>
                    <ul className="space-y-1 text-slate-500">
                      <li>• Keyword Match — 30</li>
                      <li>• Technical Skills — 20</li>
                      <li>• Experience Relevance — 15</li>
                      <li>• Project Relevance — 10</li>
                      <li>• Structure / Action Verbs / Quantified / Formatting — 25</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {analysis.beforeScore.categories.map((c) => <ScoreBar key={c.key} cat={c} />)}
                </div>
              </SectionCard>

              <SectionCard title="Estimated Resume Screening Chance" icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}>
                <div className="flex items-center gap-5">
                  <CircularScore score={analysis.screening.percent} grade={analysis.screening.percent >= 70 ? "Strong" : analysis.screening.percent >= 50 ? "Average" : "Needs Improvement"} size={120} />
                  <p className="text-[13px] text-slate-600">
                    An estimate of how likely your resume passes an ATS screening for this role, based on alignment and compatibility.
                  </p>
                </div>
                <div className="mt-5 grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[12px] font-semibold text-emerald-700 mb-2">↑ Increases chance</p>
                    <ul className="space-y-1.5">
                      {analysis.screening.factorsIncreasing.length ? analysis.screening.factorsIncreasing.map((f, i) => (
                        <li key={i} className="text-[12.5px] text-slate-600 flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{f}</li>
                      )) : <li className="text-[12.5px] text-slate-400">—</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-rose-600 mb-2">↓ Decreases chance</p>
                    <ul className="space-y-1.5">
                      {analysis.screening.factorsDecreasing.length ? analysis.screening.factorsDecreasing.map((f, i) => (
                        <li key={i} className="text-[12.5px] text-slate-600 flex gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />{f}</li>
                      )) : <li className="text-[12.5px] text-slate-400">—</li>}
                    </ul>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-4 flex gap-1.5"><Info className="w-3.5 h-3.5 flex-shrink-0" />{analysis.screening.disclaimer}</p>
              </SectionCard>
            </div>
          )}

          {/* ---- KEYWORDS TAB ---- */}
          {activeTab === "keywords" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <SectionCard title="Keyword Coverage" icon={<ListChecks className="w-5 h-5 text-[#4f46e5]" />}>
                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12.5px] rounded-full font-medium">Matched: {analysis.keywords.matched.length}</span>
                  <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] rounded-full font-medium">Missing: {analysis.keywords.missing.length}</span>
                  <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[12.5px] rounded-full font-medium">Weak form: {analysis.keywords.weak.length}</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-700 mb-2">Matched keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords.matched.length ? analysis.keywords.matched.map((k) => (
                        <span key={k} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[12px] rounded-full font-medium border border-emerald-100">{titleCase(k)}</span>
                      )) : <span className="text-[12.5px] text-slate-400">None</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-700 mb-2">Missing keywords (recommended, not fabricated)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords.missing.length ? analysis.keywords.missing.map((k) => (
                        <span key={k} className="px-2.5 py-1 bg-rose-50 text-rose-600 text-[12px] rounded-full font-medium border border-rose-100">{titleCase(k)}</span>
                      )) : <span className="text-[12.5px] text-slate-400">None — all target keywords covered.</span>}
                    </div>
                  </div>
                  {analysis.keywords.weak.length > 0 && (
                    <div>
                      <p className="text-[13px] font-semibold text-slate-700 mb-2">Present only in weak/abbreviated form</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.keywords.weak.map((k) => (
                          <span key={k} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[12px] rounded-full font-medium border border-amber-100">{titleCase(k)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="By Category" icon={<Target className="w-5 h-5 text-[#4f46e5]" />}>
                <div className="space-y-3">
                  {Object.entries(analysis.keywords.byCategory).map(([cat, val]) => {
                    if (!val.matched.length && !val.missing.length) return null;
                    return (
                      <div key={cat} className="p-3 rounded-xl bg-white/50 border border-slate-200">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[13px] font-semibold text-slate-800">{cat}</span>
                          <span className="text-[11px] text-slate-500">{val.matched.length} matched · {val.missing.length} missing</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {val.matched.map((k) => <span key={`m-${k}`} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] rounded-full">{titleCase(k)}</span>)}
                          {val.missing.map((k) => <span key={`x-${k}`} className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[11px] rounded-full">{titleCase(k)}</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ---- ISSUES TAB ---- */}
          {activeTab === "issues" && (
            <SectionCard title={`Resume Issues & Weaknesses (${analysis.issues.length})`} icon={<Bug className="w-5 h-5 text-[#4f46e5]" />}>
              {analysis.issues.length ? (
                <div className="space-y-3">
                  {analysis.issues.map((issue) => (
                    <div key={issue.id} className="p-4 rounded-2xl bg-white/50 border border-slate-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SeverityBadge severity={issue.severity} />
                          <span className="text-[14px] font-semibold text-slate-900">{issue.title}</span>
                          {issue.section && <span className="text-[11px] text-slate-400">· {issue.section}</span>}
                        </div>
                      </div>
                      <p className="text-[13px] text-slate-600 mt-2"><span className="font-semibold text-slate-700">Why it matters: </span>{issue.why}</p>
                      <p className="text-[13px] text-slate-600 mt-1"><span className="font-semibold text-emerald-700">Recommended change: </span>{issue.recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-emerald-700"><CheckCircle2 className="w-5 h-5" /> No significant weaknesses detected. Great resume!</div>
              )}
            </SectionCard>
          )}

          {/* ---- COMPARE TAB ---- */}
          {activeTab === "compare" && (
            <div className="space-y-5">
              <SectionCard title="Before → After ATS Score" icon={<TrendingUp className="w-5 h-5 text-[#4f46e5]" />}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {categoryDeltas(analysis.beforeScore, analysis.afterScore).map((d) => (
                    <div key={d.label} className="p-3 rounded-xl bg-white/50 border border-slate-200">
                      <p className="text-[12px] font-medium text-slate-600 mb-1">{d.label}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[15px] font-bold text-slate-500">{d.before}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[17px] font-bold text-slate-900">{d.after}</span>
                        {d.delta !== 0 && <span className={`text-[11px] font-bold ${d.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>{d.delta > 0 ? `+${d.delta}` : d.delta}</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">/ {d.max}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <div className="liquid-glass-light rounded-3xl p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#4f46e5]" /> Original vs AI-Enhanced Resume</h3>
                    <p className="text-slate-500 text-[13px] mt-1">Click any highlighted change to see the reason and ATS impact.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(CHANGE_TYPE_META) as ResumeChange["changeType"][]).map((t) => (
                      <span key={t} className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${CHANGE_TYPE_META[t].bg} ${CHANGE_TYPE_META[t].color} ${CHANGE_TYPE_META[t].border}`}>{CHANGE_TYPE_META[t].label}</span>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-5">
                  <ResumePane title="Original Resume" score={analysis.beforeScore.total} data={analysis.original} changes={analysis.enhanced.changes} side="original" leftScroll={leftScroll} rightScroll={rightScroll} onScroll={onScroll} onSelect={setSelectedChange} accent="slate" />
                  <ResumePane title="AI-Enhanced Resume" score={analysis.afterScore.total} data={analysis.enhanced.data} changes={analysis.enhanced.changes} side="enhanced" leftScroll={leftScroll} rightScroll={rightScroll} onScroll={onScroll} onSelect={setSelectedChange} accent="emerald" />
                </div>
              </div>
            </div>
          )}

          {/* ---- DOWNLOAD TAB ---- */}
          {activeTab === "download" && (
            <SectionCard title="Export" icon={<Download className="w-5 h-5 text-[#4f46e5]" />}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/50 border border-slate-200">
                  <div className="flex items-center gap-3 mb-3"><FileCheck2 className="w-6 h-6 text-emerald-600" /><h4 className="text-[15px] font-semibold text-slate-900">Enhanced Resume PDF</h4></div>
                  <p className="text-[13px] text-slate-500 mb-4">ATS-friendly, single-column, selectable text PDF. Named <code className="text-[12px] bg-slate-100 px-1 rounded">FirstName_LastName_Enhanced_Resume.pdf</code>.</p>
                  <button onClick={downloadEnhanced} disabled={downloading} className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[14px] font-semibold rounded-full px-6 py-3 transition-colors disabled:opacity-70">
                    {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download Enhanced PDF
                  </button>
                </div>
                <div className="p-5 rounded-2xl bg-white/50 border border-slate-200">
                  <div className="flex items-center gap-3 mb-3"><ListChecks className="w-6 h-6 text-indigo-600" /><h4 className="text-[15px] font-semibold text-slate-900">Original Analysis Report</h4></div>
                  <p className="text-[13px] text-slate-500 mb-4">Full report: before/after scores, screening estimate, missing keywords, weaknesses and applied changes.</p>
                  <button onClick={downloadReport} disabled={downloading} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-[14px] font-semibold rounded-full px-6 py-3 transition-colors disabled:opacity-70">
                    {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download Analysis PDF
                  </button>
                </div>
              </div>
              <button onClick={reset} className="mt-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 text-[14px] font-medium">
                <RotateCcw className="w-4 h-4" /> Analyze another resume
              </button>
            </SectionCard>
          )}
        </motion.div>
      )}

      {/* Change detail modal */}
      {selectedChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedChange(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ChangeBadge type={selectedChange.changeType} />
                <span className="text-[14px] font-semibold text-slate-800">{selectedChange.section}</span>
              </div>
              <button onClick={() => setSelectedChange(null)} className="p-1.5 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-rose-500 mb-1">Original</p>
                <p className="text-[13.5px] text-slate-600 bg-rose-50/40 border border-rose-100 p-3 rounded-xl">{selectedChange.originalText}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Enhanced</p>
                <p className="text-[13.5px] text-slate-800 font-medium bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl">{selectedChange.enhancedText}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Reason</p>
                <p className="text-[13px] text-slate-600">{selectedChange.reason}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-500 mb-1">ATS Impact</p>
                <p className="text-[13px] text-indigo-700 font-semibind">{selectedChange.atsImpact}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Split-pane resume renderer with change highlighting                */
/* ------------------------------------------------------------------ */

function ResumePane({
  title, score, data, changes, side, leftScroll, rightScroll, onScroll, onSelect, accent,
}: {
  title: string;
  score: number;
  data: ResumeAnalysis["original"];
  changes: ResumeChange[];
  side: "original" | "enhanced";
  leftScroll: React.RefObject<HTMLDivElement | null>;
  rightScroll: React.RefObject<HTMLDivElement | null>;
  onScroll: (src: "left" | "right") => void;
  onSelect: (c: ResumeChange) => void;
  accent: "slate" | "emerald";
}) {
  const isOrig = side === "original";
  // Build lookup maps for highlighting.
  const changeByText = new Map<string, ResumeChange>();
  for (const c of changes) {
    const key = isOrig ? c.originalText.trim() : c.enhancedText.trim();
    if (key && key !== "(no summary)") changeByText.set(key, c);
  }

  const border = accent === "emerald" ? "border-emerald-400 bg-emerald-50/10" : "border-slate-200 bg-white/40";
  const headColor = accent === "emerald" ? "text-emerald-900" : "text-slate-800";

  const renderBullets = (bullets: string[]) =>
    bullets.map((b, i) => {
      const ch = changeByText.get(b.trim());
      const highlighted = Boolean(ch);
      const meta = ch ? CHANGE_TYPE_META[ch.changeType] : null;
      return (
        <li key={i}
          onClick={() => ch && onSelect(ch)}
          className={`text-[12px] leading-relaxed ${highlighted && meta ? `${meta.bg} ${meta.border} border px-1.5 py-0.5 rounded cursor-pointer` : "text-slate-600"}`}>
          {b}
        </li>
      );
    });

  return (
    <div className={`border-2 rounded-2xl p-5 shadow-sm ${border} h-[560px] flex flex-col`}>
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
        <div>
          <h4 className={`text-[13px] font-bold uppercase tracking-wide ${headColor}`}>{title}</h4>
          <div className="text-[12px] font-semibold text-slate-600 mt-0.5">ATS Score: <span className="font-bold">{score}/100</span></div>
        </div>
      </div>
      <div
        ref={isOrig ? leftScroll : rightScroll}
        onScroll={() => onScroll(isOrig ? "left" : "right")}
        className="space-y-3 overflow-y-auto pr-2 text-left font-sans text-xs text-slate-700 leading-relaxed flex-1"
      >
        <div>
          <div className="text-base font-bold text-slate-900">{data.personalInfo.name || "Candidate"}</div>
          <div className="text-slate-500 mt-0.5 text-[11px]">
            {[data.personalInfo.email, data.personalInfo.phone, data.personalInfo.location, data.personalInfo.github, data.personalInfo.linkedin].filter(Boolean).join(" | ")}
          </div>
        </div>
        {data.summary && (
          <div className="border-t border-slate-150 pt-2">
            <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-1">Professional Summary</div>
            <p className={`text-slate-600 ${changeByText.get(data.summary.trim()) ? "bg-emerald-50/40 border border-emerald-100 rounded p-1.5 cursor-pointer" : ""}`}
              onClick={() => { const c = changeByText.get(data.summary.trim()); c && onSelect(c); }}>{data.summary}</p>
          </div>
        )}
        {data.skills.length > 0 && (
          <div className="border-t border-slate-150 pt-2">
            <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-1.5">Technical Skills</div>
            <div className="flex flex-wrap gap-1">
              {data.skills.map((s, i) => <span key={i} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-700 font-semibold">{titleCase(s)}</span>)}
            </div>
          </div>
        )}
        {data.experience.length > 0 && (
          <div className="border-t border-slate-150 pt-2">
            <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-2">Experience</div>
            {data.experience.map((e, idx) => (
              <div key={idx} className="mb-3 last:mb-0">
                <div className="font-bold text-slate-800 text-[12px]">{e.heading}</div>
                <ul className="list-disc pl-4 mt-1 space-y-1">{renderBullets(e.bullets)}</ul>
              </div>
            ))}
          </div>
        )}
        {data.projects.length > 0 && (
          <div className="border-t border-slate-150 pt-2">
            <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-2">Projects</div>
            {data.projects.map((p, idx) => (
              <div key={idx} className="mb-3 last:mb-0">
                <div className="font-bold text-slate-800 text-[12px]">{p.heading}</div>
                <ul className="list-disc pl-4 mt-1 space-y-1">{renderBullets(p.bullets)}</ul>
              </div>
            ))}
          </div>
        )}
        {data.education.length > 0 && (
          <div className="border-t border-slate-150 pt-2">
            <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-2">Education</div>
            {data.education.map((e, idx) => <div key={idx} className="text-slate-600 text-[12px]">{e.text}</div>)}
          </div>
        )}
        {data.certifications.length > 0 && (
          <div className="border-t border-slate-150 pt-2">
            <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-2">Certifications</div>
            {data.certifications.map((c, idx) => <div key={idx} className="text-slate-600 text-[12px]">{c.text}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
