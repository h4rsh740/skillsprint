"use client";

import { useState } from "react";
import { Search, Filter, Briefcase, Code, MapPin, ChevronRight, User } from "lucide-react";

const mockCandidates = [
  { id: 1, name: "Alex Developer", role: "Frontend Engineer", location: "San Francisco, CA", placementProb: 88, matchScore: 92, skills: ["React", "Next.js", "TypeScript"] },
  { id: 2, name: "Sarah Backend", role: "Backend Engineer", location: "Remote", placementProb: 75, matchScore: 85, skills: ["Node.js", "Python", "PostgreSQL"] },
  { id: 3, name: "Michael Fullstack", role: "Full Stack Developer", location: "New York, NY", placementProb: 62, matchScore: 78, skills: ["React", "Express", "MongoDB"] },
];

export default function RecruiterSearchPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Search className="h-8 w-8 text-[#4f46e5]" /> Recruiter Discovery
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Find pre-vetted candidates ranked by algorithmic placement probability.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 space-y-6 sticky top-8 self-start">
          <div className="liquid-glass rounded-3xl p-6 border border-white/50 shadow-sm">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-500" /> Filters
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wider block mb-2">Role</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[14px] text-gray-700 cursor-pointer">
                    <input type="checkbox" className="rounded text-[#4f46e5] focus:ring-[#4f46e5] border-gray-300 bg-white/60" defaultChecked /> Frontend
                  </label>
                  <label className="flex items-center gap-2 text-[14px] text-gray-700 cursor-pointer">
                    <input type="checkbox" className="rounded text-[#4f46e5] focus:ring-[#4f46e5] border-gray-300 bg-white/60" /> Backend
                  </label>
                  <label className="flex items-center gap-2 text-[14px] text-gray-700 cursor-pointer">
                    <input type="checkbox" className="rounded text-[#4f46e5] focus:ring-[#4f46e5] border-gray-300 bg-white/60" /> Full Stack
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wider block mb-2">Tech Stack</label>
                <select className="w-full bg-white/60 border border-gray-200 rounded-xl px-3 py-2 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20">
                  <option>Any Framework</option>
                  <option>React / Next.js</option>
                  <option>Vue / Nuxt</option>
                  <option>Node / Express</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wider block mb-2">Readiness</label>
                <select className="w-full bg-white/60 border border-gray-200 rounded-xl px-3 py-2 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20">
                  <option>&gt; 80% Probability</option>
                  <option>&gt; 60% Probability</option>
                  <option>All Candidates</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, skill, or keywords..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/80 border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 shadow-sm"
            />
          </div>

          <div className="space-y-4">
            {mockCandidates.map(candidate => (
              <div key={candidate.id} className="liquid-glass-light rounded-3xl p-6 border border-white/50 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col sm:flex-row gap-6 items-center sm:items-start group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                  <User className="w-8 h-8" />
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{candidate.name}</h3>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1 text-[13px] text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {candidate.role}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {candidate.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Placement Prob.</div>
                        <div className="text-[15px] font-bold text-[#4f46e5] bg-[#4f46e5]/10 px-2.5 py-0.5 rounded-full inline-block">
                          {candidate.placementProb}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                    {candidate.skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 text-[12px] font-medium rounded-md bg-white border border-gray-200 text-gray-700 flex items-center gap-1 shadow-sm">
                        <Code className="w-3 h-3 text-gray-400" /> {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="hidden sm:flex items-center justify-center self-stretch px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
