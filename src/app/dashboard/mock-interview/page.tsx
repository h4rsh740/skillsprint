"use client";

import { Mic, Settings, Play } from "lucide-react";

export default function MockInterviewPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Mic className="h-8 w-8 text-[#4f46e5]" /> AI Mock Interview Agent
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Practice real-time voice interviews with our AI Agent tailored to your target role.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 liquid-glass rounded-3xl h-[500px] flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-gray-300">
          <div className="w-24 h-24 rounded-full bg-[#4f46e5]/10 flex items-center justify-center mb-6 shadow-[0_0_0_8px_rgba(79,70,229,0.05)]">
            <Mic className="h-10 w-10 text-[#4f46e5]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Ready for your interview?</h3>
          <p className="text-gray-500 mt-2 mb-8 max-w-sm">Ensure your microphone is connected and you are in a quiet environment.</p>
          <button className="group flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] font-medium rounded-full pl-6 pr-2 py-2.5 transition-colors">
            <div className="h-[20px] overflow-hidden relative">
              <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                <span className="h-[20px] flex items-center">Start Interview</span>
                <span className="h-[20px] flex items-center">Start Interview</span>
              </div>
            </div>
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-[#4f46e5] ml-0.5" />
            </div>
          </button>
        </div>

        <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6 h-fit">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
            <Settings className="w-5 h-5 text-gray-900" />
            <h3 className="font-semibold text-gray-900">Interview Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[13px] font-medium text-gray-700 block mb-1.5">Interview Type</label>
              <select className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20">
                <option>Technical (Frontend)</option>
                <option>Technical (Backend)</option>
                <option>System Design</option>
                <option>Behavioral / HR</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-gray-700 block mb-1.5">Target Company</label>
              <select className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20">
                <option>Google / Alphabet</option>
                <option>Microsoft</option>
                <option>Amazon</option>
                <option>Stripe</option>
                <option>General Tier-1</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-gray-700 block mb-1.5">Difficulty</label>
              <select className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20">
                <option>SDE-1 (Entry Level)</option>
                <option>Internship</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
