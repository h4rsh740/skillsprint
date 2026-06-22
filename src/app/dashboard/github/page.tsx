"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Terminal, RefreshCw, Activity, Search, Star, GitBranch } from "lucide-react";
import { analyzeGitHub, type GitHubAnalysisResult } from "@/actions/github";

export default function GitHubIntelPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<GitHubAnalysisResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username) return;

    setIsAnalyzing(true);
    try {
      const data = await analyzeGitHub(username);
      setResult(data);
    } catch (error) {
      console.error("Failed to analyze GitHub", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Terminal className="h-8 w-8 text-[#4f46e5]" /> GitHub Intelligence
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Project depth, consistency, contribution behavior, and engineering signal.</p>
      </div>

      {!result ? (
        <div className="liquid-glass rounded-3xl p-8 sm:p-12 max-w-3xl mx-auto shadow-sm border border-gray-200 mt-12 text-center">
          <div className="p-6 rounded-full bg-[#4f46e5]/10 w-fit mx-auto mb-6">
            <Terminal className="h-10 w-10 text-[#4f46e5]" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">Connect your GitHub</h2>
          <p className="text-gray-500 mb-8">Enter your GitHub username to extract your engineering footprint.</p>

          <form onSubmit={handleAnalyze} className="max-w-md mx-auto space-y-4">
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. torvalds"
              className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 placeholder:text-gray-400 text-center"
            />
            
            <button 
              type="submit"
              disabled={isAnalyzing}
              className="w-full flex justify-center items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] font-medium rounded-full py-3.5 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Analyzing footprint...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Analyze Profile
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-6xl mx-auto"
        >
          {/* 4-KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[13px] text-gray-500 font-medium">Developer Score</h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">{result.githubScore}</div>
              <div className="mt-2 text-[12px] px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full inline-block font-medium">Top 24% globally</div>
            </div>
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[13px] text-gray-500 font-medium">Project Quality</h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">{result.projectQuality}</div>
              <div className="mt-2 text-[12px] px-2.5 py-1 bg-[#4f46e5]/10 text-[#4f46e5] rounded-full inline-block font-medium">3 standout repos</div>
            </div>
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[13px] text-gray-500 font-medium">Consistency</h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">{result.consistencyScore}</div>
              <div className="mt-2 text-[12px] px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full inline-block font-medium">21-day active streak</div>
            </div>
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[13px] text-gray-500 font-medium">Open Source Signal</h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">{result.openSourceSignal}</div>
              <div className="mt-2 text-[12px] px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full inline-block font-medium">Needs improvement</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Language Footprint Chart */}
            <div className="liquid-glass-light rounded-3xl p-6 sm:p-8 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Language Footprint</h3>
              
              <div className="flex-1 flex items-end gap-3 min-h-[240px] pt-4">
                {result.languagesUsed.map((lang, i) => (
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
            </div>

            {/* Repository Health */}
            <div className="liquid-glass-light rounded-3xl p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Repository Health</h3>
                <span className="text-[13px] text-gray-500 font-medium">{result.repositoriesCount} total repos</span>
              </div>
              
              <div className="overflow-hidden">
                <table className="w-full text-left border-collapse">
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
              </div>

              <button 
                onClick={() => setResult(null)}
                className="w-full mt-6 flex justify-center items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 text-[14px] font-medium rounded-full py-3.5 transition-colors border border-gray-200 shadow-sm"
              >
                Analyze Another Profile
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
