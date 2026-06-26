"use client";

import { useEffect, useState } from "react";
import { 
  Shield, 
  Users, 
  Trophy, 
  Activity, 
  RefreshCw, 
  Database, 
  Terminal, 
  UserPlus, 
  Play,
  AlertOctagon,
  Cpu,
  Layers,
  Settings2,
  CheckCircle,
  HelpCircle,
  FileCode
} from "lucide-react";
import { getAdminStats, seedDummyCandidates, type AdminStats } from "@/actions/admin";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [seedSuccess, setSeedSuccess] = useState(false);

  async function loadStats() {
    try {
      const res = await getAdminStats();
      setStats(res);
    } catch (err) {
      console.error("Failed to load admin stats", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedSuccess(false);
    try {
      await seedDummyCandidates();
      setSeedSuccess(true);
      await loadStats();
    } catch (err) {
      console.error("Failed to seed mock data", err);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium text-[15px]">Retrieving system telemetry...</p>
      </div>
    );
  }

  // Simulated daily analytics for the chart
  const analyticsData = [
    { day: "Mon", apiCalls: 240, tokens: 45 },
    { day: "Tue", apiCalls: 310, tokens: 62 },
    { day: "Wed", apiCalls: 480, tokens: 90 },
    { day: "Thu", apiCalls: 590, tokens: 120 },
    { day: "Fri", apiCalls: 620, tokens: 130 },
    { day: "Sat", apiCalls: 420, tokens: 85 },
    { day: "Sun", apiCalls: stats?.apiRequests ? Math.round(stats.apiRequests / 10) : 380, tokens: 78 }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto w-full pb-10">
      
      {/* Header */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
              <Shield className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-white flex items-center gap-3">
                Admin Console
              </h1>
              <p className="text-slate-300 mt-1.5 text-sm font-medium">
                Manage database telemetry, system error logs, background job queues, and seeding triggers.
              </p>
            </div>
          </div>
          <button 
            onClick={loadStats} 
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white rounded-full px-5 py-2.5 text-sm font-semibold border border-white/10 backdrop-blur-md transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* 1. Telemetry Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard title="Total Users" value={stats.totalUsers} icon={<Users className="w-4 h-4 text-indigo-500" />} subtitle="Registered candidates" />
          <StatCard title="Average SDE ATS" value={`${stats.averageScore}/100`} icon={<Activity className="w-4 h-4 text-[#F26522]" />} subtitle="Resume score index" />
          <StatCard title="Background Jobs" value={stats.activeBackgroundJobs} icon={<Layers className="w-4 h-4 text-emerald-500" />} subtitle="Active sync processes" />
          <StatCard title="System Errors" value={stats.systemErrors} icon={<AlertOctagon className="w-4 h-4 text-rose-500" />} subtitle="Failed API transactions" />
          
          <StatCard title="API Requests" value={stats.apiRequests.toLocaleString()} icon={<Cpu className="w-4 h-4 text-blue-500" />} subtitle="Total transactions" />
          <StatCard title="AI Tokens Spent" value={stats.aiTokensUsed.toLocaleString()} icon={<FileCode className="w-4 h-4 text-purple-500" />} subtitle="Gemini model consumption" />
          <StatCard title="Student Profiles" value={stats.totalStudents} icon={<Trophy className="w-4 h-4 text-amber-500" />} subtitle="Active twin nodes" />
          <StatCard title="DB Connection" value={process.env.DATABASE_URL ? "PG Pool" : "JSON Fallback"} icon={<Database className="w-4 h-4 text-teal-500" />} subtitle="Active client schema" />
        </div>
      )}

      {/* 2. Charts & Seed Tools Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* API load chart */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-slate-800 uppercase tracking-wider mb-1">System Transactions Traffic</h3>
            <p className="text-xs text-gray-500 mb-6">Historical weekly log of API gateway transactions.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="apiCalls" name="API Calls" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Seeding Box */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-md font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-gray-150 flex items-center gap-2">
              <UserPlus className="w-4.5 h-4.5 text-[#4f46e5]" /> Live Seeding
            </h3>
            <p className="text-xs text-gray-600 leading-normal font-medium">
              Seed Priya Sharma (AI Engineer, IIT Madras) and Rohan Mehta (Backend Developer, BITS Pilani) to test recruiter matching filters, Talent Leaderboards, and mock interview transcripts.
            </p>
            <p className="text-xs text-gray-600 leading-normal font-medium">
              This triggers mock twin predictions, project roadmaps, and SDE scores.
            </p>
          </div>

          {seedSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold p-3.5 rounded-2xl mt-4">
              ✅ Priya Sharma and Rohan Mehta successfully seeded!
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-150 flex justify-end">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-extrabold rounded-full px-6 py-3 transition-all disabled:opacity-70 shadow cursor-pointer"
            >
              {seeding ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Seeding Database...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Seed Demo Twin Profiles
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* 3. Background Jobs Sync Queue & Errors Console */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Background Jobs List */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Layers className="w-4.5 h-4.5" /> Sync Background Jobs
            </h3>
            <p className="text-xs text-gray-500 mb-6">Status of OAuth background footprint sync pipelines.</p>
          </div>

          <div className="space-y-3">
            {stats?.recentJobs?.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3.5 bg-white/60 rounded-2xl border border-gray-150 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-[10px]">
                    {job.id}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block">{job.name}</span>
                    <span className="text-[10px] text-gray-400 font-bold block mt-0.5">{job.timestamp} • Duration: {job.duration}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  job.status === "success" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                  "bg-rose-50 text-rose-600 border border-rose-100"
                }`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error logs scrolling terminal */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Terminal className="w-4.5 h-4.5" /> Telemetry Errors Console
            </h3>
            <p className="text-xs text-gray-500 mb-6">Realtime sync logging stream. Checks token decryptions.</p>
          </div>

          <div className="bg-[#0f172a] rounded-2xl p-4 font-mono text-[11px] text-slate-300 min-h-48 overflow-y-auto space-y-2.5 border border-slate-800 shadow-inner">
            {stats?.errorLogs?.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 flex-shrink-0">[{log.timestamp}]</span>
                <span className={`font-bold flex-shrink-0 uppercase text-[9px] px-1 rounded ${
                  log.level === "error" ? "bg-rose-500/25 text-rose-400" :
                  log.level === "warning" ? "bg-amber-500/25 text-amber-400" :
                  "bg-emerald-500/25 text-emerald-400"
                }`}>
                  {log.level}
                </span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 pt-2 border-t border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Listening to system triggers...</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

function StatCard({ title, value, icon, subtitle }: { title: string; value: string | number; icon: React.ReactNode; subtitle: string }) {
  return (
    <div className="liquid-glass rounded-2xl p-5 border border-white/50 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
        <div className="bg-white p-1.5 rounded-full shadow-sm">{icon}</div>
      </div>
      <div>
        <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">{value}</span>
        <p className="text-[10px] font-bold text-gray-400 mt-1 leading-none">{subtitle}</p>
      </div>
    </div>
  );
}
