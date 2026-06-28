"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Brain,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getQuizSessionAction, submitQuizAction } from "@/actions/quiz";

export default function ActiveQuizPage() {
  const params = useParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const id = params.id as string;

  // Quiz state
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Timer state
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSession = async () => {
    try {
      const res = await getQuizSessionAction(id);
      if (res.success && res.session) {
        setSession(res.session);
        setQuestions(res.session.questions || []);
        
        // Populate existing answers if resuming
        const initialAnswers: Record<string, string | null> = {};
        res.session.questions.forEach((q: any) => {
          if (q.answers && q.answers.length > 0) {
            initialAnswers[q.id] = q.answers[0].selectedAnswer;
          }
        });
        setSelectedAnswers(initialAnswers);

        if (res.session.status === "SUBMITTED" || res.session.status === "EVALUATED") {
          router.replace(`/dashboard/prep-quiz/report/${id}`);
          return;
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load quiz session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    // Start timer
    timerRef.current = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const handleSelectOption = (questionId: string, option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    const q = questions[currentIdx];
    setSelectedAnswers((prev) => ({
      ...prev,
      [q.id]: null, // Explicitly marked as skipped
    }));
    handleNext();
  };

  const handleSubmitQuiz = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setError("");

    // Prepare answers payload
    const answersPayload = questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : null,
    }));

    startTransition(async () => {
      try {
        const res = await submitQuizAction(id, {
          answers: answersPayload,
          durationSec: secondsElapsed,
        });

        if (res.success) {
          router.push(`/dashboard/prep-quiz/report/${id}`);
        } else {
          setError("Failed to evaluate quiz. Please try submitting again.");
        }
      } catch (err: any) {
        console.error("Quiz submission error:", err);
        setError(err.message || "Failed to submit answers.");
      }
    });
  };

  // Helper formatting for timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#4f46e5] animate-spin" />
        <p className="text-sm font-semibold text-gray-500">Loading quiz questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center p-6 bg-red-50 border border-red-200 rounded-3xl space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-red-800">Something Went Wrong</h3>
        <p className="text-xs text-red-700">{error}</p>
        <Button onClick={() => router.push("/dashboard/prep-quiz")} className="bg-red-650 hover:bg-red-750 text-white rounded-xl">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center p-6 bg-gray-50 border border-gray-200 rounded-3xl space-y-4">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
        <h3 className="text-base font-bold text-gray-800">No Questions Found</h3>
        <p className="text-xs text-gray-500">This quiz session doesn't contain any questions.</p>
        <Button onClick={() => router.push("/dashboard/prep-quiz")} className="bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const activeQuestion = questions[currentIdx];
  const optionsList: string[] = typeof activeQuestion.options === "string" 
    ? JSON.parse(activeQuestion.options) 
    : activeQuestion.options;

  const currentSelection = selectedAnswers[activeQuestion.id];
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  if (isPending) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#4f46e5] animate-spin" />
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">Evaluating Responses</h2>
          <p className="text-sm text-gray-500 mt-1">Gemini is analyzing your skills and preparing feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto w-full">
      {/* Quiz details card */}
      <Card className="liquid-glass border-gray-200 shadow-sm rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#4f46e5]/10 rounded-xl">
              <Brain className="w-5 h-5 text-[#4f46e5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-[15px] text-gray-900 leading-tight">
                {session?.title || "Preparation Quiz"}
              </h2>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5 inline-block">
                {session?.jobRole} • {session?.difficulty}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-gray-150 px-4 py-2 rounded-xl text-gray-700 font-bold text-xs">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>Time: {formatTime(secondsElapsed)}</span>
            <span className="text-gray-400 font-medium ml-1">/ {session?.estimatedTime}</span>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="mt-5 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>Progress: {progressPercent}%</span>
            <span>
              Answered {answeredCount} of {questions.length}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2 rounded-full" />
        </div>
      </Card>

      {/* Active Question card */}
      <Card className="liquid-glass border-gray-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-white/50 border-b border-gray-100 px-6 py-5">
          <span className="text-[10px] font-extrabold text-[#4f46e5] uppercase tracking-wider">
            Question {currentIdx + 1} of {questions.length}
          </span>
          <CardTitle className="text-gray-900 font-bold text-base sm:text-lg leading-snug mt-1.5">
            {activeQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-3">
            {optionsList.map((option, idx) => {
              const isSelected = currentSelection === option;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(activeQuestion.id, option)}
                  className={`group w-full flex items-start text-left px-5 py-4 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-[#4f46e5]/5 border-[#4f46e5] text-[#4f46e5]"
                      : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50/50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3.5 shrink-0 transition-colors ${
                    isSelected
                      ? "border-[#4f46e5] bg-[#4f46e5]"
                      : "border-gray-350 group-hover:border-gray-400 bg-white"
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="flex-1 leading-snug">{option}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={handleBack}
          disabled={currentIdx === 0}
          variant="outline"
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <div className="flex items-center gap-2">
          {currentSelection === undefined && (
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="px-4 py-2.5 rounded-full text-xs font-bold text-gray-500 hover:text-gray-800"
            >
              Skip
            </Button>
          )}

          {currentIdx === questions.length - 1 ? (
            <Button
              onClick={handleSubmitQuiz}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-2.5 font-bold shadow-sm shadow-emerald-500/10 text-xs"
            >
              Finish Assessment <CheckCircle2 className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={currentSelection === undefined}
              className="flex items-center gap-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-full px-6 py-2.5 font-bold shadow-sm shadow-[#4f46e5]/10 text-xs disabled:opacity-50"
            >
              Next Question <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
