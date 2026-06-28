"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Trophy,
  Brain,
  Sliders,
  Calendar,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Award,
  BookOpen,
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getQuizSessionAction, getQuizReportAction } from "@/actions/quiz";

export default function QuizReportPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [sessionRes, reportRes] = await Promise.all([
        getQuizSessionAction(id),
        getQuizReportAction(id)
      ]);

      if (sessionRes.success) {
        setSession(sessionRes.session);
      }
      if (reportRes.success) {
        setReport(reportRes.report);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load scorecard details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#4f46e5] animate-spin" />
        <p className="text-sm font-semibold text-gray-500">Generating scorecard reports...</p>
      </div>
    );
  }

  if (error || !session || !report) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center p-6 bg-red-50 border border-red-200 rounded-3xl space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-red-800">Scorecard Not Available</h3>
        <p className="text-xs text-red-700">{error || "Ensure the quiz has been completed and evaluated."}</p>
        <Button onClick={() => router.push("/dashboard/prep-quiz")} className="bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Parse arrays/objects from report fields
  const parseJSON = (str: string, fallback: any = []) => {
    try {
      return str ? JSON.parse(str) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const strengths = parseJSON(report.strengths);
  const weaknesses = parseJSON(report.weaknesses);
  const skillGaps = parseJSON(report.skillGaps);
  const improvements = parseJSON(report.improvements);
  const roadmap = parseJSON(report.roadmap);
  const recommendedProjects = parseJSON(report.recommendedProjects);
  const recommendedCertifications = parseJSON(report.recommendedCertifications);
  const recommendedCourses = parseJSON(report.recommendedCourses);
  const careerAdvice = parseJSON(report.careerAdvice);

  const correctAnswersCount = session.correctCount ?? 0;
  const totalQuestionsCount = session.totalCount ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto w-full">
      {/* Back button & title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/dashboard/prep-quiz")}
            variant="outline"
            className="w-10 h-10 rounded-full border-gray-200 p-0 flex items-center justify-center hover:bg-gray-50 text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-gray-900 leading-snug">
              Quiz Evaluation Report
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Scorecard analysis and career preparation roadmap
            </p>
          </div>
        </div>

        <Button
          onClick={() => router.push("/dashboard/prep-quiz")}
          className="bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-full font-bold text-xs px-5 py-2.5 shadow-sm shadow-[#4f46e5]/10"
        >
          Practice Arena
        </Button>
      </div>

      {/* Overview stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="liquid-glass border-gray-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <h3 className="text-[11px] text-gray-500 font-extrabold uppercase tracking-wider">Overall Score</h3>
          <div className="text-3xl font-black text-[#4f46e5] mt-3">
            {report.score}%
            <span className="text-xs font-semibold text-gray-400 ml-1">/ 100</span>
          </div>
          <div className="h-1.5 w-full bg-gray-150 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-[#4f46e5] rounded-full" style={{ width: `${report.score}%` }} />
          </div>
        </Card>

        <Card className="liquid-glass border-gray-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <h3 className="text-[11px] text-gray-500 font-extrabold uppercase tracking-wider">Readiness Index</h3>
          <div className="text-3xl font-black text-indigo-700 mt-3">
            {report.readiness}%
            <span className="text-xs font-semibold text-gray-400 ml-1">/ 100</span>
          </div>
          <div className="h-1.5 w-full bg-gray-150 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${report.readiness}%` }} />
          </div>
        </Card>

        <Card className="liquid-glass border-gray-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <h3 className="text-[11px] text-gray-500 font-extrabold uppercase tracking-wider">Accuracy</h3>
          <div className="text-3xl font-black text-emerald-600 mt-3">
            {correctAnswersCount}
            <span className="text-sm font-semibold text-gray-400 ml-1">/ {totalQuestionsCount} Correct</span>
          </div>
          <div className="h-1.5 w-full bg-gray-150 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalQuestionsCount > 0 ? (correctAnswersCount / totalQuestionsCount) * 100 : 0}%` }} />
          </div>
        </Card>

        <Card className="liquid-glass border-gray-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <h3 className="text-[11px] text-gray-500 font-extrabold uppercase tracking-wider">Parameters</h3>
          <div className="mt-3">
            <p className="text-[13px] font-bold text-gray-800 truncate">{session.jobRole}</p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5 capitalize">
              {session.quizType.toLowerCase()} • {session.difficulty.toLowerCase()}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Analysis and Roadmap Split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
        {/* Left Column Tabs */}
        <Card className="liquid-glass border-gray-200 shadow-sm rounded-3xl overflow-hidden">
          <Tabs defaultValue="strengths" className="w-full">
            <TabsList className="w-full bg-gray-50 border-b border-gray-150 rounded-none p-1 justify-start h-12">
              <TabsTrigger value="strengths" className="font-bold text-xs uppercase tracking-wider px-5 rounded-xl cursor-pointer">
                Strengths & Gaps
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="font-bold text-xs uppercase tracking-wider px-5 rounded-xl cursor-pointer">
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="advice" className="font-bold text-xs uppercase tracking-wider px-5 rounded-xl cursor-pointer">
                Career Advice
              </TabsTrigger>
            </TabsList>

            {/* Strengths & Gaps */}
            <TabsContent value="strengths" className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Verified Strengths</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {strengths.map((str: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-[13px] font-semibold text-gray-700 leading-snug">{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Identified Gaps & Weaknesses</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {weaknesses.map((weak: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-[13px] font-semibold text-gray-700 leading-snug">{weak}</span>
                    </div>
                  ))}
                </div>
              </div>

              {skillGaps.length > 0 && (
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Immediate Actions Needed</h3>
                  <ul className="list-disc pl-5 text-[13px] text-gray-600 space-y-1.5 font-medium">
                    {skillGaps.map((gap: string, i: number) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            {/* Recommendations */}
            <TabsContent value="recommendations" className="p-6 space-y-6">
              {recommendedProjects.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#4f46e5]" /> Tailored Portfolio Projects
                  </h3>
                  <div className="space-y-2.5">
                    {recommendedProjects.map((proj: string, i: number) => (
                      <div key={i} className="p-3 bg-white border border-gray-200 rounded-xl shadow-xs text-[13px] font-bold text-gray-800 flex items-center gap-2.5">
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{proj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-500" /> Recommended Courses
                  </h3>
                  <div className="space-y-2">
                    {recommendedCourses.map((course: string, i: number) => (
                      <div key={i} className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-700 leading-snug">
                        {course}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-[#06b6d4]" /> Recommended Certifications
                  </h3>
                  <div className="space-y-2">
                    {recommendedCertifications.map((cert: string, i: number) => (
                      <div key={i} className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-700 leading-snug">
                        {cert}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Career Advice */}
            <TabsContent value="advice" className="p-6 space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-4.5 h-4.5 text-[#4f46e5]" /> AI Career Coach Recommendations
              </h3>
              <div className="space-y-3">
                {careerAdvice.map((adv: string, i: number) => (
                  <div key={i} className="p-4 bg-[#4f46e5]/5 border border-[#4f46e5]/10 rounded-2xl flex items-start gap-3">
                    <ChevronRight className="w-4 h-4 text-[#4f46e5] shrink-0 mt-0.5" />
                    <p className="text-[13px] font-semibold text-gray-700 leading-relaxed">{adv}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Right Column Learning Roadmap */}
        <Card className="liquid-glass border-gray-200 shadow-sm rounded-3xl p-6 h-fit">
          <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-[#4f46e5]" /> Remediation Timeline
          </h3>
          <div className="relative border-l-2 border-gray-150 pl-6 space-y-6">
            {roadmap.map((phase: any, i: number) => (
              <div key={i} className="relative">
                {/* Node icon */}
                <div className="absolute -left-[31px] top-0 w-4 h-4 bg-[#4f46e5] rounded-full border-2 border-white flex items-center justify-center" />
                <div className="space-y-1">
                  <span className="text-[10px] text-[#4f46e5] font-extrabold uppercase tracking-wider">
                    {phase.phase} • {phase.duration}
                  </span>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-snug">
                    {phase.goal}
                  </h4>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {phase.topics?.map((topic: string, tIdx: number) => (
                      <span key={tIdx} className="text-[10px] bg-gray-100 text-gray-600 border border-gray-150 px-2 py-0.5 rounded-full font-bold">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Area: Question review */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <HelpCircle className="w-4.5 h-4.5 text-gray-500" /> Quiz Transcript & Explanations
        </h3>
        <div className="space-y-6">
          {session.questions?.map((q: any, i: number) => {
            const ans = q.answers?.[0]; // Selected answer in db
            const isCorrect = ans?.isCorrect ?? false;
            const options: string[] = typeof q.options === "string" ? JSON.parse(q.options) : q.options;

            return (
              <Card key={q.id} className="liquid-glass border-gray-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="bg-white/50 border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                    Question {q.position} ({q.skill})
                  </span>
                  {ans ? (
                    isCorrect ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-full font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 flex items-center gap-1 self-start sm:self-auto">
                        <CheckCircle className="w-3 h-3 text-emerald-500" /> Correct
                      </Badge>
                    ) : (
                      <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 rounded-full font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 flex items-center gap-1 self-start sm:self-auto">
                        <XCircle className="w-3 h-3 text-red-500" /> Incorrect
                      </Badge>
                    )
                  ) : (
                    <Badge className="bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50 rounded-full font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 flex items-center gap-1 self-start sm:self-auto">
                      Skipped
                    </Badge>
                  )}
                </div>

                <CardContent className="p-6 space-y-4">
                  <p className="font-extrabold text-sm sm:text-base text-gray-900 leading-snug">
                    {q.question}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {options.map((opt, oIdx) => {
                      const isSelected = ans?.selectedAnswer === opt;
                      const isCorrectOpt = q.correctAnswer === opt;
                      
                      let optClass = "border-gray-200 bg-white text-gray-700";
                      if (isSelected) {
                        optClass = isCorrect 
                          ? "border-emerald-300 bg-emerald-50/20 text-emerald-800" 
                          : "border-red-300 bg-red-50/20 text-red-800";
                      } else if (isCorrectOpt) {
                        optClass = "border-emerald-300 bg-emerald-50/10 text-emerald-700";
                      }

                      return (
                        <div key={oIdx} className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${optClass}`}>
                          <div className={`w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center ${
                            isSelected 
                              ? isCorrect ? "border-emerald-600 bg-emerald-600 text-white" : "border-red-600 bg-red-600 text-white"
                              : isCorrectOpt ? "border-emerald-500 bg-white" : "border-gray-300"
                          }`}>
                            {isSelected && (isCorrect ? "✓" : "✗")}
                          </div>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-[#4f46e5]/5 border border-[#4f46e5]/10 p-4 rounded-xl space-y-1 mt-4">
                    <span className="text-[10px] text-[#4f46e5] font-extrabold uppercase tracking-wider">AI Explanation</span>
                    <p className="text-[12.5px] font-semibold text-gray-700 leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
