"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, Play, ArrowRight, RefreshCw, Loader2, Award, CheckCircle2,
  MessageSquare, Volume2, VolumeX, ChevronDown, ChevronUp, History,
  Target, TrendingUp, AlertCircle, BookOpen, Sparkles, RotateCw, X
} from "lucide-react";
import {
  getInterviewUsage,
  startInterview,
  submitAnswer,
  generateFinalReport,
  getPastInterviews,
  type InterviewSettings,
  type QuestionEvaluation,
  type FinalReport,
  type PastInterview,
} from "@/actions/interview";

type InterviewState =
  | "settings"
  | "starting"
  | "questioning"
  | "evaluating"
  | "generating_next"
  | "submitting_report"
  | "results"
  | "error"
  | "history";

const JOB_ROLES = [
  "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
  "Software Engineer", "Mobile Developer (React Native)",
  "Data Engineer", "DevOps Engineer", "Machine Learning Engineer",
  "Product Engineer", "Software Development Engineer (SDE)"
];

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-500";
};
const BAR_COLOR = (score: number) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[12.5px] font-medium text-gray-600">{label}</span>
        <span className={`text-[13px] font-bold ${SCORE_COLOR(score)}`}>{score}/100</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${BAR_COLOR(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function MockInterviewPage() {
  const [state, setState] = useState<InterviewState>("settings");
  const [error, setError] = useState<string | null>(null);
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null);

  // Settings
  const [settings, setSettings] = useState<InterviewSettings>({
    jobRole: "Software Engineer",
    experienceLevel: "Fresher",
    interviewType: "Mixed",
    difficulty: "Medium",
    totalQuestions: 5,
  });

  // Interview state
  const [history, setHistory] = useState<{ role: "interviewer" | "candidate"; content: string; questionType?: string }[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [perQuestionEvals, setPerQuestionEvals] = useState<QuestionEvaluation[]>([]);
  const [lastEval, setLastEval] = useState<QuestionEvaluation | null>(null);
  const [showLastEval, setShowLastEval] = useState(false);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);

  // Voice
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const isListeningRef = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Usage & history
  const [usage, setUsage] = useState({ count: 0, limit: 5, hasReachedLimit: false });
  const [pastInterviews, setPastInterviews] = useState<PastInterview[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load usage on mount
  useEffect(() => {
    getInterviewUsage().then(setUsage).catch(() => {});
  }, []);

  // Init speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let finalT = "";
      let interimT = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalT += event.results[i][0].transcript;
        else interimT += event.results[i][0].transcript;
      }
      const transcript = (finalT + interimT).trim().toLowerCase();
      if (transcript && /\b(submit|done|next)\b/.test(transcript)) {
        document.getElementById("voice-submit-btn")?.click();
        return;
      }
      if (finalT) setCurrentAnswer(prev => prev + finalT + " ");
    };
    rec.onerror = () => { isListeningRef.current = false; setIsListening(false); };
    rec.onend = () => { isListeningRef.current = false; setIsListening(false); };
    setRecognition(rec);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history, state]);

  // Speak question
  const speak = useCallback((text: string) => {
    if (isMuted || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsAiSpeaking(true);
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.onend = () => setIsAiSpeaking(false);
    utt.onerror = () => setIsAiSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [isMuted]);

  const stopSpeech = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setIsAiSpeaking(false);
  };

  const toggleListening = () => {
    if (!recognition) return;
    if (isListeningRef.current) {
      recognition.stop();
      isListeningRef.current = false;
      setIsListening(false);
    } else {
      try {
        recognition.start();
        isListeningRef.current = true;
        setIsListening(true);
      } catch {}
    }
  };

  // ─── Start Interview ───────────────────────────────────────────────────────
  const handleStartInterview = async () => {
    if (usage.hasReachedLimit) {
      setError("You've reached the free interview limit. Please try again later.");
      setState("error");
      return;
    }

    setState("starting");
    setError(null);
    setHistory([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer("");
    setPerQuestionEvals([]);
    setLastEval(null);
    setFinalReport(null);
    stopSpeech();

    try {
      const { question, questionType } = await startInterview(settings);
      const firstMsg = { role: "interviewer" as const, content: question, questionType };
      setHistory([firstMsg]);
      setState("questioning");
      speak(question);
    } catch (err: any) {
      console.error("[Interview] Start failed:", err);
      setState("error");
      setError("Failed to start interview. Please check your connection and try again.");
      setRetryFn(() => handleStartInterview);
    }
  };

  // ─── Submit Answer ─────────────────────────────────────────────────────────
  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || state !== "questioning") return;
    stopSpeech();
    if (isListeningRef.current && recognition) {
      recognition.stop();
      isListeningRef.current = false;
      setIsListening(false);
    }

    const updatedHistory = [
      ...history,
      { role: "candidate" as const, content: currentAnswer.trim() }
    ];
    setHistory(updatedHistory);
    setState("evaluating");
    setCurrentAnswer("");

    try {
      const result = await submitAnswer({
        settings,
        history: updatedHistory,
        currentAnswer: currentAnswer.trim(),
        currentQuestionIndex,
      });

      const evals = [...perQuestionEvals, result.evaluation];
      setPerQuestionEvals(evals);
      setLastEval(result.evaluation);
      setShowLastEval(true);

      if (result.isFinished) {
        setState("submitting_report");
        const report = await generateFinalReport({
          settings,
          history: updatedHistory,
          perQuestionEvals: evals,
        });
        setFinalReport(report);
        setUsage(prev => ({ ...prev, count: prev.count + 1 }));
        setState("results");
      } else {
        setState("generating_next");
        const nextMsg = {
          role: "interviewer" as const,
          content: result.nextQuestion!,
          questionType: result.nextQuestionType,
        };
        setHistory(prev => [...prev, nextMsg]);
        setCurrentQuestionIndex(prev => prev + 1);
        setState("questioning");
        speak(result.nextQuestion!);
      }
    } catch (err: any) {
      console.error("[Interview] Submit failed:", err);
      // Restore history and answer so user can retry
      setHistory(history);
      setCurrentAnswer(updatedHistory[updatedHistory.length - 1]?.content || "");
      setState("error");
      setError("Failed to evaluate answer. Your response is saved — please retry.");
      setRetryFn(() => handleSubmitAnswer);
    }
  };

  // ─── Load history ──────────────────────────────────────────────────────────
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const past = await getPastInterviews();
      setPastInterviews(past);
    } catch {}
    setHistoryLoading(false);
  };

  const goToHistory = () => {
    setState("history");
    loadHistory();
  };

  // ─── Derived state ─────────────────────────────────────────────────────────
  const isLoading = ["starting", "evaluating", "generating_next", "submitting_report"].includes(state);
  const loadingMsg: Record<string, string> = {
    starting: "Customizing your interview...",
    evaluating: "Evaluating your answer...",
    generating_next: "Preparing the next question...",
    submitting_report: "Generating your performance report...",
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full pb-16">
      {/* Header */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
              <Mic className="h-6 w-6 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <h1 className="text-[clamp(1.3rem,3.5vw,2rem)] font-bold leading-tight tracking-tight text-white">
                AI Mock Interview
              </h1>
              <p className="text-slate-300 mt-1 text-[14px] font-medium">
                Real-time technical &amp; behavioral interviews scored by AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-slate-200">
              {usage.count}/{usage.limit} used
            </span>
            {state === "settings" && (
              <button
                onClick={goToHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 text-[12px] font-semibold transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Settings ──────────────────────────────────────────────── */}
        {state === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid md:grid-cols-[1fr_380px] gap-6"
          >
            {/* Left: Start card */}
            <div className="liquid-glass rounded-3xl min-h-[360px] flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-gray-300 gap-6">
              <div className="w-24 h-24 rounded-full bg-[#4f46e5]/10 flex items-center justify-center shadow-[0_0_0_8px_rgba(79,70,229,0.05)]">
                <Mic className="h-10 w-10 text-[#4f46e5]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Ready for your interview?</h3>
                <p className="text-gray-500 mt-2 text-[14px] max-w-sm mx-auto">
                  Configure your interview settings and click Start. The AI interviewer will ask questions one at a time.
                </p>
              </div>
              {usage.hasReachedLimit ? (
                <div className="px-6 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-[13px] font-semibold text-center">
                  Daily interview limit reached. Resets tomorrow.
                </div>
              ) : (
                <button
                  onClick={handleStartInterview}
                  className="group flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] font-semibold rounded-full pl-6 pr-2 py-2.5 transition-colors shadow-sm"
                >
                  <span>Start Interview</span>
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <Play className="w-4 h-4 text-[#4f46e5] ml-0.5" />
                  </div>
                </button>
              )}
            </div>

            {/* Right: Settings panel */}
            <div className="liquid-glass rounded-3xl p-6 space-y-5 h-fit">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Interview Settings
              </h3>

              <div>
                <label className="text-[12.5px] font-semibold text-gray-600 block mb-1.5">Job Role</label>
                <select
                  value={settings.jobRole}
                  onChange={e => setSettings(s => ({ ...s, jobRole: e.target.value }))}
                  className="w-full bg-white/60 border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
                >
                  {JOB_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[12.5px] font-semibold text-gray-600 block mb-1.5">Experience Level</label>
                <select
                  value={settings.experienceLevel}
                  onChange={e => setSettings(s => ({ ...s, experienceLevel: e.target.value as any }))}
                  className="w-full bg-white/60 border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
                >
                  <option>Fresher</option>
                  <option>0-1 years</option>
                  <option>1-3 years</option>
                </select>
              </div>

              <div>
                <label className="text-[12.5px] font-semibold text-gray-600 block mb-1.5">Interview Type</label>
                <select
                  value={settings.interviewType}
                  onChange={e => setSettings(s => ({ ...s, interviewType: e.target.value as any }))}
                  className="w-full bg-white/60 border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
                >
                  <option>Mixed</option>
                  <option>Technical</option>
                  <option>Behavioral</option>
                  <option>System Design</option>
                </select>
              </div>

              <div>
                <label className="text-[12.5px] font-semibold text-gray-600 block mb-1.5">Difficulty</label>
                <select
                  value={settings.difficulty}
                  onChange={e => setSettings(s => ({ ...s, difficulty: e.target.value as any }))}
                  className="w-full bg-white/60 border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>

              <div>
                <label className="text-[12.5px] font-semibold text-gray-600 block mb-1.5">
                  Number of Questions: <strong className="text-indigo-600">{settings.totalQuestions}</strong>
                </label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={settings.totalQuestions}
                  onChange={e => setSettings(s => ({ ...s, totalQuestions: Number(e.target.value) }))}
                  className="w-full accent-[#4f46e5]"
                />
                <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                  <span>3 (Quick)</span>
                  <span>10 (Full)</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Loading states ─────────────────────────────────────────── */}
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="liquid-glass rounded-3xl min-h-[320px] flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto"
          >
            <Loader2 className="w-12 h-12 text-[#4f46e5] animate-spin mb-4" />
            <h3 className="text-lg font-bold text-gray-900">{loadingMsg[state]}</h3>
            <p className="text-gray-500 mt-2 text-[14px]">This may take a few seconds...</p>
          </motion.div>
        )}

        {/* ── Questioning ────────────────────────────────────────────── */}
        {state === "questioning" && (
          <motion.div
            key="questioning"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="liquid-glass rounded-3xl p-4 sm:p-6 md:p-8 max-w-3xl mx-auto border border-gray-200 space-y-5"
          >
            {/* Progress */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-150">
              <span className="text-[11.5px] font-bold text-indigo-600 uppercase tracking-widest">
                Question {currentQuestionIndex + 1} of {settings.totalQuestions}
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-full uppercase animate-pulse">
                  Live
                </span>
                <span className="text-[11px] text-gray-500 font-medium">{settings.jobRole}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4f46e5] rounded-full transition-all duration-500"
                style={{ width: `${((currentQuestionIndex) / settings.totalQuestions) * 100}%` }}
              />
            </div>

            {/* Last evaluation pill (collapsed by default) */}
            {lastEval && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3">
                <button
                  onClick={() => setShowLastEval(!showLastEval)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                    <span className="text-[12.5px] font-semibold text-indigo-700">
                      Last answer scored: <strong>{lastEval.overallScore}/100</strong>
                    </span>
                  </div>
                  {showLastEval ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
                </button>
                {showLastEval && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                      {[
                        ["Technical", lastEval.technicalScore],
                        ["Communication", lastEval.communicationScore],
                        ["Relevance", lastEval.relevanceScore],
                        ["Confidence", lastEval.confidenceScore],
                      ].map(([label, score]) => (
                        <div key={label as string} className="flex justify-between">
                          <span className="text-gray-500">{label}</span>
                          <span className={`font-bold ${SCORE_COLOR(score as number)}`}>{score}/100</span>
                        </div>
                      ))}
                    </div>
                    {lastEval.strengths.length > 0 && (
                      <p className="text-[11.5px] text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1">
                        ✓ {lastEval.strengths[0]}
                      </p>
                    )}
                    {lastEval.improvement && (
                      <p className="text-[11.5px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                        💡 {lastEval.improvement}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Chat bubbles */}
            <div
              className="space-y-3 max-h-[260px] overflow-y-auto pr-2 pb-2 scroll-smooth min-h-[80px]"
              ref={chatContainerRef}
            >
              {history.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "interviewer" ? "justify-start" : "justify-end"} animate-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`max-w-[80%] rounded-2xl p-3.5 text-[13.5px] leading-relaxed shadow-sm ${
                    msg.role === "interviewer"
                      ? "bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tl-none"
                      : "bg-[#4f46e5] text-white rounded-tr-none"
                  }`}>
                    <div className="text-[9.5px] font-bold uppercase tracking-wider mb-1 opacity-60">
                      {msg.role === "interviewer" ? `AI Interviewer${msg.questionType ? ` · ${msg.questionType}` : ""}` : "You"}
                    </div>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Answer input */}
            <div className="space-y-3 pt-4 border-t border-gray-150">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-gray-700">Your Answer</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setIsMuted(!isMuted); if (!isMuted) stopSpeech(); }}
                    className={`p-1.5 rounded-full border text-[10px] font-bold flex items-center gap-1 transition-colors ${
                      isMuted ? "bg-red-50 border-red-200 text-red-600" : "bg-indigo-50 border-indigo-200 text-indigo-600"
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => { setIsVoiceMode(!isVoiceMode); }}
                    className="px-2.5 py-1 rounded-full border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                  >
                    {isVoiceMode ? <MessageSquare className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    {isVoiceMode ? "Type" : "Voice"}
                  </button>
                </div>
              </div>

              {isVoiceMode ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <button
                    onClick={toggleListening}
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                      isListening
                        ? "bg-emerald-50 border-emerald-300 shadow-lg shadow-emerald-200/50"
                        : "bg-white border-gray-300 hover:border-indigo-300"
                    }`}
                  >
                    <Mic className={`w-8 h-8 ${isListening ? "text-emerald-600 animate-pulse" : "text-gray-500"}`} />
                  </button>
                  <p className="text-[12px] text-gray-500 text-center">
                    {isListening ? "Listening... say \"Submit\" or \"Done\" to proceed" : "Tap to start recording"}
                  </p>
                  {currentAnswer && (
                    <div className="w-full bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[13px] text-slate-700 italic max-h-[100px] overflow-y-auto">
                      "{currentAnswer}"
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  value={currentAnswer}
                  onChange={e => setCurrentAnswer(e.target.value)}
                  rows={4}
                  placeholder="Type your answer here..."
                  className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-transparent transition-all placeholder:text-gray-400 resize-none"
                />
              )}

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  onClick={() => { stopSpeech(); setState("settings"); }}
                  className="text-[13px] text-gray-500 hover:text-gray-700 font-semibold transition-colors"
                >
                  Quit Interview
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">
                    {currentAnswer.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                  <button
                    id="voice-submit-btn"
                    onClick={handleSubmitAnswer}
                    disabled={!currentAnswer.trim()}
                    className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13.5px] font-semibold rounded-full px-6 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <span>{currentQuestionIndex >= settings.totalQuestions - 1 ? "Finish & Evaluate" : "Submit Answer"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Error state ────────────────────────────────────────────── */}
        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="liquid-glass rounded-3xl p-8 max-w-2xl mx-auto flex flex-col items-center gap-5 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Something went wrong</h3>
              <p className="text-gray-500 mt-2 text-[14px]">{error}</p>
            </div>
            <div className="flex gap-3">
              {retryFn && (
                <button
                  onClick={() => { setState(history.length > 0 ? "questioning" : "settings"); retryFn(); }}
                  className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold rounded-full px-6 py-2.5 text-[14px] transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                  Retry
                </button>
              )}
              <button
                onClick={() => setState("settings")}
                className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-full px-6 py-2.5 text-[14px] transition-colors"
              >
                Start Over
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Results ────────────────────────────────────────────────── */}
        {state === "results" && finalReport && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Title */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Mock Interview Results</h2>
              <p className="text-gray-500 mt-1 text-[14px]">
                {settings.jobRole} · {settings.interviewType} · {settings.difficulty}
              </p>
            </div>

            {/* Score cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Overall Score", value: finalReport.overallScore, color: "text-[#4f46e5]", barColor: "bg-[#4f46e5]" },
                { label: "Technical", value: finalReport.technicalScore, color: SCORE_COLOR(finalReport.technicalScore), barColor: BAR_COLOR(finalReport.technicalScore) },
                { label: "Communication", value: finalReport.communicationScore, color: SCORE_COLOR(finalReport.communicationScore), barColor: BAR_COLOR(finalReport.communicationScore) },
                { label: "Problem Solving", value: finalReport.problemSolvingScore, color: SCORE_COLOR(finalReport.problemSolvingScore), barColor: BAR_COLOR(finalReport.problemSolvingScore) },
                { label: "Relevance", value: finalReport.relevanceScore, color: SCORE_COLOR(finalReport.relevanceScore), barColor: BAR_COLOR(finalReport.relevanceScore) },
                { label: "Confidence", value: finalReport.confidenceScore, color: SCORE_COLOR(finalReport.confidenceScore), barColor: BAR_COLOR(finalReport.confidenceScore) },
              ].map(({ label, value, color, barColor }) => (
                <div key={label} className="liquid-glass-light rounded-2xl p-5">
                  <h3 className="text-[11.5px] text-gray-500 font-semibold uppercase tracking-wider">{label}</h3>
                  <div className={`text-4xl font-extrabold mt-2 ${color}`}>
                    {value}<span className="text-sm font-normal text-gray-400">/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Hiring readiness */}
            <div className="liquid-glass-light rounded-3xl p-6 flex items-center gap-6">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2a16 16 0 1 1 0 32A16 16 0 0 1 18 2" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                  <path
                    d="M18 2a16 16 0 1 1 0 32A16 16 0 0 1 18 2"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3.5"
                    strokeDasharray={`${(finalReport.hiringReadiness / 100) * 100.5} 100.5`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[17px] font-extrabold text-[#4f46e5]">{finalReport.hiringReadiness}%</span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Hiring Readiness</h3>
                <p className="text-[13px] text-gray-500 mt-1 max-w-sm">
                  AI assessment of your interview performance. This is not a guarantee of employment but reflects your preparedness level based on this session.
                </p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Strong areas */}
              <div className="liquid-glass-light rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-gray-900">Strong Areas</h3>
                </div>
                <div className="space-y-2.5">
                  {finalReport.strongAreas.map((area, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="w-5 h-5 shrink-0 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-[10px] font-bold mt-0.5">✓</div>
                      <p className="text-[13.5px] text-gray-700 font-medium">{area}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weak areas */}
              <div className="liquid-glass-light rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <Target className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-gray-900">Areas to Improve</h3>
                </div>
                <div className="space-y-2.5">
                  {finalReport.weakAreas.map((area, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="w-5 h-5 shrink-0 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-[10px] font-bold mt-0.5">!</div>
                      <p className="text-[13.5px] text-gray-700 font-medium">{area}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Improvements */}
              <div className="liquid-glass-light rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <Award className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-gray-900">Recommended Improvements</h3>
                </div>
                <div className="space-y-2.5">
                  {finalReport.improvements.map((imp, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="text-[11px] font-bold text-indigo-500 mt-0.5 min-w-[16px]">{idx + 1}.</span>
                      <p className="text-[13.5px] text-gray-700">{imp}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practice suggestions */}
              <div className="liquid-glass-light rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  <h3 className="font-bold text-gray-900">Questions to Practice</h3>
                </div>
                <div className="space-y-2.5">
                  {finalReport.practiceSuggestions.map((tip, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="w-5 h-5 shrink-0 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 text-[10px] font-bold mt-0.5">→</div>
                      <p className="text-[13.5px] text-gray-700">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setState("settings")}
                className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold rounded-full px-8 py-3 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Try Another Interview
              </button>
              <button
                onClick={goToHistory}
                className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-full px-8 py-3 transition-colors"
              >
                <History className="w-4 h-4" />
                View History
              </button>
            </div>
          </motion.div>
        )}

        {/* ── History ────────────────────────────────────────────────── */}
        {state === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-5 max-w-3xl mx-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                Interview History
              </h2>
              <button
                onClick={() => setState("settings")}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              </div>
            ) : pastInterviews.length === 0 ? (
              <div className="liquid-glass rounded-3xl p-10 text-center">
                <Mic className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-700">No interviews yet</h3>
                <p className="text-gray-400 text-[13px] mt-1">Complete your first interview to see results here.</p>
                <button
                  onClick={() => setState("settings")}
                  className="mt-5 bg-[#4f46e5] text-white rounded-full px-6 py-2.5 text-[14px] font-semibold hover:bg-[#4338ca] transition-colors"
                >
                  Start Interview
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {pastInterviews.map((interview, idx) => (
                  <div key={interview.id || idx} className="liquid-glass rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h4 className="font-bold text-gray-900">{interview.settings.jobRole}</h4>
                        <p className="text-[12px] text-gray-500 mt-0.5">
                          {interview.settings.interviewType} · {interview.settings.difficulty} ·{" "}
                          {new Date(interview.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-[#4f46e5]">{interview.overallScore}/100</div>
                        <div className="text-[11px] text-gray-400">Overall score</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <ScoreBar label="Technical" score={interview.technicalScore} />
                      <ScoreBar label="Communication" score={interview.communicationScore} />
                      <ScoreBar label="Confidence" score={interview.confidenceScore} />
                    </div>
                    {interview.questions.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase mb-1.5">Sample Questions Asked</p>
                        <div className="space-y-1">
                          {interview.questions.slice(0, 2).map((q, qi) => (
                            <p key={qi} className="text-[12.5px] text-gray-600 italic truncate">"{q}"</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
