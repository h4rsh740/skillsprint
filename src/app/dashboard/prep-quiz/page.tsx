"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Sliders,
  Calendar,
  CheckCircle,
  Plus,
  ArrowRight,
  Loader2,
  Brain,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  generateQuizAction,
  listQuizSessionsAction,
  listUserResumesAction,
} from "@/actions/quiz";
import { analyzeResume } from "@/actions/resume";

export default function PrepQuizPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [resumes, setResumes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [error, setError] = useState("");

  // Form parameters
  const [jobRole, setJobRole] = useState("Frontend Developer");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "EXTREME">("MEDIUM");
  const [quizType, setQuizType] = useState<"TECHNICAL" | "HR" | "MIXED" | "PROJECT_BASED">("MIXED");
  const [questionCount, setQuestionCount] = useState(10);
  const [resumeId, setResumeId] = useState("");

  // Resume Upload State
  const [resumeTab, setResumeTab] = useState<"existing" | "upload">("existing");
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", file);
      
      const analysisResult = await analyzeResume(formData);
      
      // Reload resumes list
      const resumesRes = await listUserResumesAction();
      if (resumesRes.success) {
        setResumes(resumesRes.resumes || []);
        
        // Find the newly created resume file
        const sorted = (resumesRes.resumes || []).sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        if (sorted.length > 0) {
          setResumeId(sorted[0].id);
          
          // Pre-populate target job role if possible
          let suggestions: any = sorted[0].suggestions || analysisResult;
          if (typeof suggestions === "string") {
            try { suggestions = JSON.parse(suggestions); } catch (err) {}
          }
          
          const parsedSignals = suggestions?.extractedSignals || [];
          if (parsedSignals.length > 0) {
            if (parsedSignals.some((s: string) => s.toLowerCase().includes("security") || s.toLowerCase().includes("cyber") || s.toLowerCase().includes("penetration") || s.toLowerCase().includes("infosec"))) {
              setJobRole("Cybersecurity Analyst");
            } else if (parsedSignals.some((s: string) => s.toLowerCase().includes("react") || s.toLowerCase().includes("frontend") || s.toLowerCase().includes("css") || s.toLowerCase().includes("html"))) {
              setJobRole("Frontend Developer");
            } else if (parsedSignals.some((s: string) => s.toLowerCase().includes("node") || s.toLowerCase().includes("backend") || s.toLowerCase().includes("database") || s.toLowerCase().includes("sql"))) {
              setJobRole("Backend Developer");
            } else if (parsedSignals.some((s: string) => s.toLowerCase().includes("data") || s.toLowerCase().includes("ml") || s.toLowerCase().includes("ai") || s.toLowerCase().includes("scientist") || s.toLowerCase().includes("python"))) {
              setJobRole("Data Scientist");
            } else if (parsedSignals.some((s: string) => s.toLowerCase().includes("full") || s.toLowerCase().includes("stack"))) {
              setJobRole("Full Stack Developer");
            }
          }
        }
      }
      
      setResumeTab("existing");
    } catch (err: any) {
      console.error("Failed to upload/analyze resume:", err);
      setError(err.message || "Failed to parse resume.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const loadData = async () => {
    try {
      const [resumesRes, historyRes] = await Promise.all([
        listUserResumesAction(),
        listQuizSessionsAction(),
      ]);

      if (resumesRes.success) {
        setResumes(resumesRes.resumes || []);
      }
      if (historyRes.success) {
        setHistory(historyRes.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load page data:", err);
      setError("Failed to fetch prior attempts or resumes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const res = await generateQuizAction({
          jobRole,
          difficulty,
          quizType,
          questionCount,
          resumeId: resumeId || undefined,
        });

        if (res.success && res.session) {
          router.push(`/dashboard/prep-quiz/${res.session.id}`);
        } else {
          setError("Failed to generate quiz. Please check configuration and try again.");
        }
      } catch (err: any) {
        console.error("Failed to generate quiz:", err);
        setError(err.message || "Failed to generate quiz. Check Gemini key configuration.");
      }
    });
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4f46e5] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      {/* Banner */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <Trophy className="h-6 w-6 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white flex items-center gap-3">
              Prep Quizzes
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              Validate your knowledge with custom AI-generated assessments tailored to your resume.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Practice Arena</h2>
          <p className="text-gray-500 text-sm mt-0.5">Test your concepts or review previous attempts</p>
        </div>
        {!showGenerator && (
          <Button onClick={() => setShowGenerator(true)} className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-full px-5 py-2.5 shadow-sm shadow-[#4f46e5]/10">
            <Plus className="w-4 h-4" /> New Quiz
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Generator Wizard form */}
      {showGenerator && (
        <Card className="liquid-glass border-gray-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-white/50 px-6 py-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#4f46e5]" />
                <CardTitle className="text-gray-900 font-bold text-lg">Configure AI Quiz</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowGenerator(false)} className="text-gray-500 hover:text-gray-800">
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Select/Upload Resume */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Tailor Resume Profile (Optional)
                    </label>
                    <div className="flex p-0.5 bg-gray-100 rounded-lg text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setResumeTab("existing")}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          resumeTab === "existing"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        Select Saved
                      </button>
                      <button
                        type="button"
                        onClick={() => setResumeTab("upload")}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          resumeTab === "upload"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        Upload New
                      </button>
                    </div>
                  </div>

                  {resumeTab === "existing" ? (
                    <select
                      className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10 transition-all duration-200 cursor-pointer animate-in fade-in duration-200"
                      value={resumeId}
                      onChange={(e) => setResumeId(e.target.value)}
                    >
                      <option value="">No Resume Profile (Use Profile Skills Only)</option>
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.fileName} (Extracted {new Date(r.createdAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50/50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100/50 transition-colors animate-in fade-in duration-200 min-h-[46px]">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                        onChange={handleResumeUpload}
                      />
                      {isUploadingResume ? (
                        <div className="flex items-center gap-2 py-1.5">
                          <Loader2 className="w-4 h-4 text-[#4f46e5] animate-spin" />
                          <span className="text-xs font-semibold text-gray-600">Analyzing Resume with AI...</span>
                        </div>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-1.5"
                        >
                          <span className="text-xs font-bold text-[#4f46e5] hover:underline">Click to upload resume</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">PDF, DOCX, TXT (Max 5MB)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Job Role */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Target Job Role
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. React Developer"
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10 transition-all duration-200"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Difficulty */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Difficulty Level</label>
                  <select
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10 transition-all duration-200 cursor-pointer"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                  >
                    <option value="EASY">Easy (Conceptual)</option>
                    <option value="MEDIUM">Medium (Intermediate/Scenario)</option>
                    <option value="HARD">Hard (Advanced architecture/SDE-3)</option>
                    <option value="EXTREME">🔥 Extreme Hardcore Mode (Expert SDE-4/Principal)</option>
                  </select>
                </div>

                {/* Quiz Type */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Assessment Category</label>
                  <select
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10 transition-all duration-200 cursor-pointer"
                    value={quizType}
                    onChange={(e) => setQuizType(e.target.value as any)}
                  >
                    <option value="TECHNICAL">Technical Questions Only</option>
                    <option value="HR">Behavioral / HR Only</option>
                    <option value="MIXED">Mixed (Technical & HR)</option>
                    <option value="PROJECT_BASED">Project-Based Scenarios</option>
                  </select>
                </div>

                {/* Question Count */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Number of Questions</label>
                  <select
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10 transition-all duration-200 cursor-pointer"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  >
                    <option value={5}>5 Questions (Express)</option>
                    <option value={10}>10 Questions (Standard)</option>
                    <option value={15}>15 Questions (Thorough)</option>
                    <option value={20}>20 Questions (Mock Marathon)</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl py-3.5 shadow-sm shadow-[#4f46e5]/10 font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Forging Quiz Questions (Gemini)...
                  </>
                ) : (
                  <>
                    Forge Quiz Arena <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Attempts History */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-4.5 h-4.5 text-gray-500" /> Attempt History
        </h3>
        {history.length === 0 ? (
          <div className="liquid-glass border-gray-200 p-12 text-center text-gray-400 rounded-3xl">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-30 text-gray-600 animate-pulse" />
            <p className="text-sm font-semibold">You haven't completed any quizzes yet.</p>
            <p className="text-xs text-gray-500 mt-1">Click "New Quiz" to generate an assessment.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {history.map((s) => (
              <Card key={s.id} className="liquid-glass border-gray-200 p-6 flex flex-col justify-between rounded-2xl shadow-sm hover:scale-[1.01] transition-transform duration-300">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-[15px] text-gray-800 line-clamp-1">{s.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize font-medium">
                        {s.quizType.toLowerCase().replace("_", " ")} • {s.difficulty.toLowerCase()}
                      </p>
                    </div>
                    <Badge className={
                      s.status === "EVALUATED" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-50 rounded-full font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5" 
                        : "bg-amber-50 text-amber-700 border-amber-250 hover:bg-amber-50 rounded-full font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5"
                    }>
                      {s.status.toLowerCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] font-semibold text-gray-500">
                    <span>Questions: {s.questionCount}</span>
                    <span>Date: {new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4">
                  {s.status === "EVALUATED" && s.score !== null ? (
                    <div className="flex items-center justify-between bg-[#4f46e5]/5 rounded-xl p-3 border border-[#4f46e5]/10">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-[#4f46e5] uppercase tracking-wider font-extrabold">
                          Overall Score
                        </span>
                        <p className="text-base font-black text-[#4f46e5]">{s.score}%</p>
                      </div>
                      <Button onClick={() => router.push(`/dashboard/prep-quiz/report/${s.id}`)} className="bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg text-xs px-4 py-2 font-bold">
                        View Report
                      </Button>
                    </div>
                  ) : s.status === "GENERATED" || s.status === "IN_PROGRESS" ? (
                    <Button onClick={() => router.push(`/dashboard/prep-quiz/${s.id}`)} className="w-full flex items-center justify-center gap-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg text-xs py-2 font-bold">
                      Resume Test <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <div className="text-xs italic text-amber-600 bg-amber-50 rounded-lg p-2 text-center border border-amber-100 font-semibold">
                      Awaiting Evaluation
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
