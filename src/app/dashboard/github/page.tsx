"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Terminal, RefreshCw, GitBranch, CheckCircle2, AlertCircle } from "lucide-react";
import { analyzeGitHub, getConnectedGitHubAccount, type GitHubAnalysisResult } from "@/actions/github";
import { getDashboardData } from "@/actions/scores";
import { useAuth } from "@/context/AuthContext";
import { disconnectGitHub } from "@/actions/auth";
import { useRouter } from "next/navigation";

// Custom Github SVG replacement
function Github(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function GitHubIntelPage() {
  const { user, refreshSession } = useAuth();
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<GitHubAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSavedAnalysis() {
    if (!user) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const [dashboard, onboardRes, githubAccount] = await Promise.all([
        getDashboardData(),
        fetch("/api/onboard").then(res => res.json()),
        getConnectedGitHubAccount()
      ]);

      let ga = dashboard.githubAnalysis;
      let scoreVal = dashboard.scores.github;
      
      const githubUser = githubAccount?.username || (onboardRes.success && onboardRes.profile?.githubUsername
        ? onboardRes.profile.githubUsername
        : "");
        
      if (githubUser) {
        setUsername(githubUser);
      }

      // If connected but no analysis in DB yet, auto-trigger it
      if (!ga && (user.githubConnected || githubUser)) {
        try {
          const freshResult = await analyzeGitHub(githubUser || undefined);
          setResult(freshResult);
          return;
        } catch (e: any) {
          setError(e.message || "Unable to synchronize GitHub repositories.");
          return;
        }
      }

      if (ga) {
        const sVal = scoreVal || ga.portfolioCompleteness || 0;
        let developerLevel = "Beginner Developer";
        if (sVal >= 90) developerLevel = "Principal Engineer";
        else if (sVal >= 80) developerLevel = "Staff Engineer";
        else if (sVal >= 65) developerLevel = "Senior Engineer";
        else if (sVal >= 50) developerLevel = "Software Engineer";
        else if (sVal >= 35) developerLevel = "Associate Engineer";
        else if (sVal >= 20) developerLevel = "Junior Developer";

        const mappedResult: GitHubAnalysisResult = {
          githubScore: sVal,
          consistencyScore: ga.contributionStreak ? Math.min(50 + ga.contributionStreak * 3, 100) : 0,
          projectQuality: Math.round(sVal * 0.95),
          openSourceSignal: sVal > 75 ? "High" : sVal > 45 ? "Medium" : "Low",
          developerLevel,
          repositoriesCount: ga.publicReposCount || 0,
          privateReposCount: ga.privateReposCount || 0,
          languagesUsed: ga.languagesUsed || [],
          repositoryHealth: ga.pinnedRepos || [],
          commitStreak: ga.contributionStreak || 0,
          cicdActive: ga.cicdStatus === "Active GitHub Actions",
          issuesResolved: ga.commitHistory?.resolvedIssues || 0,
          pullRequestsCount: ga.commitHistory?.prCount || 0,
          readmeQuality: ga.readmeQuality || "Low",
          avatarUrl: githubAccount?.avatarUrl || user.photoURL || "",
          syncTime: ga.createdAt ? new Date(ga.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
          totalStars: ga.stars || 0,
          totalForks: ga.forks || 0
        };
        setResult(mappedResult);
      }
    } catch (e: any) {
      console.error("Failed to load initial GitHub analysis", e);
      setError("Unable to synchronize GitHub repositories.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  useEffect(() => {
    loadSavedAnalysis();
  }, [user]);

  const handleSync = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeGitHub();
      setResult(data);
    } catch (e: any) {
      console.error("Failed to re-sync GitHub", e);
      setError("Unable to synchronize GitHub repositories.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm("Are you sure you want to disconnect your GitHub integration?")) {
      setIsAnalyzing(true);
      setError(null);
      try {
        const result = await disconnectGitHub();
        if (!result.success) {
          throw new Error(result.error || "Failed to disconnect GitHub account.");
        }
        setResult(null);
        setUsername("");
        await refreshSession();
        router.push("/dashboard");
      } catch (e: any) {
        console.error("Failed to disconnect GitHub", e);
        setError(e.message || "Failed to disconnect GitHub account.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Title Header Card */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <Terminal className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white flex items-center gap-3">
              GitHub Intelligence
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              Project depth, consistency, contribution behavior, and engineering signal.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-rose-50 border border-rose-150 rounded-3xl p-8 gap-4 text-center shadow-sm max-w-2xl mx-auto">
          <div className="p-3 rounded-2xl bg-rose-100 border border-rose-200">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <span className="font-extrabold text-rose-900 text-lg">{error}</span>
          <p className="text-xs text-rose-600 max-w-md leading-relaxed">
            The system could not retrieve your live GitHub repositories. Verify your connection or rate limit permissions and try again.
          </p>
          <button
            onClick={() => {
              setError(null);
              loadSavedAnalysis();
            }}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13.5px] px-6 py-2.5 rounded-xl transition-all shadow cursor-pointer hover:scale-[1.02]"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Synchronization
          </button>
        </div>
      ) : isAnalyzing && !result ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white/40 border border-gray-150 rounded-3xl p-8 gap-4 text-center shadow-sm max-w-xl mx-auto">
          <RefreshCw className="w-10 h-10 animate-spin text-[#4f46e5]" />
          <span className="font-bold text-gray-700 tracking-wider">Synchronizing code repositories and streaks...</span>
          <p className="text-xs text-gray-500">Retrieving commit matrices, CI/CD telemetry and project details.</p>
        </div>
      ) : !user?.githubConnected && !result ? (
        /* DISCONNECTED STATE CARD */
        <div className="liquid-glass rounded-3xl p-8 sm:p-12 max-w-2xl mx-auto shadow-lg border border-white/50 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-purple-50/10 to-transparent pointer-events-none" />
          <div className="p-4 rounded-2xl bg-[#4f46e5]/10 w-fit mx-auto border border-indigo-100 shadow-inner">
            <Github className="h-10 w-10 text-[#4f46e5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">GitHub Not Connected</h2>
            <p className="text-gray-500 text-[14px] max-w-md mx-auto leading-relaxed">
              Connect your GitHub account to unlock SkillSprint's deep analytics engine:
            </p>
          </div>

          <div className="bg-white/40 p-5 rounded-2xl border border-gray-150 text-left max-w-md mx-auto text-[13.5px] text-gray-600 space-y-2 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span> Repository Analysis
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span> AI Career Twin
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span> Skill Gap Detection
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span> Personalized Projects
            </div>
          </div>

          <a 
            href="/api/auth/github"
            className="inline-flex justify-center items-center gap-2.5 bg-gray-900 hover:bg-gray-800 text-white text-[14.5px] font-bold rounded-xl py-3.5 px-8 transition-all shadow-md cursor-pointer hover:scale-[1.02] border border-gray-950"
          >
            <Github className="w-5 h-5" />
            Connect GitHub
          </a>
        </div>
      ) : (
        result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-6xl mx-auto"
          >
            {/* Header Row: Connection Status details */}
            <div className="bg-white/60 rounded-2xl p-5 border border-gray-150 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {result.avatarUrl ? (
                  <img src={result.avatarUrl} alt="GitHub Avatar" className="w-10 h-10 rounded-full border border-gray-200 shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-55 border border-emerald-100 flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Status</span>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    ✓ GitHub Connected: <span className="text-[#4f46e5] font-extrabold">{username || "Linked Account"}</span>
                  </span>
                  {result.syncTime && (
                    <span className="text-[9px] text-gray-400 font-bold block">Last Synchronized: {result.syncTime}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center sm:text-left sm:flex sm:items-center sm:gap-6">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Repositories</span>
                  <span className="text-xs font-bold text-slate-800">{result.repositoriesCount + result.privateReposCount} Total</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Developer Score</span>
                  <span className="text-xs font-bold text-slate-800">{result.githubScore}/100</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Stars / Forks</span>
                  <span className="text-xs font-bold text-slate-800">★{result.totalStars || 0} / ⑂{result.totalForks || 0}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSync}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 bg-[#4f46e5]/10 hover:bg-[#4f46e5]/20 text-[#4f46e5] font-bold text-[12px] px-4 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  Re-sync Footprint
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 font-bold text-[12px] px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Disconnect Account
                </button>
              </div>
            </div>

            {/* 4-KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="liquid-glass-light p-5 rounded-2xl">
                <h3 className="text-[13px] text-gray-500 font-medium">Developer Level</h3>
                <div className="text-xl font-bold text-gray-900 mt-2.5 truncate">{result.developerLevel}</div>
                <div className="mt-2 text-[12px] px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full inline-block font-medium">Verified Footprint</div>
              </div>
              <div className="liquid-glass-light p-5 rounded-2xl">
                <h3 className="text-[13px] text-gray-500 font-medium">Project Quality</h3>
                <div className="text-3xl font-bold text-gray-900 mt-2">{result.projectQuality}</div>
                <div className="mt-2 text-[12px] px-2.5 py-1 bg-[#4f46e5]/10 text-[#4f46e5] rounded-full inline-block font-medium">Verified Signal</div>
              </div>
              <div className="liquid-glass-light p-5 rounded-2xl">
                <h3 className="text-[13px] text-gray-500 font-medium">Consistency</h3>
                <div className="text-3xl font-bold text-gray-900 mt-2">{result.consistencyScore}</div>
                <div className="mt-2 text-[12px] px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full inline-block font-medium">{result.commitStreak} active streak</div>
              </div>
              <div className="liquid-glass-light p-5 rounded-2xl">
                <h3 className="text-[13px] text-gray-500 font-medium">Open Source Signal</h3>
                <div className="text-3xl font-bold text-gray-900 mt-2">{result.openSourceSignal}</div>
                <div className="mt-2 text-[12px] px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full inline-block font-medium">Quality score</div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Language Footprint Chart */}
              <div className="liquid-glass-light rounded-3xl p-6 sm:p-8 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Language Footprint</h3>
                
                {result.languagesUsed.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-xs py-8">
                    No languages detected. Please verify your repositories contain code files.
                  </div>
                ) : (
                  <div className="flex-1 flex items-end gap-3 min-h-[240px] pt-4">
                    {result.languagesUsed.slice(0, 5).map((lang, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full flex flex-col justify-end h-[200px] relative">
                          <div 
                            className={`w-full rounded-t-xl transition-all duration-700 ${
                              i === 0 ? 'bg-gradient-to-t from-[#4f46e5] to-[#8b5cf6]' :
                              i === 1 ? 'bg-gradient-to-t from-emerald-500 to-teal-400' :
                              i === 2 ? 'bg-gradient-to-t from-pink-500 to-rose-400' :
                              'bg-gradient-to-t from-gray-400 to-gray-300'
                            }`}
                            style={{ height: `${lang.percentage}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[11px] font-bold px-2 py-1 rounded">
                              {lang.percentage}%
                            </div>
                          </div>
                        </div>
                        <span className="text-[12px] font-medium text-gray-500 truncate w-full text-center">{lang.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Repository Health */}
              <div className="liquid-glass-light rounded-3xl p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Repository Health Summary</h3>
                  <span className="text-[13px] text-gray-500 font-medium">{result.repositoriesCount} total repos</span>
                </div>
                
                {result.repositoryHealth.length === 0 ? (
                  <div className="text-gray-400 text-xs py-8 text-center border-t border-gray-100">
                    No repositories found to audit.
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    {/* Desktop Table view */}
                    <table className="w-full text-left border-collapse hidden md:table">
                      <thead>
                        <tr>
                          <th className="pb-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Repository</th>
                          <th className="pb-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-center">Signal</th>
                          <th className="pb-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Insight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.repositoryHealth.map((repo, i) => (
                          <tr key={i} className="hover:bg-white/40 transition-colors">
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-2">
                                <GitBranch className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold text-[14px] text-gray-900">{repo.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-2 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                                repo.signal === 'High' ? 'bg-[#4f46e5]/10 text-[#4f46e5]' :
                                repo.signal === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {repo.signal}
                              </span>
                            </td>
                            <td className="py-4 pl-4 text-[13px] text-gray-600 leading-snug">
                              {repo.insight}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Mobile Cards view */}
                    <div className="block md:hidden space-y-4">
                      {result.repositoryHealth.map((repo, i) => (
                        <div key={i} className="bg-white/60 p-4 rounded-xl border border-gray-200/50 shadow-sm space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="font-bold text-[14px] text-gray-900 break-all">{repo.name}</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${
                              repo.signal === 'High' ? 'bg-[#4f46e5]/10 text-[#4f46e5]' :
                              repo.signal === 'Medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {repo.signal}
                            </span>
                          </div>
                          <p className="text-[12.5px] text-gray-650 leading-relaxed bg-white/40 p-3 rounded-lg border border-gray-100 shadow-inner">
                            {repo.insight}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )
      )}
    </div>
  );
}
