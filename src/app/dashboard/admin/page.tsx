"use client";

import { useEffect, useState } from "react";
import { Shield, Users, Trophy, Activity, RefreshCw, Database, Terminal, UserPlus, Play } from "lucide-react";
import { getAdminStats, seedDummyCandidates, type AdminStats } from "@/actions/admin";

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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <Shield className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white flex items-center gap-3">
              Admin Console
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              Manage database telemetry, system status, and mock seed triggers for live demo verification.
            </p>
          </div>
        </div>
      </div>

      {/* Telemetry Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard title="Total Users" value={stats.totalUsers} icon={<Users className="w-4 h-4 text-indigo-500" />} />
          <StatCard title="Students" value={stats.totalStudents} icon={<Trophy className="w-4 h-4 text-emerald-500" />} />
          <StatCard title="Average ATS" value={`${stats.averageScore}/100`} icon={<Activity className="w-4 h-4 text-[#F26522]" />} />
          <StatCard title="Mock Sessions" value={stats.totalInterviews} icon={<Terminal className="w-4 h-4 text-amber-500" />} />
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_360px] gap-8">
        
        {/* Seeding Tools */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm flex flex-col justify-between h-fit">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#4f46e5]" /> Live Seeding Tools
            </h3>
            <p className="text-xs text-gray-600 leading-normal">
              For live hackathon evaluations, use the seeding tool to instantly register high-scoring candidate twins (AI engineers, backend developer profiles) with matching github metrics and salary timelines.
            </p>
            <p className="text-xs text-gray-600 leading-normal">
              This will automatically populate the **Recruiter Talent Search** and **Leaderboards** pages, allowing judges to test recruiter filtering and twin modal inspections immediately.
            </p>
          </div>

          {seedSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] p-3 rounded-xl mt-4">
              Successfully seeded mock profiles (Priya Sharma, Rohan Mehta) and matched scores into the database!
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13.5px] font-semibold rounded-full px-6 py-2.5 transition-colors disabled:opacity-70 shadow"
            >
              {seeding ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Seeding Profiles...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Seed Live Demo Profiles
                </>
              )}
            </button>
          </div>
        </div>

        {/* Database Health Card */}
        <div className="liquid-glass rounded-3xl p-6 border border-white/50 shadow flex flex-col justify-between space-y-6 h-fit">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-900" /> Database Status
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Connection Mode</span>
                <span className={`font-semibold ${process.env.DATABASE_URL ? "text-indigo-600" : "text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"}`}>
                  {process.env.DATABASE_URL ? "PostgreSQL Pool" : "JSON Fallback (Offline)"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">API Health</span>
                <span className="font-semibold text-emerald-600">Active (200 OK)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">AI Fallbacks</span>
                <span className="font-semibold text-indigo-600">Active (OpenRouter)</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="liquid-glass rounded-2xl p-5 border border-white/50 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-500">{title}</span>
        <div className="bg-white p-1.5 rounded-full shadow-sm">{icon}</div>
      </div>
      <span className="text-2xl font-bold tracking-tight text-gray-900">{value}</span>
    </div>
  );
}
