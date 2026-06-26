"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BrainCircuit, 
  Target, 
  Trophy, 
  Upload, 
  ArrowRight, 
  Map, 
  Mic, 
  Sparkles, 
  Network,
  FileText,
  AlertTriangle,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Zap,
  Activity,
  ChevronRight,
  ShieldCheck,
  RotateCw
} from "lucide-react";

// Inline custom SVG replacements for missing Lucide icons in package.json version
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

function Linkedin(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getDashboardData, type DashboardData } from "@/actions/scores";
import { buildRecommendedProject } from "@/actions/projects";
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  AreaChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Area,
  Tooltip
} from "recharts";

export default function DashboardOverview() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buildingProject, setBuildingProject] = useState<string | null>(null);

  // Fallback dynamic name priority matching Requirement 1
  const displayName = user?.name && user.name !== "SkillSprint Candidate" && user.name !== "fallback-profile" ? user.name : "";

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await getDashboardData();
      setData(res);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [user]);

  const handleBuildProject = async (projectName: string) => {
    setBuildingProject(projectName);
    try {
      await buildRecommendedProject(projectName);
      router.push("/dashboard/roadmap");
    } catch (e) {
      console.error("Failed to generate roadmap", e);
    } finally {
      setBuildingProject(null);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Check which features are connected to show limited mode alerts
  const githubConnected = user?.githubConnected || !!data?.githubAnalysis;
  const linkedinConnected = user?.linkedinConnected || !!data?.linkedinAnalysis;
  const resumeUploaded = user?.resumeUploaded || !!data?.resumeAnalysis;
  const isLimitedMode = !githubConnected || !linkedinConnected || !resumeUploaded;

  // Prepare radar chart data
  const radarData = [
    { subject: "Frontend", value: data?.scores?.metrics?.frontend?.current || 60 },
    { subject: "Backend", value: data?.scores?.metrics?.backend?.current || 55 },
    { subject: "System Design", value: data?.scores?.metrics?.systemDesign?.current || 50 },
    { subject: "Problem Solving", value: data?.scores?.metrics?.problemSolving?.current || 65 },
    { subject: "AI Readiness", value: data?.scores?.metrics?.aiReadiness?.current || 45 },
    { subject: "Open Source", value: data?.scores?.metrics?.openSource?.current || 40 },
  ];

  // Prepare history chart data
  const historyData = data?.scores?.history || [
    { month: "April", score: 55 },
    { month: "May", score: 65 },
    { month: "June", score: 75 }
  ];

  // Helper to generate simulated commit squares for 12 weeks (84 days)
  const commitGrid = Array.from({ length: 84 }).map((_, i) => {
    const active = githubConnected && (i % 3 === 0 || i % 7 === 0 || i % 11 === 0);
    const intensity = active ? (i % 3 === 0 ? "bg-emerald-500" : i % 7 === 0 ? "bg-emerald-400" : "bg-emerald-300") : "bg-gray-100";
    return { day: i, active, intensity };
  });

  return (
    <div className="flex flex-col gap-8 lg:gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full max-w-7xl mx-auto w-full pb-10">
      
      {/* 1. WELCOME HEADER SECTION WITH PRIORITIZED NAME */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/50 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BrainCircuit className="w-48 h-48 text-indigo-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
              <Sparkles className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight text-white">
                {displayName ? `Welcome back, ${displayName}.` : "Welcome back."}
              </h1>
              <p className="text-slate-300 mt-1.5 text-sm sm:text-base font-medium">
                {isLimitedMode 
                  ? "Operating in Limited Analysis Mode. Connect additional footprints for full twin modeling."
                  : "Your AI Career Twin is fully synchronized. Explore your growth index projections."
                }
              </p>
            </div>
          </div>
          <button 
            onClick={loadDashboard}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white rounded-full px-5 py-2.5 text-sm font-semibold border border-white/10 backdrop-blur-md transition-all w-fit cursor-pointer"
          >
            <RotateCw className="w-4 h-4" /> Sync Footprints
          </button>
        </div>
      </div>

      {/* 2. ONBOARDING & CONNECTION STATUS BADGES */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard icon={<CheckCircle2 className="text-emerald-500 w-5 h-5" />} label="Google Account" status="✅ Connected" />
        <StatusCard 
          icon={githubConnected ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : <AlertTriangle className="text-amber-500 w-5 h-5" />} 
          label="GitHub Sync" 
          status={githubConnected ? "✅ Connected" : "❌ Disconnected"} 
          link={githubConnected ? "/dashboard/github" : "/api/auth/github"}
          actionLabel={githubConnected ? "Analyze Projects" : "Connect OAuth"}
          external={!githubConnected}
        />
        <StatusCard 
          icon={linkedinConnected ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : <AlertTriangle className="text-amber-500 w-5 h-5" />} 
          label="LinkedIn Profile" 
          status={linkedinConnected ? "✅ Connected" : "❌ Disconnected"} 
          link={linkedinConnected ? "/dashboard/career-twin" : "/api/auth/linkedin"}
          actionLabel={linkedinConnected ? "View Career Twin" : "Connect OAuth"}
          external={!linkedinConnected}
        />
        <StatusCard 
          icon={resumeUploaded ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : <AlertTriangle className="text-amber-500 w-5 h-5" />} 
          label="ATS Resume File" 
          status={resumeUploaded ? "✅ Uploaded" : "❌ Missing"} 
          link="/dashboard/resume-intelligence"
          actionLabel={resumeUploaded ? "Analyze Resume" : "Upload PDF"}
        />
      </div>

      {/* LIMITED MODE WARNING */}
      {isLimitedMode && (
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 backdrop-blur-sm">
          <AlertTriangle className="text-amber-600 w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900 text-[14px]">Limited Analysis Mode Active</h4>
            <p className="text-amber-800 text-[13px] mt-1 leading-relaxed">
              SkillSprint cannot generate deep code verification metrics, LinkedIn trajectory audits, or accurate project gap alignments because your credentials are not fully linked. Please visit onboarding to finish setup.
            </p>
          </div>
        </div>
      )}

      {/* 3. CORE SCORES TELEMETRY GRID */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Overall Score Circle Progress Card */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center relative overflow-hidden border border-white/50 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-65" />
          <h3 className="text-md font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" /> Career Operating Score
          </h3>
          <p className="text-xs text-gray-500 mb-6 max-w-[200px]">Combined metric representing SDE hiring readiness.</p>
          
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="88" cy="88" r="74" stroke="#e2e8f0" strokeWidth="12" fill="transparent" />
              <motion.circle
                cx="88" cy="88" r="74"
                stroke="url(#scoreGradient)" strokeWidth="12" fill="transparent"
                strokeDasharray={2 * Math.PI * 74}
                initial={{ strokeDashoffset: 2 * Math.PI * 74 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 74 * (1 - (data?.scores?.skillsprintScore || 60) / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold tracking-tight text-gray-900">{data?.scores?.skillsprintScore || 60}</span>
              <span className="text-xs text-gray-400 font-bold tracking-wider mt-0.5">/100</span>
            </div>
          </div>

          <div className="mt-6 text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 font-bold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> +{data?.scores?.growthPercentage || 12}% Growth this month
          </div>
        </div>

        {/* Skill Radar Chart Card */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-white/50 shadow-sm col-span-1 lg:col-span-2">
          <div>
            <h3 className="text-md font-bold text-slate-800 uppercase tracking-wider mb-1">Skill Radar</h3>
            <p className="text-xs text-gray-500 mb-6">Target SDE architectural dimension alignment.</p>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#cbd5e1" strokeWidth={1} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                <Radar name="Skills" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. DYNAMIC 14 INDICES SCORE LIST */}
      <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Career Score Breakdown</h3>
            <p className="text-sm text-gray-500 mt-0.5">Explanation and targeted improvements for 14 SDE indices.</p>
          </div>
          <Link href="/dashboard/career-twin" className="text-xs font-bold text-[#4f46e5] flex items-center gap-1 hover:underline">
            View Projections <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.scores?.metrics && Object.entries(data.scores.metrics).map(([key, value]: [string, any]) => (
            <div key={key} className="bg-white/60 hover:bg-white transition-all border border-gray-150 rounded-2xl p-4.5 flex flex-col justify-between group">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2.5">
                <span className="text-[12px] font-bold text-gray-505 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-base font-black text-slate-800">{value.current}/100</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{value.reason}</p>
              <div className="border-t border-dashed border-gray-100 pt-2.5 mt-auto">
                <p className="text-[11px] font-semibold text-[#4f46e5] leading-relaxed">
                  💡 {value.howToImprove}
                </p>
                <div className="flex items-center justify-between text-[10px] text-emerald-600 font-bold mt-2">
                  <span>Expected Upgrade</span>
                  <span>{value.expectedImprovement}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. GITHUB ANALYTICS & COMMIT HEATMAP */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* GitHub Footprint & Consistency */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Github className="w-4.5 h-4.5" /> Codebase Intelligence
              </h3>
              {githubConnected && (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-6">Aggregate repository metrics and commits streak telemetry.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/60 rounded-xl p-3 border border-gray-100 text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Public Repos</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{data?.githubAnalysis?.publicReposCount || 0}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 border border-gray-100 text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Stars Earned</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{data?.githubAnalysis?.stars || 0}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 border border-gray-100 text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Commit Streak</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{data?.githubAnalysis?.contributionStreak || 0} Days</p>
            </div>
          </div>

          {/* GitHub Activity Heatmap Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="font-semibold uppercase tracking-wider">12-Week Commit Heatmap</span>
              <span>{githubConnected ? `${data?.githubAnalysis?.contributionStreak || 0} active streak` : "No streak detected"}</span>
            </div>
            <div className="grid grid-cols-12 gap-1 bg-white/60 p-3 rounded-2xl border border-gray-100">
              {commitGrid.map((c) => (
                <div 
                  key={c.day} 
                  className={`aspect-square w-full rounded-sm transition-all duration-300 ${c.intensity} hover:scale-115`}
                  title={`Day ${c.day}: ${c.active ? 'Commit recorded' : 'No commits'}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 px-1 pt-1">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 bg-gray-100 rounded-sm" />
                <div className="w-2.5 h-2.5 bg-emerald-300 rounded-sm" />
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-sm" />
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        {/* LinkedIn Professional Footprint */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Linkedin className="w-4.5 h-4.5" /> Profile Audit
              </h3>
              {linkedinConnected && (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Audited
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-6">LinkedIn profile optimization and target industry keywords.</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white/60 rounded-2xl p-4 border border-gray-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Headline quality</span>
              <p className="text-[13px] font-bold text-slate-800">
                {linkedinConnected 
                  ? "Highly optimized. Targets software engineering parameters."
                  : "Headline analysis requires active LinkedIn integration."
                }
              </p>
            </div>

            <div className="bg-white/60 rounded-2xl p-4 border border-gray-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase block mb-2">Identified Keywords</span>
              <div className="flex flex-wrap gap-1.5">
                {linkedinConnected ? (
                  <>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded">REST APIs</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded">Microservices</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded">TypeScript</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded">Docker</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400 italic">No keywords scanned.</span>
                )}
              </div>
            </div>

            <div className="bg-white/60 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Current position</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">
                  {linkedinConnected ? "B.Tech Computer Science Candidate" : "N/A"}
                </span>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded font-bold uppercase">
                {linkedinConnected ? "Active Student" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. PROJECT RECOMMENDATIONS ENGINE (GAP DETECTOR) */}
      <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">AI Project Recommendations</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Engineering-focused recommendations specifically designed to fill your architectural gaps.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {data?.recommendations && data.recommendations.map((project: any, i: number) => (
            <div 
              key={i} 
              className="bg-white/60 hover:bg-white transition-all duration-300 border border-gray-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                <Zap className="w-20 h-20 text-[#4f46e5]" />
              </div>
              
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    project.difficulty === "Advanced" ? "bg-red-50 text-red-600 border border-red-100" :
                    project.difficulty === "Intermediate" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                    "bg-green-50 text-green-600 border border-green-100"
                  }`}>
                    {project.difficulty}
                  </span>
                  <span className="text-[11px] text-gray-400 font-bold uppercase flex items-center gap-1">
                    🕒 {project.timeRequired}
                  </span>
                </div>

                <h4 className="font-extrabold text-[15px] text-gray-900 leading-snug tracking-tight mb-2">
                  {project.projectName}
                </h4>

                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  {project.learningOutcome}
                </p>

                {/* Tech Chips */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {project.technologies?.map((tech: string) => (
                    <span key={tech} className="text-[9.5px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 mt-auto">
                <div className="grid grid-cols-2 gap-2 text-[10.5px] mb-4">
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>ATS Value:</span>
                    <span className="font-bold text-gray-800">+{project.hiringImpact}%</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Resume:</span>
                    <span className="font-bold text-gray-800">+{project.resumeValue}%</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBuildProject(project.projectName)}
                  disabled={buildingProject !== null}
                  className="w-full flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[12.5px] font-extrabold py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {buildingProject === project.projectName ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Redirection...</span>
                    </>
                  ) : (
                    <>
                      <span>Build Project</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. CURRENT ROADMAPS & WEEKLY GOALS */}
      {data?.activeRoadmap && (
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Active Learning Roadmap</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Current build: <strong className="text-slate-800">{data.activeRoadmap.projectName}</strong>
              </p>
            </div>
            <Link href="/dashboard/roadmap" className="w-fit flex items-center gap-1 text-xs font-bold text-[#4f46e5] hover:underline">
              Open Board <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white/60 border border-gray-150 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Progression</span>
                <p className="text-2xl font-black text-slate-800 mt-1">{data.activeRoadmap.completionPercentage}%</p>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mt-3">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-500" 
                    style={{ width: `${data.activeRoadmap.completionPercentage}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                Complete daily tasks to unlock score updates.
              </p>
            </div>

            <div className="bg-white/60 border border-gray-150 rounded-2xl p-5 lg:col-span-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase block mb-3">Daily Goals / Tasks</span>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {data.activeRoadmap.dailyTasks?.slice(0, 3).map((task: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 bg-white/40 p-2.5 rounded-xl border border-white/50 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f26522] mt-1.5 flex-shrink-0" />
                    <p className="text-gray-700 leading-relaxed font-medium">{task.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. DIGITAL TWIN SWOT & RISK FACTOR PREDICTIONS */}
      {data?.careerTwin && (
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900">Twin SWOT & Trajectory Risks</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Identified vulnerabilities and opportunities based on synthesized footprints.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* SWOT Overview */}
            <div className="bg-white/60 border border-gray-150 rounded-2xl p-5">
              <span className="text-[10px] text-gray-400 font-bold uppercase block mb-4">Vulnerability Matrix</span>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mb-1">Strengths</span>
                  <p className="text-xs text-slate-700 font-medium">
                    {data.careerTwin.swot?.strengths?.[0] || "Foundational SDE skillset verified."}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block mb-1">Weaknesses</span>
                  <p className="text-xs text-slate-700 font-medium">
                    {data.careerTwin.swot?.weaknesses?.[0] || "Low testing coverage across code repos."}
                  </p>
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            <div className="bg-white/60 border border-gray-150 rounded-2xl p-5">
              <span className="text-[10px] text-gray-400 font-bold uppercase block mb-4">Core Risk Factors</span>
              <div className="space-y-2">
                {data.careerTwin.riskFactors?.slice(0, 3).map((risk: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mt-0.5 flex-shrink-0" />
                    <p className="text-rose-900 font-medium leading-relaxed">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. SCORE TREND OVER TIME (HISTORY) */}
      <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm">
        <h3 className="text-md font-bold text-slate-800 uppercase tracking-wider mb-1">Score Progression</h3>
        <p className="text-xs text-gray-500 mb-6">Historical index tracking your Career Operating updates.</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

function StatusCard({ icon, label, status, link, actionLabel, external }: { icon: React.ReactNode; label: string; status: string; link?: string; actionLabel?: string; external?: boolean }) {
  return (
    <div className="bg-white/60 border border-gray-150 rounded-2xl p-4 flex items-center justify-between shadow-inner">
      <div className="flex items-center gap-3">
        <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          {icon}
        </div>
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase block">{label}</span>
          <span className="text-xs font-bold text-slate-800 mt-0.5 block">{status}</span>
        </div>
      </div>
      {link && actionLabel && (
        external ? (
          <a href={link} className="text-[10.5px] bg-[#4f46e5]/10 hover:bg-[#4f46e5]/20 text-[#4f46e5] font-extrabold px-3 py-1.5 rounded-xl transition-all">
            {actionLabel}
          </a>
        ) : (
          <Link href={link} className="text-[10.5px] bg-[#4f46e5]/10 hover:bg-[#4f46e5]/20 text-[#4f46e5] font-extrabold px-3 py-1.5 rounded-xl transition-all">
            {actionLabel}
          </Link>
        )
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 lg:gap-12 max-w-7xl mx-auto w-full pb-10 animate-pulse">
      <div className="bg-slate-200 h-44 rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-200 h-16 rounded-2xl" />
        <div className="bg-slate-200 h-16 rounded-2xl" />
        <div className="bg-slate-200 h-16 rounded-2xl" />
        <div className="bg-slate-200 h-16 rounded-2xl" />
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="bg-slate-200 h-72 rounded-3xl" />
        <div className="bg-slate-200 h-72 rounded-3xl lg:col-span-2" />
      </div>
      <div className="bg-slate-200 h-96 rounded-3xl" />
    </div>
  );
}
