"use client";

import { useEffect, useState } from "react";
import { Trophy, Calendar, Sparkles, Target, ArrowUpRight, HelpCircle, CheckCircle } from "lucide-react";
import { getDashboardData } from "@/actions/onboarding";
import { db } from "@/lib/db";

type HackathonMatch = {
  id: string;
  title: string;
  matchScore: number;
  platform: string;
  skills: string[];
};

export default function HackathonsPage() {
  const [loading, setLoading] = useState(true);
  const [hackathons, setHackathons] = useState<HackathonMatch[]>([]);
  const [profileSkills, setProfileSkills] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const profileRes = await getDashboardData();
        if (profileRes.success && profileRes.profile) {
          const userSkills = profileRes.profile.skills || [];
          setProfileSkills(userSkills);

          // Get default mock hackathons for demo
          const matches: HackathonMatch[] = [
            { id: "h1", title: "Smart India Hackathon 2026", matchScore: 92, platform: "Govt of India", skills: ["React", "SQL", "Cloud"] },
            { id: "h2", title: "Co:here AI Hackathon", matchScore: 84, platform: "Lablab.ai", skills: ["Next.js", "Python", "API Design"] },
            { id: "h3", title: "Vercel Web Buildathon", matchScore: 78, platform: "Devpost", skills: ["Next.js", "TypeScript", "Tailwind"] }
          ];

          // Compute matched percentages dynamically based on skills
          const updatedMatches = matches.map(h => {
            const overlap = h.skills.filter(s => 
              userSkills.some((us: string) => us.toLowerCase() === s.toLowerCase())
            );
            const score = h.skills.length > 0 ? Math.round((overlap.length / h.skills.length) * 100) : 50;
            // set reasonable minimum match score for demo aesthetic
            return { ...h, matchScore: Math.max(score, 60) };
          });

          setHackathons(updatedMatches.sort((a, b) => b.matchScore - a.matchScore));
        }
      } catch (err) {
        console.error("Failed to load hackathon data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium text-[15px]">Curating competitive indices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-[#4f46e5]" /> Hackathon Recommender
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Expand your portfolio and test developer quality by competing in high-impact hackathons.</p>
      </div>

      <div className="space-y-6">
        {hackathons.map((h) => {
          return (
            <div 
              key={h.id}
              className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3.5">
                  <span className="text-xs font-semibold text-[#06b6d4] bg-[#06b6d4]/10 border border-[#06b6d4]/20 px-3 py-1 rounded-full uppercase tracking-wider">
                    {h.platform}
                  </span>
                  <span className="text-[13px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> {h.matchScore}% Skill Fit
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 tracking-tight">{h.title}</h3>

                <div className="flex flex-wrap gap-2 pt-1">
                  {h.skills.map(s => {
                    const isMatched = profileSkills.some(us => us.toLowerCase() === s.toLowerCase());
                    return (
                      <span 
                        key={s} 
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-md border flex items-center gap-1 ${
                          isMatched 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {isMatched && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                        {s}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex-shrink-0 w-full md:w-auto">
                <a 
                  href="https://devpost.com/hackathons"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-[13.5px] font-semibold rounded-full px-5 py-2.5 transition-colors shadow"
                >
                  <span>Register Now</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Internships Widget */}
      <div className="liquid-glass rounded-3xl p-6 border border-white/50 shadow flex flex-col justify-between">
        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 text-[#8b5cf6]" /> High-Velocity Internships
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[120px]">
            <div>
              <h4 className="font-bold text-gray-900 text-[14.5px]">AI Engineer Intern</h4>
              <p className="text-xs text-gray-500 mt-1">Cohere Inc. • Remote</p>
            </div>
            <a href="/dashboard/jobs" className="text-xs font-semibold text-[#4f46e5] flex items-center gap-0.5 hover:underline mt-4">
              Inspect Fit <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[120px]">
            <div>
              <h4 className="font-bold text-gray-900 text-[14.5px]">Frontend Core Intern</h4>
              <p className="text-xs text-gray-500 mt-1">Vercel • Delhi (Remote)</p>
            </div>
            <a href="/dashboard/jobs" className="text-xs font-semibold text-[#4f46e5] flex items-center gap-0.5 hover:underline mt-4">
              Inspect Fit <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
