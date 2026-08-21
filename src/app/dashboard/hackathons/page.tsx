"use client";

import { useEffect, useState } from "react";
import {
  Trophy,
  Calendar,
  Sparkles,
  Target,
  ArrowUpRight,
  ShieldCheck,
  Bookmark,
  ExternalLink,
  Search,
  Users,
  Clock,
  Zap,
  CheckCircle2,
  GitBranch,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  getVerifiedHackathons,
  updateSavedHackathonStatus,
  type VerifiedHackathonCard,
  type HackathonOverviewStats,
} from "@/actions/hackathons";
import type { SavedHackathonStatus } from "@prisma/client";

const PLATFORMS = ["All", "Devpost", "Devfolio", "MLH", "Unstop"];
const MODES = ["All", "Online", "In-Person", "Hybrid"];

export default function HackathonsPage() {
  const [loading, setLoading] = useState(true);
  const [hackathons, setHackathons] = useState<VerifiedHackathonCard[]>([]);
  const [stats, setStats] = useState<HackathonOverviewStats | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");

  useEffect(() => {
    loadHackathons();
  }, [selectedPlatform, selectedMode]);

  async function loadHackathons() {
    try {
      setLoading(true);
      const res = await getVerifiedHackathons({
        search: search || undefined,
        platform: selectedPlatform !== "All" ? selectedPlatform : undefined,
        mode: selectedMode !== "All" ? selectedMode : undefined,
      });
      setHackathons(res.hackathons);
      setStats(res.stats);
    } catch (err) {
      console.error("Failed to load hackathons", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHackathons();
  };

  const handleStatusToggle = async (
    hackathonId: string,
    currentStatus?: SavedHackathonStatus | null
  ) => {
    const nextStatus: SavedHackathonStatus = currentStatus === "SAVED" ? "REGISTERED" : "SAVED";
    try {
      await updateSavedHackathonStatus(hackathonId, nextStatus);
      setHackathons((prev) =>
        prev.map((h) => (h.id === hackathonId ? { ...h, savedStatus: nextStatus } : h))
      );
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const bridgingList = hackathons.filter((h) => h.fit.bridgedJobSkills.length > 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto w-full pb-16">
      {/* Signature SkillSprint Dark Header Banner */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/20 opacity-80 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
              <Trophy className="h-6 w-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white">
                  Hackathon Recommender
                </h1>
                <span className="bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold">
                  Verified Global Feeds
                </span>
              </div>
              <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium max-w-2xl">
                Expand your portfolio and test developer quality by competing in high-impact hackathons from Devpost, Devfolio, MLH, and Unstop.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Active Events</p>
              <Trophy className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1.5">{stats.totalActive}</div>
            <p className="text-[11px] text-gray-400 mt-1">Live verified hackathons</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Avg. Skill Fit</p>
              <Target className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1.5">{stats.avgFitScore}%</div>
            <p className="text-[11px] text-emerald-600/80 mt-1">Match for your skillset</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Skill Bridges</p>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-extrabold text-amber-600 mt-1.5">{stats.bridgingOpportunitiesCount}</div>
            <p className="text-[11px] text-amber-600/80 mt-1">Closes job skill gaps</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Tracked</p>
              <Bookmark className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-extrabold text-blue-600">{stats.savedCount + stats.registeredCount}</span>
              <span className="text-[12px] text-gray-500 font-medium">({stats.registeredCount} registered)</span>
            </div>
            <p className="text-[11px] text-blue-600/80 mt-1">Saved & entered</p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, theme, or tech stack (e.g. AI, Web3, Python)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4f46e5] focus:bg-white transition-colors"
            />
          </form>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {PLATFORMS.map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedPlatform === plat
                    ? "bg-[#4f46e5] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {plat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMode(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedMode === m
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid + Skill Bridge Sidebar */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Hackathon Cards */}
        <div className="lg:col-span-2 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
              <div className="w-10 h-10 border-3 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 font-medium text-xs">Curating verified hackathons from live global feeds...</p>
            </div>
          )}

          {!loading && hackathons.length === 0 && (
            <div className="text-center py-16 p-8 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-3">
              <Trophy className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">No hackathons found</h3>
              <p className="text-xs text-gray-500">Try adjusting your platform or mode filters.</p>
            </div>
          )}

          {!loading &&
            hackathons.map((h) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-[#4f46e5]/40 transition-all duration-300 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {h.source}
                      </span>
                      <span className="text-xs font-semibold text-gray-600">{h.organizer}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {h.mode}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 leading-snug">{h.name}</h3>
                  </div>

                  {/* Fit Score Badge */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-2xl inline-flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-emerald-600" /> {h.fit.fitScore}% Fit
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                  {h.description}
                </p>

                {/* Tags and Perks */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  {h.prize && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-600" /> {h.prize}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-500" /> Closes in {h.daysRemaining} days
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-500" /> {h.teamSizeMin}-{h.teamSizeMax} Members
                  </span>
                </div>

                {/* Technologies */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {h.technologies.map((t) => {
                    const isMatched = h.fit.matchingTech.includes(t);
                    return (
                      <span
                        key={t}
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                          isMatched
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {isMatched ? "✓ " : ""}{t}
                      </span>
                    );
                  })}
                </div>

                {/* Skill-to-Hackathon Bridge Alert */}
                {h.fit.bridgedJobSkills.length > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs">
                    <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-amber-900">
                      <span className="font-bold">Skill-to-Job Bridge:</span> Competing in this hackathon develops{" "}
                      <span className="font-bold text-amber-950 underline">{h.fit.bridgedJobSkills.join(", ")}</span>, which directly closes missing skills on your target jobs!
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleStatusToggle(h.id, h.savedStatus)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      h.savedStatus === "REGISTERED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : h.savedStatus === "SAVED"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {h.savedStatus === "REGISTERED" ? "Registered" : h.savedStatus === "SAVED" ? "Saved" : "Save Event"}
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={h.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
                    >
                      Website <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href={h.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => updateSavedHackathonStatus(h.id, "REGISTERED")}
                      className="px-4 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1 shadow-md shadow-[#4f46e5]/20 active:scale-95"
                    >
                      Register on {h.source} <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>

        {/* Right 1 Col: Skill-to-Hackathon Bridge Sidebar */}
        <div className="space-y-5">
          <div className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
              <GitBranch className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-gray-900 text-[15px]">Skill-to-Hackathon Bridge</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Hackathons are the fastest way to turn missing job skills into verified portfolio evidence.
            </p>

            {bridgingList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center text-xs text-gray-500">
                All your target job skills are currently aligned with your profile!
              </div>
            ) : (
              <div className="space-y-3">
                {bridgingList.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{item.name}</span>
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {item.fit.fitScore}% Fit
                      </span>
                    </div>

                    <div className="text-gray-600 space-y-1">
                      <div className="text-[11px] text-amber-900 font-bold flex items-center gap-1">
                        <span>Missing Skill:</span>
                        <span className="text-indigo-600">{item.fit.bridgedJobSkills.join(", ")}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium">
                        Build with: {item.technologies.slice(0, 3).join(", ")}
                      </div>
                    </div>

                    <a
                      href={item.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4f46e5] hover:text-[#4338ca] pt-1"
                    >
                      Enter to Close Gap →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
