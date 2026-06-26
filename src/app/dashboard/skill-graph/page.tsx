"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Network, 
  BookOpen, 
  ExternalLink, 
  CheckCircle, 
  HelpCircle, 
  X,
  Compass,
  CornerDownRight
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SKILL_NODES, type Skill } from "@/components/dashboard/ThreeCanvas";

// Dynamically import the 3D canvas with SSR disabled to prevent WebGL compilation errors during hydration
const ThreeCanvas = dynamic(() => import("@/components/dashboard/ThreeCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/5 text-slate-400 gap-3">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="font-semibold text-sm">Compiling 3D Skill Graph Node Canvas...</span>
    </div>
  )
});

export default function SkillGraphPage() {
  const { user } = useAuth();
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [userSkillsList, setUserSkillsList] = useState<string[]>(["React", "JavaScript"]);

  useEffect(() => {
    async function loadSkills() {
      try {
        const { getStudentProfileForTwin } = await import("@/actions/career-twin");
        const profile = await getStudentProfileForTwin();
        if (profile?.skills) {
          const list = profile.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
          if (list.length > 0) {
            setUserSkillsList(list);
          }
        }
      } catch (err) {
        console.error("Failed to load skills for 3D graph:", err);
      }
    }
    loadSkills();
  }, [user]);

  const userSkillsSet = useMemo(() => {
    return new Set(userSkillsList.map(s => s.toLowerCase().trim()));
  }, [userSkillsList]);

  const hasSkill = (skill: Skill) => {
    return userSkillsSet.has(skill.name.toLowerCase().trim()) || 
           userSkillsSet.has(skill.id.toLowerCase().trim());
  };

  // Count acquired vs. missing
  const { acquiredCount, missingCount } = useMemo(() => {
    let acquired = 0;
    let missing = 0;
    SKILL_NODES.forEach(node => {
      if (userSkillsSet.has(node.name.toLowerCase().trim()) || userSkillsSet.has(node.id.toLowerCase().trim())) {
        acquired++;
      } else {
        missing++;
      }
    });
    return { acquiredCount: acquired, missingCount: missing };
  }, [userSkillsSet]);

  return (
    <div className="space-y-8 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto w-full pb-10">
      
      {/* Header Banner */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <Network className="h-6 w-6 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-white flex items-center gap-3">
              3D Skill Graph
            </h1>
            <p className="text-slate-300 mt-1.5 text-sm font-medium">
              Interactive WebGL visualization of your active SDE skill network and architectural dependency paths.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Canvas & Detail Panel */}
      <div className="grid lg:grid-cols-3 gap-8 flex-1 min-h-[600px]">
        
        {/* WebGL Canvas Card */}
        <div className="lg:col-span-2 rounded-3xl overflow-hidden relative border border-white/50 bg-white/50 backdrop-blur-sm shadow-sm flex flex-col justify-between min-h-[500px]">
          {/* Info Overlays */}
          <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-md border border-gray-150 rounded-2xl p-4 max-w-xs shadow-sm">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Controls</h3>
            <ul className="text-[11px] text-gray-600 space-y-1 font-medium">
              <li>• Drag: Rotate space orientation</li>
              <li>• Scroll: Zoom camera focal length</li>
              <li>• Right-Click + Drag: Pan camera</li>
              <li>• Click Node: Open skill specs & resources</li>
            </ul>
          </div>

          <div className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-md border border-gray-150 rounded-2xl p-4 shadow-sm flex gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
              <span className="text-[11px] font-bold text-gray-700">Acquired ({acquiredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/30" />
              <span className="text-[11px] font-bold text-gray-700">Missing ({missingCount})</span>
            </div>
          </div>

          {/* Actual canvas */}
          <div className="flex-1 w-full h-full relative">
            <ThreeCanvas 
              userSkills={userSkillsList} 
              onSelectSkill={(skill) => setSelectedSkill(skill)} 
            />
          </div>
        </div>

        {/* Dynamic Detail Panel Sidebar */}
        <div className="rounded-3xl border border-white/50 bg-white/50 backdrop-blur-sm shadow-sm p-6 sm:p-8 flex flex-col h-full justify-between">
          <AnimatePresence mode="wait">
            {selectedSkill ? (
              <motion.div 
                key={selectedSkill.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  {/* Top: Header & Close */}
                  <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {selectedSkill.category}
                      </span>
                      <h2 className="text-xl font-black text-gray-900 mt-1.5 leading-none">
                        {selectedSkill.name}
                      </h2>
                    </div>
                    <button 
                      onClick={() => setSelectedSkill(null)}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {hasSkill(selectedSkill) ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 font-extrabold">
                        <CheckCircle className="w-4 h-4" /> Acquired Footprint Scanned
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 font-extrabold animate-pulse">
                        <HelpCircle className="w-4 h-4" /> Missing / Gap Detected
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Description</span>
                    <p className="text-xs sm:text-sm text-gray-650 leading-relaxed font-medium bg-white/40 p-3.5 rounded-2xl border border-white/50">
                      {selectedSkill.description}
                    </p>
                  </div>

                  {/* Dependency Chain */}
                  {selectedSkill.dependencies.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Required Dependencies</span>
                      <div className="space-y-1">
                        {selectedSkill.dependencies.map(depId => {
                          const dep = SKILL_NODES.find(s => s.id === depId);
                          return (
                            <div key={depId} className="flex items-center gap-2 text-xs font-bold text-gray-700 pl-1">
                              <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{dep?.name || depId}</span>
                              {dep && (
                                <span className={`text-[9px] px-1.5 rounded font-black ${
                                  hasSkill(dep) ? 'bg-emerald-50 text-emerald-650' : 'bg-amber-50 text-amber-650'
                                }`}>
                                  {hasSkill(dep) ? 'Acquired' : 'Missing'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Free Learning Resources */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-500" /> Curated Learning Tutorials
                  </span>
                  <div className="space-y-2">
                    {selectedSkill.resources.map((res, idx) => (
                      <a
                        key={idx}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-white/60 hover:bg-white hover:border-indigo-300 transition-all border border-gray-150 rounded-2xl text-xs font-bold text-[#4f46e5] group"
                      >
                        <span className="truncate pr-4">{res.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center h-full my-auto py-12"
              >
                <div className="p-4 bg-indigo-50 rounded-full text-indigo-500 mb-4 animate-bounce">
                  <Compass className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-gray-800 text-[15px]">No Skill Selected</h3>
                <p className="text-xs text-gray-500 mt-2 max-w-[200px] leading-relaxed">
                  Click any floating 3D sphere node in the WebGL canvas to inspect details, dependencies, and resources.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
