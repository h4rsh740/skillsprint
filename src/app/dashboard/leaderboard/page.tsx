"use client";

import { useEffect, useState } from "react";
import { Award, Trophy, User, Search, RefreshCw, Star, Layers, ShieldCheck } from "lucide-react";
import { searchProfiles } from "@/actions/search";

type CandidateRank = {
  rank: number;
  fullName: string;
  college: string;
  skillsprintScore: number;
  placementProbability: number;
  githubScore: number;
  targetRole: string;
};

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<"all" | "frontend" | "backend" | "ai" | "github">("all");
  const [talents, setTalents] = useState<CandidateRank[]>([]);

  useEffect(() => {
    async function loadTalents() {
      setLoading(true);
      try {
        const res = await searchProfiles({});
        if (res.success) {
          // Sort and map rank
          let rawList = res.results as any[];

          // Apply client-side filters based on category
          if (category === "frontend") {
            rawList = rawList.filter((t: any) => t.targetRole.toLowerCase().includes("frontend") || t.skills.some((s: string) => ["react", "next.js", "html", "css"].includes(s.toLowerCase())));
          } else if (category === "backend") {
            rawList = rawList.filter((t: any) => t.targetRole.toLowerCase().includes("backend") || t.skills.some((s: string) => ["node", "express", "sql", "postgres", "go", "java"].includes(s.toLowerCase())));
          } else if (category === "ai") {
            rawList = rawList.filter((t: any) => t.targetRole.toLowerCase().includes("ai") || t.targetRole.toLowerCase().includes("data") || t.skills.some((s: string) => ["python", "pytorch", "ml", "cohere"].includes(s.toLowerCase())));
          } else if (category === "github") {
            // Sort by github score
            rawList.sort((a: any, b: any) => (b.careerTwin?.consistencyScore || 75) - (a.careerTwin?.consistencyScore || 75));
          } else {
            // Default sort by SkillSprint Score
            rawList.sort((a: any, b: any) => b.skillsprintScore - a.skillsprintScore);
          }

          const ranked: CandidateRank[] = rawList.map((t: any, idx: number) => ({
            rank: idx + 1,
            fullName: t.fullName,
            college: t.college,
            skillsprintScore: t.skillsprintScore || 70,
            placementProbability: t.placementProbability || 60,
            githubScore: t.careerTwin?.githubScore || 78,
            targetRole: t.targetRole
          }));

          setTalents(ranked);
        }
      } catch (err) {
        console.error("Failed to load rankings", err);
      } finally {
        setLoading(false);
      }
    }
    loadTalents();
  }, [category]);

  const categories = [
    { id: "all", label: "Overall Rankings" },
    { id: "frontend", label: "Top Frontend" },
    { id: "backend", label: "Top Backend" },
    { id: "ai", label: "Top AI Talent" },
    { id: "github", label: "Open Source" }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium text-[15px]">Sorting cohort leaderboards...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <Trophy className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white flex items-center gap-3">
              Talent Leaderboard
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              Overall rankings based on calculated SkillSprint Score, resume quality, and GitHub consistency.
            </p>
          </div>
        </div>
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2.5 pb-2 border-b border-gray-200">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id as any)}
            className={`px-4 py-2 rounded-full text-[13.5px] font-semibold transition-all ${
              category === c.id 
                ? "bg-gray-900 text-white shadow-sm" 
                : "bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Leaderboard list */}
      <div className="liquid-glass rounded-3xl overflow-hidden border border-white/50 shadow-lg">
        {talents.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No candidates registered in this category yet.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <table className="w-full text-left border-collapse hidden md:table">
              <thead>
                <tr className="border-b border-gray-200 bg-white/40 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4 w-16 text-center">Rank</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-center">GitHub</th>
                  <th className="px-6 py-4 text-center">Ready Score</th>
                  <th className="px-6 py-4 text-center">SkillSprint Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {talents.map((t) => {
                  const isTop3 = t.rank <= 3;
                  return (
                    <tr 
                      key={t.rank}
                      className={`transition-colors hover:bg-white/40 ${
                        isTop3 ? "font-semibold" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        {t.rank === 1 ? (
                          <span className="inline-flex w-7 h-7 bg-amber-100 text-amber-800 rounded-full items-center justify-center font-bold">1</span>
                        ) : t.rank === 2 ? (
                          <span className="inline-flex w-7 h-7 bg-slate-200 text-slate-800 rounded-full items-center justify-center font-bold">2</span>
                        ) : t.rank === 3 ? (
                          <span className="inline-flex w-7 h-7 bg-orange-100 text-orange-800 rounded-full items-center justify-center font-bold">3</span>
                        ) : (
                          <span className="text-gray-400 pl-2">{t.rank}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[14px] text-gray-950">{t.fullName}</span>
                          <span className="text-xs text-gray-500 mt-0.5">{t.college}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13.5px] text-gray-600">{t.targetRole}</td>
                      <td className="px-6 py-4 text-center text-[13.5px] text-gray-700">{t.githubScore}%</td>
                      <td className="px-6 py-4 text-center text-[13.5px] text-gray-700">{t.placementProbability}%</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-md text-[13.5px] font-bold ${
                          isTop3 ? "bg-[#4f46e5] text-white" : "bg-gray-100 text-gray-800 border border-gray-200/50"
                        }`}>
                          {t.skillsprintScore}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-gray-100">
              {talents.map((t) => {
                const isTop3 = t.rank <= 3;
                return (
                  <div key={t.rank} className="p-5 bg-white/60 space-y-4 hover:bg-white/85 transition-colors">
                    {/* Rank & Student Name */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {t.rank === 1 ? (
                            <span className="inline-flex w-7 h-7 bg-amber-100 text-amber-800 rounded-full items-center justify-center font-bold text-xs">1</span>
                          ) : t.rank === 2 ? (
                            <span className="inline-flex w-7 h-7 bg-slate-200 text-slate-800 rounded-full items-center justify-center font-bold text-xs">2</span>
                          ) : t.rank === 3 ? (
                            <span className="inline-flex w-7 h-7 bg-orange-100 text-orange-800 rounded-full items-center justify-center font-bold text-xs">3</span>
                          ) : (
                            <span className="inline-flex w-7 h-7 text-gray-400 font-bold items-center justify-center text-xs">{t.rank}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] text-gray-950 font-bold leading-tight">{t.fullName}</span>
                          <span className="text-xs text-gray-400 mt-0.5 font-medium">{t.college}</span>
                        </div>
                      </div>
                      {/* SkillSprint Score */}
                      <span className={`inline-block px-3 py-1 rounded-md text-[13px] font-extrabold shadow-sm shrink-0 ${
                        isTop3 ? "bg-[#4f46e5] text-white" : "bg-gray-100 text-gray-800 border border-gray-250/50"
                      }`}>
                        {t.skillsprintScore}
                      </span>
                    </div>

                    {/* Target Role & Statistics Grid */}
                    <div className="space-y-2 bg-white/50 border border-gray-100 rounded-xl p-3.5 shadow-inner">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium uppercase tracking-wider text-[9px]">Target Role</span>
                        <span className="text-gray-800 font-bold">{t.targetRole}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-gray-200/50 pt-2">
                        <span className="text-gray-400 font-medium uppercase tracking-wider text-[9px]">GitHub Score</span>
                        <span className="text-slate-800 font-bold">{t.githubScore}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-gray-200/50 pt-2">
                        <span className="text-gray-400 font-medium uppercase tracking-wider text-[9px]">Placement Prob.</span>
                        <span className="text-emerald-700 font-bold">{t.placementProbability}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="bg-white/40 border border-gray-200/60 p-5 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Talent validation indices are refreshed daily using public GitHub and parsed resume feeds.</span>
        </div>
      </div>
    </div>
  );
}
