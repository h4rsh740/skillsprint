"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, FileText, Briefcase, Award, CheckCircle, AlertTriangle, 
  ArrowRight, Download, RefreshCw, Layers, Sparkles, ChevronRight, 
  Trash2, Plus, Info, Eye, Check, X, ShieldAlert, TrendingUp 
} from "lucide-react";
import { ResumeDocument } from "@/components/resume/ResumeDocument";
import { Button } from "@/components/ui/button";
import { BackgroundPaths } from "@/components/ui/background-paths";
import type { ResumeData, AnalysisBundle, EnhanceResponse, ResumeChange, ResumeIssue, EnhancedResume } from "@/lib/resumeiq/types";

interface ResumePaneProps {
  title: string;
  score: number;
  data: ResumeData | EnhancedResume;
  changes: ResumeChange[];
  side: "original" | "enhanced";
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onSelect: (change: ResumeChange) => void;
  selectedId?: string;
}

const CHANGE_TYPE_META = {
  Added: { label: "Added", bg: "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50", color: "text-emerald-700 dark:text-emerald-400" },
  Improved: { label: "Improved", bg: "bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50", color: "text-blue-700 dark:text-blue-400" },
  "Keyword Optimized": { label: "Keyword Optimized", bg: "bg-violet-50/70 border-violet-200 dark:bg-violet-950/20 dark:border-violet-900/50", color: "text-violet-700 dark:text-violet-400" },
  Reorganized: { label: "Reorganized", bg: "bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50", color: "text-amber-700 dark:text-amber-400" },
  Condensed: { label: "Condensed", bg: "bg-neutral-100 border-neutral-300 dark:bg-neutral-800/40 dark:border-neutral-700", color: "text-neutral-700 dark:text-neutral-300" }
};

