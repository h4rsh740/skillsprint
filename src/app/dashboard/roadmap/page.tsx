"use client";

import { Map } from "lucide-react";

export default function RoadmapPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Map className="h-8 w-8 text-[#4f46e5]" /> Learning Roadmap
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Your personalized, step-by-step path to becoming placement-ready.</p>
      </div>

      <div className="liquid-glass rounded-3xl h-96 flex items-center justify-center border border-white/50 shadow-sm">
        <p className="text-gray-500 font-medium">Interactive Roadmap Timeline coming soon.</p>
      </div>
    </div>
  );
}
