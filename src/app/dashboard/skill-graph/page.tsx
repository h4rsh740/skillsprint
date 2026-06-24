"use client";

import { Network } from "lucide-react";

export default function SkillGraphPage() {
  return (
    <div className="space-y-8 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <Network className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white flex items-center gap-3">
              3D Skill Graph
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              Interactive visualization of your skills and their dependencies.
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-[500px] liquid-glass rounded-3xl overflow-hidden relative border border-white/50 shadow-sm">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 font-medium">Three.js 3D Skill Canvas coming soon.</p>
        </div>
      </div>
    </div>
  );
}
