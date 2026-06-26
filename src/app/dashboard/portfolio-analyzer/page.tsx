"use client";

import { useEffect, useState } from "react";
import { Link2, Sparkles, CheckCircle2, RotateCw, RefreshCw, BarChart2, Award, Zap, Search } from "lucide-react";
import { getPortfolioAudit, auditPortfolio, type PortfolioAuditResult } from "@/actions/portfolio";

export default function PortfolioAnalyzerPage() {
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState<PortfolioAuditResult | null>(null);

  useEffect(() => {
    async function loadAudit() {
      try {
        const res = await getPortfolioAudit();
        setAudit(res);
      } catch (err) {
        console.error("Failed to load portfolio audit", err);
      } finally {
        setLoading(false);
      }
    }
    loadAudit();
  }, []);

  const handleAudit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuditing(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await auditPortfolio(formData);
      setAudit(res);
    } catch (err) {
      console.error("Audit failed", err);
    } finally {
      setAuditing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium text-[15px]">Retrieving audit reports...</p>
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
            <Link2 className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white flex items-center gap-3">
              Portfolio Analyzer
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              Audit your custom developer domain for visual design, performance, and search engine optimization.
            </p>
          </div>
        </div>
      </div>

      {!audit ? (
        <div className="liquid-glass rounded-3xl p-8 sm:p-12 max-w-2xl mx-auto border border-white/50 shadow-sm text-center">
          <div className="w-16 h-16 bg-[#4f46e5]/10 text-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-6">
            <Link2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Audit Your Domain</h3>
          <p className="text-gray-500 mt-2 mb-8 text-[14px] max-w-md mx-auto">
            Provide your live portfolio website link. Our system runs a simulated Lighthouse audit to score performance, SEO, and accessibility.
          </p>

          <form onSubmit={handleAudit} className="space-y-5 max-w-md mx-auto">
            <div className="space-y-2 text-left">
              <label className="text-[13px] font-medium text-gray-700 block">Portfolio URL</label>
              <input 
                required
                name="portfolioUrl"
                type="url"
                placeholder="https://yourportfolio.dev"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={auditing}
              className="w-full flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] font-medium rounded-full py-3.5 transition-colors shadow-sm disabled:opacity-75"
            >
              {auditing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Running Performance Audits...
                </>
              ) : (
                <>
                  Analyze Portfolio
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
          {/* Audit Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <AuditCard title="Performance" score={audit.performanceScore} icon={<Zap className="w-5 h-5 text-amber-500" />} color="text-amber-500" />
            <AuditCard title="Visual Design" score={audit.designScore} icon={<Award className="w-5 h-5 text-indigo-500" />} color="text-indigo-500" />
            <AuditCard title="SEO Score" score={audit.seoScore} icon={<Search className="w-5 h-5 text-emerald-500" />} color="text-emerald-500" />
          </div>

          <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
            {/* Suggestions list */}
            <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-[#8b5cf6]" /> Improvement Recommendations
                </h3>
                <ul className="space-y-4">
                  {audit.suggestions.map((s, idx) => (
                    <li key={idx} className="flex gap-3 text-xs text-gray-700 leading-normal">
                      <div className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full bg-[#4f46e5]" />
                      <p>{s}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                <button 
                  onClick={() => setAudit(null)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 text-[13.5px] font-medium shadow-sm transition-all"
                >
                  <RotateCw className="w-4 h-4" />
                  Analyze New Domain
                </button>
              </div>
            </div>

            {/* Target Card */}
            <div className="liquid-glass rounded-3xl p-6 border border-white/50 shadow flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Audited Domain</h4>
                <a 
                  href={audit.portfolioUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-950 font-bold text-[14px] mt-1.5 block hover:underline hover:text-[#4f46e5] break-all"
                >
                  {audit.portfolioUrl}
                </a>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 flex gap-2.5 items-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-[11.5px] font-semibold text-emerald-800">
                  Scores synced to your SkillSprint profile dashboard.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditCard({ title, score, icon, color }: { title: string; score: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="liquid-glass rounded-2xl p-5 border border-white/50 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-500">{title}</span>
        <div className="bg-white p-1.5 rounded-full shadow-sm">{icon}</div>
      </div>
      <div>
        <span className={`text-4xl font-extrabold tracking-tight ${color}`}>{score}/100</span>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mt-3.5">
          <div className={`h-full bg-current ${color}`} style={{ width: `${score}%` }} />
        </div>
      </div>
    </div>
  );
}
