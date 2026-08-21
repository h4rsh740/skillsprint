"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Target,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Building2,
  MapPin,
  TrendingUp,
  Award,
  Zap,
  RotateCw,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getVerifiedJobs,
  updateApplicationStatus,
  simulateJobSkillGain,
  type VerifiedJobCard,
  type JobsOverviewStats,
} from "@/actions/jobs";
import type { ApplicationStatus } from "@prisma/client";

const STATUS_LABELS: Record<ApplicationStatus, { label: string; color: string }> = {
  SAVED: { label: "Saved", color: "bg-gray-100 text-gray-700 border-gray-200" },
  APPLIED: { label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-200" },
  INTERVIEW: { label: "Interview", color: "bg-purple-50 text-purple-700 border-purple-200" },
  OFFER: { label: "Offer", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Archived", color: "bg-rose-50 text-rose-700 border-rose-200" },
  ARCHIVED: { label: "Archived", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<VerifiedJobCard[]>([]);
  const [stats, setStats] = useState<JobsOverviewStats | null>(null);
  const [selectedJob, setSelectedJob] = useState<VerifiedJobCard | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [workMode, setWorkMode] = useState<string>("ALL");
  const [minMatch, setMinMatch] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"ALL" | "TOP_MATCHES" | "APPLIED">("ALL");

  // Skill Simulator state
  const [simulatedSkills, setSimulatedSkills] = useState<string[]>([]);
  const [simulatedResult, setSimulatedResult] = useState<{
    simulatedMatchScore: number;
    deltaPoints: number;
    simulatedProbability: number;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadJobs();
  }, [workMode, minMatch]);

  async function loadJobs() {
    try {
      setLoading(true);
      const res = await getVerifiedJobs({
        search: search || undefined,
        workMode: workMode !== "ALL" ? workMode : undefined,
        minMatchScore: minMatch > 0 ? minMatch : undefined,
      });
      setJobs(res.jobs);
      setStats(res.stats);
    } catch (err) {
      console.error("Failed to load jobs", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs();
  };

  const handleStatusChange = async (jobId: string, status: ApplicationStatus) => {
    try {
      await updateApplicationStatus(jobId, status);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, applicationStatus: status } : j))
      );
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob((prev) => (prev ? { ...prev, applicationStatus: status } : null));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleSimulateToggle = async (skill: string) => {
    if (!selectedJob) return;
    const nextSkills = simulatedSkills.includes(skill)
      ? simulatedSkills.filter((s) => s !== skill)
      : [...simulatedSkills, skill];

    setSimulatedSkills(nextSkills);

    if (nextSkills.length === 0) {
      setSimulatedResult(null);
      return;
    }

    try {
      setSimulating(true);
      const res = await simulateJobSkillGain(selectedJob.id, nextSkills);
      setSimulatedResult(res);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setSimulating(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (activeTab === "TOP_MATCHES") return job.match.overallMatchScore >= 75;
    if (activeTab === "APPLIED") return job.applicationStatus === "APPLIED" || job.applicationStatus === "INTERVIEW";
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto w-full pb-16">
      {/* Signature SkillSprint Header Banner */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-slate-900/20 opacity-80 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
              <Briefcase className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white">
                  Job Match Recommendations
                </h1>
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold">
                  Verified Real Postings
                </span>
              </div>
              <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium max-w-2xl">
                Real-time placement matching comparing your verified skills, GitHub commit velocity, and resume ATS against live engineering roles with AI hiring probabilities.
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
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Active Roles</p>
              <Briefcase className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1.5">{stats.totalJobs}</div>
            <p className="text-[11px] text-gray-400 mt-1">Verified live postings</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Avg. Match Score</p>
              <Target className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1.5">{stats.avgMatchScore}%</div>
            <p className="text-[11px] text-emerald-600/80 mt-1">Stack alignment</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Avg. Hiring Prob.</p>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-3xl font-extrabold text-purple-600 mt-1.5">{stats.avgHiringProbability}%</div>
            <p className="text-[11px] text-purple-600/80 mt-1">AI-estimated probability</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Applications</p>
              <Award className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-extrabold text-blue-600">{stats.appliedCount}</span>
              <span className="text-[12px] text-gray-500 font-medium">({stats.interviewCount} in interview)</span>
            </div>
            <p className="text-[11px] text-blue-600/80 mt-1">Active pipeline tracking</p>
          </div>
        </div>
      )}

      {/* Filter Toolbar & Tabs */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              All Roles ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab("TOP_MATCHES")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "TOP_MATCHES" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Top Matches (75%+)
            </button>
            <button
              onClick={() => setActiveTab("APPLIED")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "APPLIED" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Tracked ({jobs.filter((j) => j.applicationStatus).length})
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by role, company (e.g. Stripe, Atlassian), skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4f46e5] focus:bg-white transition-colors"
            />
          </form>

          {/* Work Mode Filter */}
          <div className="flex items-center gap-1.5">
            {["ALL", "REMOTE", "HYBRID", "ON_SITE"].map((mode) => (
              <button
                key={mode}
                onClick={() => setWorkMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  workMode === mode
                    ? "bg-[#4f46e5] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {mode === "ALL" ? "All Modes" : mode.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-5">
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <div className="w-10 h-10 border-3 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 font-medium text-xs">Matching profile against verified live postings...</p>
          </div>
        )}

        {!loading && filteredJobs.length === 0 && (
          <div className="text-center py-16 p-8 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-3">
            <Briefcase className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-800">No jobs match your current filters</h3>
            <p className="text-xs text-gray-500">Try adjusting your search terms or lowering the minimum match threshold.</p>
          </div>
        )}

        {!loading &&
          filteredJobs.map((job) => {
            const isHighMatch = job.match.overallMatchScore >= 75;
            const isMidMatch = job.match.overallMatchScore >= 50;

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-[#4f46e5]/40 transition-all duration-300 space-y-5"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold bg-[#4f46e5]/10 text-[#4f46e5] border border-[#4f46e5]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {job.source}
                      </span>
                      <span className="text-xs font-bold text-gray-700">{job.company}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500">{job.location}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {job.workMode.replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 leading-snug">{job.title}</h3>
                  </div>

                  {/* Dual Scorecard */}
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    {/* Match Score */}
                    <div className={`px-3.5 py-1.5 rounded-2xl border text-center ${
                      isHighMatch
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isMidMatch
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      <div className="text-[10px] font-bold uppercase tracking-wider">Match Fit</div>
                      <div className="text-lg font-extrabold">{job.match.overallMatchScore}%</div>
                    </div>

                    {/* Hiring Probability */}
                    <div className="px-3.5 py-1.5 rounded-2xl bg-purple-50 border border-purple-200 text-center">
                      <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Hiring Prob.</div>
                      <div className="text-lg font-extrabold text-purple-700">{job.match.hiringProbability}%</div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{job.description}</p>

                {/* Skills Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>Verified Skills Match</span>
                    <span>{job.match.matchingSkills.length} of {job.requiredSkills.length} requirements met</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {job.match.matchingSkills.map((skill: string) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {skill}
                      </span>
                    ))}

                    {job.match.missingSkills.map((skill: string) => {
                      const gapItem = job.match.skillGaps.find((g) => g.skill.toLowerCase() === skill.toLowerCase());
                      const isCritical = gapItem?.priority === "Critical";
                      return (
                        <span
                          key={skill}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border flex items-center gap-1 ${
                            isCritical
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" /> {skill} {isCritical ? "(Critical)" : ""}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Actions & Tracking */}
                <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">Status:</span>
                    <select
                      value={job.applicationStatus || ""}
                      onChange={(e) =>
                        handleStatusChange(
                          job.id,
                          (e.target.value as ApplicationStatus) || "SAVED"
                        )
                      }
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#4f46e5]"
                    >
                      <option value="">Not Tracked</option>
                      <option value="SAVED">Saved</option>
                      <option value="APPLIED">Applied</option>
                      <option value="INTERVIEW">Interview</option>
                      <option value="OFFER">Offer</option>
                      <option value="REJECTED">Archived</option>
                    </select>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setSimulatedSkills([]);
                        setSimulatedResult(null);
                      }}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Skill Simulator
                    </button>

                    <a
                      href={job.applicationUrl || job.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (!job.applicationStatus) {
                          handleStatusChange(job.id, "APPLIED");
                        }
                      }}
                      className="px-4 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-[#4f46e5]/20"
                    >
                      Apply on {job.source} <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>

      {/* Skill Acquisition Simulator Modal / Drawer */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-gray-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                      Skill Acquisition Simulator
                    </span>
                    <span className="text-xs text-gray-500 font-semibold">{selectedJob.company}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{selectedJob.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Simulation Result Comparison Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Current Match</div>
                  <div className="text-2xl font-extrabold text-gray-900">{selectedJob.match.overallMatchScore}%</div>
                </div>

                <div className="text-center font-bold text-indigo-600 text-sm">
                  ➔
                </div>

                <div>
                  <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Projected Match</div>
                  <div className="text-2xl font-extrabold text-indigo-600">
                    {simulatedResult ? `${simulatedResult.simulatedMatchScore}%` : `${selectedJob.match.overallMatchScore}%`}
                    {simulatedResult && simulatedResult.deltaPoints > 0 && (
                      <span className="text-xs text-emerald-600 ml-1.5 font-bold">
                        (+{simulatedResult.deltaPoints}%)
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Projected Prob.</div>
                  <div className="text-2xl font-extrabold text-purple-600">
                    {simulatedResult ? `${simulatedResult.simulatedProbability}%` : `${selectedJob.match.hiringProbability}%`}
                  </div>
                </div>
              </div>

              {/* Missing Skills Interactive Selector */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Select Missing Skills to Simulate Learning:
                </h4>

                {selectedJob.match.missingSkills.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-semibold">
                    You already possess all required skills for this role!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.match.missingSkills.map((skill: string) => {
                      const isSelected = simulatedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          onClick={() => handleSimulateToggle(skill)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#4f46e5] text-white border-[#4f46e5] shadow-sm shadow-[#4f46e5]/20"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {isSelected ? "✓" : "+"} {skill}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {selectedJob.match.recommendations.length > 0 && (
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Recommended Project Bridge:
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedJob.match.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-500 flex items-start gap-2">
                <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>
                  AI-estimated hiring probability is calculated from your verified profile alignment and available evidence. It does not constitute a guarantee of employment.
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-5 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
