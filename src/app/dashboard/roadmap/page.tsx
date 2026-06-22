"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Map, Target, Calendar, CheckCircle2, Circle, RefreshCw, Layers } from "lucide-react";
import { getRoadmap, generateRoadmap, toggleTask, type RoadmapResult } from "@/actions/roadmap";

export default function RoadmapPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetCompany, setTargetCompany] = useState("");
  const [roadmap, setRoadmap] = useState<RoadmapResult | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    getRoadmap().then(data => {
      if (data) setRoadmap(data);
      setLoadingInitial(false);
    });
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const formData = new FormData();
      if (targetCompany) formData.append("targetCompany", targetCompany);
      const data = await generateRoadmap(formData);
      setRoadmap(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggle = async (period: "daily" | "weekly" | "monthly", index: number, completed: boolean) => {
    if (!roadmap) return;
    
    // Optimistic update
    const updated = { ...roadmap };
    updated[`${period}Tasks`][index].completed = completed;
    setRoadmap(updated);

    try {
      const serverUpdated = await toggleTask(roadmap.id, period, index, completed);
      setRoadmap(serverUpdated);
    } catch (error) {
      console.error(error);
      // Revert on error could be implemented here
    }
  };

  if (loadingInitial) {
    return (
      <div className="h-96 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Map className="h-8 w-8 text-[#4f46e5]" /> Career GPS
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Goal-based roadmap from your current state to your target role.</p>
      </div>

      {!roadmap ? (
        <div className="liquid-glass rounded-3xl p-8 sm:p-12 max-w-3xl mx-auto shadow-sm border border-gray-200 mt-12 text-center">
          <div className="p-6 rounded-full bg-[#4f46e5]/10 w-fit mx-auto mb-6">
            <Target className="h-10 w-10 text-[#4f46e5]" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">Set Your Destination</h2>
          <p className="text-gray-500 mb-8">Tell us where you want to go, and we'll map out the exact skills and milestones to get there.</p>

          <form onSubmit={handleGenerate} className="max-w-md mx-auto space-y-4">
            <input 
              type="text" 
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="e.g. Google, Microsoft, Startup"
              className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 placeholder:text-gray-400 text-center"
            />
            
            <button 
              type="submit"
              disabled={isGenerating}
              className="w-full flex justify-center items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] font-medium rounded-full py-3.5 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating Roadmap...
                </>
              ) : (
                <>
                  <Map className="w-4 h-4" />
                  Generate 90-Day GPS
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6"
        >
          {/* Left Column: Milestones */}
          <div className="space-y-6">
            <div className="liquid-glass-light rounded-3xl p-6 sm:p-8 border border-white/50">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">30-60-90 Day Roadmap</h3>
                  <p className="text-gray-500 text-[14px] mt-1">Check off tasks to track your velocity.</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[12px] font-semibold text-[#4f46e5] uppercase tracking-wider mb-1">Progress</span>
                  <div className="text-3xl font-bold text-gray-900 leading-none">{roadmap.completionPercentage}%</div>
                </div>
              </div>
              
              <div className="h-2 w-full bg-white/60 rounded-full overflow-hidden mb-8 border border-gray-100">
                <div 
                  className="h-full bg-gradient-to-r from-[#4f46e5] to-[#8b5cf6] rounded-full transition-all duration-1000" 
                  style={{ width: `${roadmap.completionPercentage}%` }} 
                />
              </div>

              <div className="space-y-8">
                {/* Daily Habits */}
                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    <Calendar className="w-5 h-5 text-emerald-500" /> Daily Habits
                  </h4>
                  <div className="space-y-2">
                    {roadmap.dailyTasks.map((task, i) => (
                      <TaskRow key={i} task={task} onToggle={(v) => handleToggle("daily", i, v)} />
                    ))}
                  </div>
                </div>

                {/* Weekly Goals */}
                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    <Layers className="w-5 h-5 text-blue-500" /> Weekly Goals
                  </h4>
                  <div className="space-y-2">
                    {roadmap.weeklyTasks.map((task, i) => (
                      <TaskRow key={i} task={task} onToggle={(v) => handleToggle("weekly", i, v)} />
                    ))}
                  </div>
                </div>

                {/* Monthly Milestones */}
                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    <Target className="w-5 h-5 text-[#8b5cf6]" /> Monthly Milestones
                  </h4>
                  <div className="space-y-2">
                    {roadmap.monthlyTasks.map((task, i) => (
                      <TaskRow key={i} task={task} onToggle={(v) => handleToggle("monthly", i, v)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Goal & Gap Analysis */}
          <div className="space-y-6">
            <div className="liquid-glass-light rounded-3xl p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Destination Goal</h3>
              <div className="p-4 rounded-xl border border-dashed border-[#8b5cf6]/40 bg-[#8b5cf6]/5 text-[14px] leading-relaxed text-gray-700">
                <strong className="text-gray-900 block text-[16px] mb-1">{roadmap.targetRole} at {roadmap.targetCompany}</strong>
                Current position: strong foundations, moderate project depth, but gaps identified in target requirements.
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-4">Missing Skills</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {roadmap.missingSkills?.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-white/60 border border-gray-200 text-gray-700 text-[13px] rounded-full font-medium shadow-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {skill}
                  </span>
                ))}
              </div>

              <button 
                onClick={() => setRoadmap(null)}
                className="w-full mt-2 flex justify-center items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 text-[14px] font-medium rounded-full py-3.5 transition-colors border border-gray-200 shadow-sm"
              >
                Set New Destination
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: any, onToggle: (val: boolean) => void }) {
  return (
    <div 
      className="flex items-start gap-3 p-3.5 rounded-xl bg-white/40 border border-white/40 hover:bg-white/60 transition-colors cursor-pointer group"
      onClick={() => onToggle(!task.completed)}
    >
      <div className="mt-0.5 shrink-0">
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 transition-transform group-hover:scale-110" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
        )}
      </div>
      <p className={`text-[14px] leading-snug transition-all ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
        {task.text}
      </p>
    </div>
  );
}
