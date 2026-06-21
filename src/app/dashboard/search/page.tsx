"use client";

import { Search } from "lucide-react";

export default function SearchPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Search className="h-8 w-8 text-[#4f46e5]" /> Recruiter Talent Search
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Search for top candidates using semantic queries and filters.</p>
      </div>

      <div className="liquid-glass rounded-3xl h-[500px] flex items-center justify-center border border-white/50 shadow-sm">
        <p className="text-gray-500 font-medium">Search interface and candidate radar coming soon.</p>
      </div>
    </div>
  );
}
