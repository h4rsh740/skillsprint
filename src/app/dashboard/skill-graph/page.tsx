"use client";

import { Network } from "lucide-react";

export default function SkillGraphPage() {
  return (
    <div className="space-y-8 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Network className="h-8 w-8 text-[#4f46e5]" /> 3D Skill Graph
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Interactive visualization of your skills and their dependencies.</p>
      </div>
      <div className="flex-1 min-h-[500px] liquid-glass rounded-3xl overflow-hidden relative border border-white/50 shadow-sm">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 font-medium">Three.js 3D Skill Canvas coming soon.</p>
        </div>
      </div>
    </div>
  );
}