function ResumePane({
  title, score, data, changes, side, scrollRef, onScroll, onSelect, selectedId
}: ResumePaneProps) {
  const isOrig = side === "original";
  
  const findChange = (text: string, sectionHint: string) => {
    if (!text) return null;
    const cleanText = text.trim().toLowerCase();
    return changes.find(c => {
      if (sectionHint && !c.section.toLowerCase().includes(sectionHint.toLowerCase())) {
        return false;
      }
      const matchText = isOrig ? c.original : c.enhanced;
      if (!matchText) return false;
      const cleanMatch = matchText.trim().toLowerCase();
      return cleanMatch.includes(cleanText) || cleanText.includes(cleanMatch);
    });
  };

  const renderBullet = (bullet: string, sectionHint: string, idx: number) => {
    const ch = findChange(bullet, sectionHint);
    const highlighted = Boolean(ch);
    const isSelected = ch && selectedId === ch.id;
    const meta = ch ? CHANGE_TYPE_META[ch.changeType] : null;

    return (
      <li 
        key={idx}
        onClick={() => ch && onSelect(ch)}
        className={`text-xs leading-relaxed transition-all pl-2.5 py-1.5 rounded relative ${
          highlighted && meta 
            ? `${meta.bg} border-l-2 ${isSelected ? "border-l-indigo-600 bg-indigo-50/30" : "border-l-indigo-400/50"} cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/20 my-1` 
            : "text-neutral-600 dark:text-neutral-450 list-disc ml-4"
        }`}
      >
        {bullet}
      </li>
    );
  };

  return (
    <div className={`border rounded-2xl p-6 shadow-sm bg-white dark:bg-neutral-950 flex flex-col h-[650px] ${
      isOrig ? "border-neutral-200 dark:border-neutral-900" : "border-emerald-500/30 bg-emerald-50/[0.01] dark:bg-emerald-950/[0.01]"
    }`}>
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-3 mb-4">
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-wider ${isOrig ? "text-neutral-500 dark:text-neutral-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {title}
          </h4>
          <div className="text-xs text-neutral-400 dark:text-neutral-450 mt-1">
            ATS Score: <span className="font-extrabold text-neutral-800 dark:text-neutral-200">{score}/100</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="space-y-4 overflow-y-auto pr-1 text-left font-sans text-xs text-neutral-750 dark:text-neutral-350 leading-relaxed flex-1 scrollbar-thin scroll-smooth"
      >
        {isOrig ? (
          <>
            {/* Header Info */}
            <div className="space-y-1 pb-1">
              <div className="text-lg font-bold text-neutral-950 dark:text-white">
                {data.personal?.name || data.name || "Candidate Name"}
              </div>
              <div className="text-neutral-450 text-[11px] flex flex-wrap gap-x-1.5 gap-y-0.5">
                {[
                  data.personal?.email || data.email,
                  data.personal?.phone || data.phone,
                  data.personal?.location || data.location,
                  data.personal?.linkedin || data.linkedin,
                  data.personal?.github || data.github
                ].filter(Boolean).map((info, i, arr) => (
                  <span key={i} className="inline-flex items-center">
                    {info}
                    {i < arr.length - 1 && <span className="ml-1.5 opacity-50">•</span>}
                  </span>
                ))}
              </div>
            </div>

        {/* Summary Section */}
        {data.summary && (
          <div className="border-t border-neutral-100 dark:border-neutral-900 pt-3">
            <div className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[9px] mb-1.5">
              Professional Summary
            </div>
            {(() => {
              const ch = findChange(data.summary, "summary");
              const highlighted = Boolean(ch);
              const isSelected = ch && selectedId === ch.id;
              const meta = ch ? CHANGE_TYPE_META[ch.changeType] : null;
              return (
                <p 
                  onClick={() => ch && onSelect(ch)}
                  className={`text-xs leading-relaxed p-2.5 rounded transition-all ${
                    highlighted && meta
                      ? `${meta.bg} border-l-2 ${isSelected ? "border-l-indigo-600 bg-indigo-50/30" : "border-l-indigo-400/50"} cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/20`
                      : "text-neutral-600 dark:text-neutral-450"
                  }`}
                >
                  {data.summary}
                </p>
              );
            })()}
          </div>
        )}

        {/* Experience Section */}
        {data.experience && data.experience.length > 0 && (
          <div className="border-t border-neutral-100 dark:border-neutral-900 pt-3">
            <div className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[9px] mb-2.5">
              Work Experience
            </div>
            <div className="space-y-4">
              {data.experience.map((exp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-baseline font-bold text-neutral-850 dark:text-neutral-200">
                    <span className="text-xs">{exp.position}</span>
                    <span className="text-[10px] text-neutral-400">{exp.startDate} – {exp.endDate || "Present"}</span>
                  </div>
                  <div className="flex justify-between items-baseline text-neutral-500 text-[11px] italic">
                    <span>{exp.company}</span>
                    <span>{exp.location}</span>
                  </div>
                  <ul className="space-y-0.5 pt-1">
                    {exp.bullets.map((bullet, bIdx) => renderBullet(bullet, "experience", bIdx))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Section */}
        {data.projects && data.projects.length > 0 && (
          <div className="border-t border-neutral-100 dark:border-neutral-900 pt-3">
            <div className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[9px] mb-2.5">
              Projects
            </div>
            <div className="space-y-4">
              {data.projects.map((proj, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex flex-col text-neutral-850 dark:text-neutral-200">
                    <span className="text-xs font-bold">{proj.name}</span>
                    {proj.description && <span className="text-[10px] text-neutral-400">{proj.description}</span>}
                  </div>
                  <ul className="space-y-0.5 pt-1">
                    {proj.bullets.map((bullet, bIdx) => renderBullet(bullet, "project", bIdx))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills Section */}
        {data.skills && data.skills.length > 0 && (
          <div className="border-t border-neutral-100 dark:border-neutral-900 pt-3">
            <div className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[9px] mb-2">
              Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((skill, sIdx) => {
                const ch = findChange(skill, "skills");
                const highlighted = Boolean(ch);
                const isSelected = ch && selectedId === ch.id;
                const meta = ch ? CHANGE_TYPE_META[ch.changeType] : null;
                return (
                  <span 
                    key={sIdx}
                    onClick={() => ch && onSelect(ch)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                      highlighted && meta
                        ? `${meta.bg} ${isSelected ? "border-indigo-600 ring-1 ring-indigo-600/20" : "border-indigo-200/50"} cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/20`
                        : "bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-850"
                    }`}
                  >
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Education Section */}
        {data.education && data.education.length > 0 && (
          <div className="border-t border-neutral-100 dark:border-neutral-900 pt-3">
            <div className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[9px] mb-2">
              Education
            </div>
            <div className="space-y-2">
              {data.education.map((edu, idx) => (
                <div key={idx} className="flex justify-between items-baseline">
                  <div>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 text-xs">{edu.degree}</span>
                    <span className="text-neutral-500 dark:text-neutral-450 text-xs">, {edu.school}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {edu.startDate || edu.endDate ? `${edu.startDate || ""} – ${edu.endDate || ""}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        ) : (
          <div className="origin-top scale-[0.8] sm:scale-90 md:scale-100 transition-transform flex justify-center py-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
            <ResumeDocument 
              data={data} 
              changes={changes} 
              selectedId={selectedId} 
              onSelect={onSelect} 
              isOrig={false} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

type ViewState = "landing" | "upload" | "dashboard" | "enhancing" | "enhanced";

export default function Home() {
  const [view, setView] = useState<ViewState>("landing");
  
  // File & Form inputs
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [additionalSkills, setAdditionalSkills] = useState<string[]>([]);
  
  // Loading & Error states
  const [loadingStep, setLoadingStep] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [aiUnavailable, setAiUnavailable] = useState(false);

  // Resume & Analysis Data
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisBundle | null>(null);
  
  // Enhanced Data
  const [enhancedData, setEnhancedData] = useState<EnhanceResponse | null>(null);
  const [enhancedAnalysis, setEnhancedAnalysis] = useState<AnalysisBundle | null>(null);
  const [violations, setViolations] = useState<string[]>([]);

  // Detailed views
  const [dashboardTab, setDashboardTab] = useState<"overview" | "keywords" | "issues">("overview");
  const [enhancedTab, setEnhancedTab] = useState<"compare" | "preview" | "violations">("compare");
  const [selectedChange, setSelectedChange] = useState<ResumeChange | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef<"left" | "right" | null>(null);

  const handleLeftScroll = () => {
    if (isScrolling.current && isScrolling.current !== "left") return;
    isScrolling.current = "left";
    if (leftScrollRef.current && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
    }
    setTimeout(() => { isScrolling.current = null; }, 50);
  };

  const handleRightScroll = () => {
    if (isScrolling.current && isScrolling.current !== "right") return;
    isScrolling.current = "right";
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
    }
    setTimeout(() => { isScrolling.current = null; }, 50);
  };

  // File drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (uploadedFile: File) => {
    setErrorMsg("");
    if (uploadedFile.type !== "application/pdf" && !uploadedFile.name.endsWith(".pdf")) {
      setErrorMsg("Please upload a PDF file only.");
      return;
    }
    if (uploadedFile.size > 10 * 1024 * 1024) {
      setErrorMsg("File exceeds the 10 MB limit.");
      return;
    }
    setFile(uploadedFile);
  };

  const removeFile = () => {
    setFile(null);
    setResumeData(null);
    setAnalysis(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Additional Skills tags builder
  const addSkillTag = () => {
    const clean = skillInput.trim();
    if (clean && !additionalSkills.includes(clean)) {
      setAdditionalSkills([...additionalSkills, clean]);
      setSkillInput("");
    }
  };

  const removeSkillTag = (index: number) => {
    setAdditionalSkills(additionalSkills.filter((_, i) => i !== index));
  };

  // 1. PDF Parsing & Initial Analysis
  const handleAnalyze = async () => {
    if (!file || !jobTitle.trim() || !jobDescription.trim()) return;
    
    setErrorMsg("");
    setView("enhancing"); // reuse the loading view for both transition stages
    setLoadingStep("Reading PDF resume...");
    
    try {
      // Step 1: Parse PDF
      setLoadingStep("Extracting resume text & detecting sections...");
      const parseRes = await fetch("/api/resume/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
        },
        body: file,
      });

      const parseData = await parseRes.json();
      if (!parseRes.ok || !parseData.ok) {
        throw new Error(parseData.error || "Failed to parse PDF resume.");
      }

      setResumeData(parseData.resume);

      // Step 2: Run ATS Analysis (locally in backend)
      setLoadingStep("Matching job keywords & calculating ATS score...");
      const analyzeRes = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: parseData.resume,
          job: {
            jobTitle,
            jobDescription,
            additionalSkills,
          }
        }),
      });

      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok || !analyzeData.ok) {
        throw new Error(analyzeData.error || "Failed to analyze resume.");
      }

      setAnalysis(analyzeData.originalAnalysis);
      // Save enhance data for later or go directly to dashboard
      // We go to Dashboard first, then user clicks "Enhance"
      setView("dashboard");
      setAiUnavailable(false);
    } catch (err: any) {
      setView("upload");
      setErrorMsg(err.message || "An error occurred during analysis.");
    }
  };

  // 2. Gemini AI Resume Enhancement
  const handleEnhance = async () => {
    if (!resumeData || !analysis) return;
    
    setErrorMsg("");
    setView("enhancing");
    setLoadingStep("Preparing resume context...");
    
    try {
      setLoadingStep("Enhancing resume with Gemini AI...");
      const enhanceRes = await fetch("/api/resume/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeData,
          job: {
            jobTitle,
            jobDescription,
            additionalSkills,
          }
        }),
      });

      const enhanceResult = await enhanceRes.json();
      if (!enhanceRes.ok || !enhanceResult.ok) {
        throw new Error(enhanceResult.error || "Gemini enhancement failed.");
      }

      setEnhancedData({
        enhancedResume: enhanceResult.enhancedResume,
        changes: enhanceResult.changes,
        recommendations: enhanceResult.recommendations
      });
      setEnhancedAnalysis(enhanceResult.enhancedAnalysis);
      setViolations(enhanceResult.violations || []);
      
      // Auto-select first change if available
      if (enhanceResult.changes && enhanceResult.changes.length > 0) {
        setSelectedChange(enhanceResult.changes[0]);
      }

      setView("enhanced");
    } catch (err: any) {
      setView("dashboard");
      setErrorMsg(err.message || "AI resume enhancement failed.");
    }
  };

  // 3. Download Resume PDF
  const downloadEnhancedPdf = async () => {
    if (!enhancedData) return;

    setLoadingStep("Generating ATS-friendly PDF...");
    try {
      // Single POST — generates and returns the PDF in one request.
      // Two-step POST+GET fails on Vercel (isolated serverless containers).
      const res = await fetch("/api/resume/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: enhancedData.enhancedResume }),
      });

      if (!res.ok) {
        let errMsg = "Failed to generate enhanced resume PDF.";
        try { const j = await res.json(); errMsg = j.error || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/pdf")) {
        throw new Error(`Unexpected server response: ${contentType}`);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error("PDF generation returned an empty file.");
      }

      const rawName = enhancedData.enhancedResume.personal?.name || enhancedData.enhancedResume.name || "Candidate";
      const cleanName = rawName.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") || "Candidate";
      const filename = `${cleanName}_Enhanced_Resume.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Defer revocation — browser needs time to start the download
      setTimeout(() => window.URL.revokeObjectURL(url), 10_000);

      setLoadingStep("");
    } catch (err: any) {
      alert(err.message || "PDF download failed.");
      setLoadingStep("");
    }
  };

  // 4. Download Report PDF
  const downloadReportPdf = async () => {
    if (!analysis || !enhancedAnalysis || !resumeData) return;

    try {
      const reportPayload = {
        name: resumeData.personal?.name || resumeData.name || "Candidate",
        jobTitle: jobTitle,
        originalScore: analysis.ats.score,
        enhancedScore: enhancedAnalysis.ats.score,
        screeningChance: enhancedAnalysis.screeningChance,
        breakdownOriginal: analysis.ats.breakdown,
        breakdownEnhanced: enhancedAnalysis.ats.breakdown,
        matchedKeywords: enhancedAnalysis.keywords.matched,
        missingKeywords: enhancedAnalysis.keywords.missing,
        weakKeywords: enhancedAnalysis.keywords.weak,
        positiveFactors: enhancedAnalysis.positiveFactors,
        negativeFactors: enhancedAnalysis.negativeFactors,
        issues: enhancedAnalysis.issues,
        changes: enhancedData?.changes || [],
        recommendations: enhancedData?.recommendations || [],
      };

      // Single POST — generates and returns the PDF in one request.
      // Two-step POST+GET fails on Vercel (isolated serverless containers).
      const res = await fetch("/api/resume/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportPayload),
      });

      if (!res.ok) {
        let errMsg = "Failed to generate ATS report PDF.";
        try { const j = await res.json(); errMsg = j.error || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Report PDF generation returned an empty file.");
      }

      const rawName = resumeData.personal?.name || resumeData.name || "Candidate";
      const cleanName = rawName.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") || "Candidate";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanName}_ATS_Analysis_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Defer revocation — browser needs time to start the download
      setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
    } catch (err: any) {
      alert(err.message || "Report PDF download failed.");
    }
  };

  // Render score color helper
  const getScoreColor = (score: number) => {
    if (score < 40) return "text-red-500 border-red-500 bg-red-500/10";
    if (score < 60) return "text-orange-500 border-orange-500 bg-orange-500/10";
    if (score < 75) return "text-yellow-500 border-yellow-500 bg-yellow-500/10";
    if (score < 90) return "text-green-500 border-green-500 bg-green-500/10";
    return "text-emerald-500 border-emerald-500 bg-emerald-500/10";
  };

  const getScoreClassification = (score: number) => {
    if (score < 40) return "Poor";
    if (score < 60) return "Needs Improvement";
    if (score < 75) return "Average";
    if (score < 90) return "Strong";
    return "Excellent";
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "Critical": return "text-red-600 bg-red-100 border-red-200 dark:bg-red-950/30 dark:border-red-900/50";
      case "High": return "text-orange-600 bg-orange-100 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50";
      case "Medium": return "text-yellow-600 bg-yellow-100 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900/50";
      default: return "text-blue-600 bg-blue-100 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50";
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      
      {/* 1. Landing View */}
      {view === "landing" && (
        <div className="relative">
          <BackgroundPaths 
            title="ResumeIQ AI Analyzer" 
            onGetStarted={() => setView("upload")} 
          />
        </div>
      )}

      {/* 2. Upload / Input View */}
      {view === "upload" && (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
                Analyze & Enhance Your Resume
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400">
                Upload your resume in PDF format and define your target job profile to begin ATS optimization.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column: Drag and Drop PDF */}
              <div className="space-y-4">
                <label className="text-sm font-semibold tracking-wider uppercase text-neutral-400">
                  Step 1: Upload Resume (PDF Only)
                </label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all min-h-[300px] cursor-pointer ${
                    dragActive 
                      ? "border-neutral-900 bg-neutral-100/50 dark:border-white dark:bg-neutral-900/50" 
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {!file ? (
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-neutral-400" />
                      </div>
                      <div>
                        <p className="font-medium">Drag & drop your PDF resume here</p>
                        <p className="text-xs text-neutral-400 mt-1">Maximum file size: 10MB</p>
                      </div>
                      <Button variant="outline" size="sm">Browse PDF</Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4 w-full">
                      <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="max-w-xs mx-auto truncate">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-200">{file.name}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          Replace
                        </Button>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Job Target Details */}
              <div className="space-y-4">
                <label className="text-sm font-semibold tracking-wider uppercase text-neutral-400">
                  Step 2: Target Job Details
                </label>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Target Job Title</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-sm"
                      placeholder="e.g. Frontend Developer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Job Description</label>
                    <textarea
                      rows={5}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-sm resize-none"
                      placeholder="Paste the complete job description here to analyze matched and missing keywords..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Additional Required Skills (Optional)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        className="flex-1 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-sm"
                        placeholder="e.g. Next.js, GraphQL"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkillTag())}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={addSkillTag}
                        className="px-3"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {additionalSkills.map((skill, index) => (
                        <span 
                          key={index} 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-medium"
                        >
                          {skill}
                          <button 
                            type="button" 
                            onClick={() => removeSkillTag(index)}
                            className="text-neutral-400 hover:text-neutral-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={!file || !jobTitle.trim() || !jobDescription.trim()}
                className="w-full md:w-auto px-12 py-6 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Analyze Resume
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3. Loading / Enhancing View */}
      {view === "enhancing" && (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
          <div className="space-y-6 text-center max-w-sm">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="mx-auto w-12 h-12 rounded-full border-4 border-neutral-300 border-t-neutral-900 dark:border-neutral-800 dark:border-t-white"
            />
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Processing Resume</h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm animate-pulse">
                {loadingStep}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Analysis Dashboard View */}
      {view === "dashboard" && analysis && (
        <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-850 pb-6">
              <div>
                <h1 className="text-3xl font-bold">{resumeData?.personal?.name || resumeData?.name || "Resume Analysis"}</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                  ATS audit against target role: <strong className="text-neutral-800 dark:text-neutral-200">{jobTitle}</strong>
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setView("upload")}>
                  Re-upload / Edit Target
                </Button>
                <Button 
                  onClick={handleEnhance} 
                  disabled={aiUnavailable}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 hover:opacity-90"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enhance Resume with Gemini AI
                </Button>
              </div>
            </div>

            {aiUnavailable && (
              <div className="p-4 border border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/20 rounded-xl text-yellow-800 dark:text-yellow-400 text-sm flex items-center gap-3">
                <Info className="w-5 h-5 flex-shrink-0 text-yellow-600" />
                <p>AI resume enhancement is temporarily unavailable. Your ATS analysis is still available.</p>
              </div>
            )}

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* ATS Score Card */}
              <div className="p-6 border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">ATS Compatibility Score</h3>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-5xl font-black">{analysis.ats.score}</span>
                    <span className="text-neutral-400 text-sm">/ 100</span>
                  </div>
                </div>
                <div className={`mt-4 px-3 py-1.5 rounded-lg border text-xs font-semibold text-center ${getScoreColor(analysis.ats.score)}`}>
                  {getScoreClassification(analysis.ats.score)}
                </div>
              </div>

              {/* Screening Chance Card */}
              <div className="p-6 border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Estimated Screening Chance</h3>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-5xl font-black">{analysis.screeningChance}%</span>
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-neutral-400 leading-normal italic">
                  Based on keyword matching & formatting checks. Not a hiring guarantee.
                </div>
              </div>

              {/* Keywords Card */}
              <div className="p-6 border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Keyword Match</h3>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-5xl font-black">
                      {analysis.keywords.matched.length}
                    </span>
                    <span className="text-neutral-400 text-sm">
                      / {analysis.keywords.matched.length + analysis.keywords.missing.length + analysis.keywords.weak.length}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-neutral-500">
                  {analysis.keywords.missing.length} missing critical terms.
                </div>
              </div>

              {/* Detected Issues Card */}
              <div className="p-6 border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Detected Issues</h3>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-5xl font-black text-red-500">
                      {analysis.issues.length}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-neutral-500">
                  {analysis.issues.filter(i => i.severity === "Critical" || i.severity === "High").length} critical problems.
                </div>
              </div>
            </div>

            {/* Tabbed details sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Navigation Tabs & Breakdown */}
              <div className="lg:col-span-1 space-y-6">
                <div className="flex border border-neutral-200 dark:border-neutral-900 rounded-xl p-1 bg-white dark:bg-neutral-950">
                  <button
                    onClick={() => setDashboardTab("overview")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      dashboardTab === "overview" 
                        ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm" 
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setDashboardTab("keywords")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      dashboardTab === "keywords" 
                        ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm" 
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    Keywords
                  </button>
                  <button
                    onClick={() => setDashboardTab("issues")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      dashboardTab === "issues" 
                        ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm" 
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    Issues ({analysis.issues.length})
                  </button>
                </div>

                {/* Score Breakdown (shows in overview) */}
                <div className="p-6 border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl space-y-4">
                  <h3 className="font-bold text-sm tracking-wide uppercase text-neutral-400">ATS Score Breakdown</h3>
                  
                  <div className="space-y-3.5">
                    {[
                      { label: "Keyword Match", score: analysis.ats.breakdown.keywordMatch, max: 30 },
                      { label: "Technical Skills", score: analysis.ats.breakdown.technicalSkills, max: 20 },
                      { label: "Experience Relevance", score: analysis.ats.breakdown.experienceRelevance, max: 15 },
                      { label: "Project Relevance", score: analysis.ats.breakdown.projectRelevance, max: 10 },
                      { label: "Resume Structure", score: analysis.ats.breakdown.resumeStructure, max: 10 },
                      { label: "Action Verbs", score: analysis.ats.breakdown.actionVerbs, max: 5 },
                      { label: "Quantified Achievements", score: analysis.ats.breakdown.quantifiedAchievements, max: 5 },
                      { label: "Formatting Compatibility", score: analysis.ats.breakdown.formattingCompatibility, max: 5 },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{item.label}</span>
                          <span className="text-neutral-400">{item.score} / {item.max}</span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-neutral-950 dark:bg-white h-full"
                            style={{ width: `${(item.score / item.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Tab Content */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Overview tab content */}
                {dashboardTab === "overview" && (
                  <div className="space-y-6">
                    {/* Key Positive/Negative Factors */}
                    <div className="p-6 border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl space-y-6">
                      <div>
                        <h3 className="font-bold text-sm tracking-wide uppercase text-neutral-400 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          Key Strengths & Positive Factors
                        </h3>
                        {analysis.positiveFactors.length > 0 ? (
                          <ul className="space-y-2">
                            {analysis.positiveFactors.map((f, i) => (
                              <li key={i} className="text-sm flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-neutral-400 italic">No significant strengths detected. Use Gemini AI to optimize your resume.</p>
                        )}
                      </div>

                      <div className="border-t border-neutral-150 dark:border-neutral-900 pt-6">
                        <h3 className="font-bold text-sm tracking-wide uppercase text-neutral-400 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          Key Weaknesses & Negative Factors
                        </h3>
                        {analysis.negativeFactors.length > 0 ? (
                          <ul className="space-y-2">
                            {analysis.negativeFactors.map((f, i) => (
                              <li key={i} className="text-sm flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-neutral-400 italic">No significant critical weaknesses detected.</p>
                        )}
                      </div>
                    </div>

                    <div className="p-6 border border-neutral-200 dark:border-neutral-900 bg-neutral-100/50 dark:bg-neutral-950/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="space-y-1 text-center md:text-left">
                        <h4 className="font-bold text-lg">Ready to improve your score?</h4>
                        <p className="text-sm text-neutral-500 max-w-md">
                          Optimize wording, integrate keywords naturally, structure bullet points, and fix structural issues using Gemini AI.
                        </p>
                      </div>
                      <Button 
                        onClick={handleEnhance} 
                        disabled={aiUnavailable}
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 hover:opacity-90 rounded-xl"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Enhance Resume
                      </Button>
                    </div>
                  </div>
                )}

                {/* Keywords tab content */}
                {dashboardTab === "keywords" && (
                  <div className="p-6 border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl space-y-6">
                    <div>
                      <h3 className="font-bold text-sm tracking-wide uppercase text-emerald-500 mb-3">
                        Matched Keywords ({analysis.keywords.matched.length})
                      </h3>
                      {analysis.keywords.matched.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {analysis.keywords.matched.map((kw, i) => (
                            <span key={i} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                              {kw}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-400 italic">No matched job keywords found.</p>
                      )}
                    </div>

                    <div className="border-t border-neutral-150 dark:border-neutral-900 pt-6">
                      <h3 className="font-bold text-sm tracking-wide uppercase text-red-500 mb-3">
                        Missing Keywords ({analysis.keywords.missing.length})
                      </h3>
                      {analysis.keywords.missing.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {analysis.keywords.missing.map((kw, i) => (
                            <span key={i} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs font-semibold animate-pulse">
                              {kw}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-400 italic">Excellent! No missing job keywords.</p>
                      )}
                    </div>

                    {analysis.keywords.weak.length > 0 && (
                      <div className="border-t border-neutral-150 dark:border-neutral-900 pt-6">
                        <h3 className="font-bold text-sm tracking-wide uppercase text-yellow-500 mb-3">
                          Weakly Represented Keywords ({analysis.keywords.weak.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {analysis.keywords.weak.map((kw, i) => (
                            <span key={i} className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400 text-xs font-semibold">
                              {kw}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                          These terms are present but lack sufficient context in experience or project bullets.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Issues tab content */}
                {dashboardTab === "issues" && (
                  <div className="space-y-4">
                    {analysis.issues.length > 0 ? (
                      analysis.issues.map((issue, idx) => (
                        <div 
                          key={idx} 
                          className="p-5 border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl flex flex-col md:flex-row gap-4"
                        >
                          <div className="flex-shrink-0">
                            <span className={`inline-flex px-2.5 py-1 border rounded-lg text-xs font-bold ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>
                          
                          <div className="space-y-2 flex-1">
                            <h4 className="font-bold text-base flex items-center gap-2">
                              <span>{issue.title}</span>
                              <span className="text-xs text-neutral-400 font-normal">({issue.section})</span>
                            </h4>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              {issue.description}
                            </p>
                            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 space-y-1">
                              <div><strong>Why it matters:</strong> {issue.whyItMatters}</div>
                              <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800/80 mt-1 text-neutral-800 dark:text-neutral-200">
                                <strong>Recommendation:</strong> {issue.recommendation}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl text-center text-neutral-500">
                        No critical issues detected in your resume formatting or structure!
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 5. Enhanced Results / Comparison View */}
      {view === "enhanced" && enhancedData && enhancedAnalysis && (
        <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            
            {/* Header controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-850 pb-6">
              <div>
                <h1 className="text-3xl font-bold">Optimization Complete!</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                  Review improvements, compare files side-by-side, and download the final PDF.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="outline" onClick={() => setView("dashboard")}>
                  Back to Dashboard
                </Button>
                <Button variant="outline" onClick={downloadReportPdf}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report PDF
                </Button>
                <Button onClick={downloadEnhancedPdf} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download Enhanced Resume PDF
                </Button>
              </div>
            </div>

            {/* Score Comparison Widget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl">
              <div className="flex flex-col justify-center items-center p-4 border-r border-neutral-100 dark:border-neutral-900">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Original Score</span>
                <span className="text-4xl font-extrabold mt-2 text-neutral-400">{analysis?.ats.score} / 100</span>
              </div>
              
              <div className="flex flex-col justify-center items-center p-4 border-r border-neutral-100 dark:border-neutral-900">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-bold text-emerald-500">Enhanced Score</span>
                <span className="text-4xl font-black mt-2 text-emerald-500">{enhancedAnalysis.ats.score} / 100</span>
              </div>

              <div className="flex flex-col justify-center items-center p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">ATS Score Gain</span>
                <span className="text-4xl font-black mt-2 text-violet-500">
                  +{enhancedAnalysis.ats.score - (analysis?.ats.score || 0)} Points
                </span>
              </div>
            </div>

            {/* Main Tabs */}
            <div className="flex border border-neutral-200 dark:border-neutral-900 rounded-xl p-1 bg-white dark:bg-neutral-950 w-full max-w-md mx-auto">
              <button
                onClick={() => setEnhancedTab("compare")}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  enhancedTab === "compare" 
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Compare Resumes
              </button>
              <button
                onClick={() => setEnhancedTab("preview")}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  enhancedTab === "preview" 
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Preview Enhanced Resume
              </button>
              <button
                onClick={() => setEnhancedTab("violations")}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  enhancedTab === "violations" 
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Safety Log
                {violations.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-bold">
                    {violations.length}
                  </span>
                )}
              </button>
            </div>

            {/* Render Tab Contents */}
            {enhancedTab === "compare" && (
              <div className="space-y-8">
                {/* Visual Legend */}
                <div className="flex flex-wrap gap-3 items-center justify-between p-4 border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/35 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-neutral-600 dark:text-neutral-350">Interactive Diff Viewer</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {(Object.keys(CHANGE_TYPE_META) as (keyof typeof CHANGE_TYPE_META)[]).map((t) => (
                      <span 
                        key={t} 
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${CHANGE_TYPE_META[t].bg} ${CHANGE_TYPE_META[t].color}`}
                      >
                        {CHANGE_TYPE_META[t].label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Side-by-side resume comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ResumePane
                    title="Original Resume"
                    score={analysis!.ats.score}
                    data={resumeData!}
                    changes={enhancedData.changes}
                    side="original"
                    scrollRef={leftScrollRef}
                    onScroll={handleLeftScroll}
                    onSelect={setSelectedChange}
                    selectedId={selectedChange?.id}
                  />
                  <ResumePane
                    title="AI-Enhanced Resume"
                    score={enhancedAnalysis.ats.score}
                    data={enhancedData.enhancedResume}
                    changes={enhancedData.changes}
                    side="enhanced"
                    scrollRef={rightScrollRef}
                    onScroll={handleRightScroll}
                    onSelect={setSelectedChange}
                    selectedId={selectedChange?.id}
                  />
                </div>

                {/* Selected Change Detail Card */}
                {selectedChange ? (
                  <div className="border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 p-6 rounded-2xl space-y-6 text-left">
                    <div className="flex items-center justify-between border-b border-neutral-105 dark:border-neutral-900 pb-4">
                      <div>
                        <h4 className="text-lg font-bold">Improvement Breakdown</h4>
                        <p className="text-xs text-neutral-400 mt-0.5">Section: <span className="font-semibold">{selectedChange.section}</span></p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider ${
                        selectedChange.changeType === "Added" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                        selectedChange.changeType === "Improved" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" :
                        selectedChange.changeType === "Keyword Optimized" ? "bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400" :
                        "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"
                      }`}>
                        {selectedChange.changeType}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-red-500/[0.02] border border-red-500/10 rounded-xl space-y-2">
                        <h5 className="text-xs font-bold text-red-500 uppercase tracking-wider">Original Text</h5>
                        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                          {selectedChange.original}
                        </p>
                      </div>

                      <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl space-y-2">
                        <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Optimized Text</h5>
                        <p className="text-sm leading-relaxed text-neutral-805 dark:text-neutral-100 font-medium">
                          {selectedChange.enhanced}
                        </p>
                      </div>
                    </div>

                    <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl space-y-3">
                      <div>
                        <h6 className="text-xs font-bold text-neutral-450 uppercase tracking-wider">Wording Rationale</h6>
                        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-350 mt-1 font-medium">
                          {selectedChange.reason}
                        </p>
                      </div>
                      
                      {selectedChange.targetKeywords && selectedChange.targetKeywords.length > 0 && (
                        <div className="pt-2 border-t border-neutral-200/50 dark:border-neutral-850/50 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-neutral-400 uppercase">Targeted Keywords:</span>
                          {selectedChange.targetKeywords.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 text-[10px] rounded font-semibold">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 p-8 rounded-2xl text-center text-neutral-400 text-sm">
                    💡 Click any highlighted text or bullet point inside the resumes above to inspect the improvement reason and keywords targeted.
                  </div>
                )}

                {/* Recommendations Widget */}
                {enhancedData.recommendations.length > 0 && (
                  <div className="border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 p-6 rounded-2xl space-y-4 text-left">
                    <h4 className="font-bold text-sm tracking-wide uppercase text-neutral-450">Recommended Skills to Build</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {enhancedData.recommendations.map((rec, i) => (
                        <div key={i} className="p-4 border border-neutral-100 dark:border-neutral-900 rounded-xl space-y-1">
                          <div className="font-bold text-sm flex items-center justify-between">
                            <span>{rec.title}</span>
                            {rec.relatedKeyword && (
                              <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-500 text-[9px] rounded font-semibold uppercase">
                                {rec.relatedKeyword}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 leading-normal">{rec.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {enhancedTab === "preview" && (
              <div className="border border-neutral-200 dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-900 p-8 rounded-2xl max-w-4xl mx-auto shadow-sm overflow-x-auto flex justify-center">
                <ResumeDocument 
                  data={enhancedData.enhancedResume} 
                  changes={enhancedData.changes} 
                  isOrig={false} 
                />
              </div>
            )}

            {enhancedTab === "violations" && (
              <div className="border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 p-6 rounded-2xl max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-900">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Anti-Hallucination Safety Log</h4>
                    <p className="text-xs text-neutral-500">How we kept the AI output factually accurate</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {violations.length > 0 ? (
                    violations.map((v, idx) => (
                      <div key={idx} className="p-3 border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{v}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/20 rounded-xl text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
                      <Check className="w-8 h-8 text-emerald-500 bg-emerald-100 dark:bg-emerald-950/50 rounded-full p-1.5" />
                      <span>Factual Integrity Pass! Gemini did not introduce any unverified factual claims.</span>
                    </div>
                  )}
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-850 text-xs text-neutral-400 leading-normal">
                  Our anti-hallucination validation engine cross-references the enhanced content against the original PDF resume. Any invented company name, dates, education institutions, or performance metrics ($ / % / numbers) are automatically caught and replaced back with original factual information before final preview or download.
                </div>
              </div>
            )}

          </motion.div>
        </div>
      )}

    </main>
  );
}
