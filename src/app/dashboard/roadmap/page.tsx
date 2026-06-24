"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Target, RefreshCw, Briefcase, MapPin, Code, Bell, ChevronDown, MoreVertical, Calendar, Clock, Plus, Trash2, User, ChevronRight, CheckSquare, Layers } from "lucide-react";
import { getRoadmap, generateRoadmap, toggleTask, addRoadmapTask, deleteRoadmapTask, type RoadmapResult } from "@/actions/roadmap";

// Interactive Flowchart Task Component
function FlowTask({ 
  task, 
  onToggle 
}: { 
  task: any; 
  onToggle: (val: boolean) => void;
}) {
  return (
    <motion.div 
      whileHover={{ scale: 1.025, boxShadow: "0 8px 12px -3px rgba(0, 0, 0, 0.04)" }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onToggle(!task.completed)}
      className={`bg-white border border-gray-200 rounded-xl p-3 text-[12px] text-slate-800 flex items-start gap-2.5 shadow-sm max-w-[240px] w-full transition-all duration-300 cursor-pointer select-none ${
        task.completed ? 'bg-[#fafafa]/80 border-gray-200/50 opacity-60' : 'hover:border-indigo-400'
      }`}
    >
      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
        task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-gray-50'
      }`}>
        {task.completed && <span className="text-[8px] font-extrabold">✓</span>}
      </div>
      <span className={`font-semibold leading-normal text-left block text-slate-700 ${task.completed ? 'line-through text-gray-400 font-medium' : ''}`}>
        {task.text}
      </span>
    </motion.div>
  );
}

// Flowchart Group Component for Map View
function TaskGroupFlow({ 
  title, 
  tasks, 
  period, 
  onToggle 
}: { 
  title: string; 
  tasks: any[]; 
  period: "daily" | "weekly" | "monthly"; 
  onToggle: (period: "daily" | "weekly" | "monthly", idx: number, val: boolean) => void;
}) {
  return (
    <div className="w-full">
      {/* Category Node */}
      <div className="flex justify-center my-4 z-10 relative">
        <div className="bg-slate-900 border border-slate-800 text-white rounded-lg px-4 py-1.5 font-bold text-[11px] text-center shadow-sm tracking-wider uppercase w-36">
          {title}
        </div>
      </div>

      {/* Row 1: Tasks 0 and 1 */}
      <div className="flex items-center justify-center gap-6 relative my-6">
        {/* Left Branch */}
        <div className="flex-1 flex flex-col items-end pr-2 relative max-w-[240px]">
          {tasks[0] && (
            <>
              <FlowTask task={tasks[0]} onToggle={(v) => onToggle(period, 0, v)} />
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 h-[1.5px] transition-all duration-500 ${tasks[0].completed ? "bg-emerald-500 w-4" : "bg-gray-300 w-2"}`} />
            </>
          )}
        </div>

        {/* Center line gap */}
        <div className="w-12 flex-shrink-0" />

        {/* Right Branch */}
        <div className="flex-1 flex flex-col items-start pl-2 relative max-w-[240px]">
          {tasks[1] && (
            <>
              <FlowTask task={tasks[1]} onToggle={(v) => onToggle(period, 1, v)} />
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-[1.5px] transition-all duration-500 ${tasks[1].completed ? "bg-emerald-500 w-4" : "bg-gray-300 w-2"}`} />
            </>
          )}
        </div>
      </div>

      {/* Row 2: Tasks 2 and 3 */}
      <div className="flex items-center justify-center gap-6 relative my-6">
        {/* Left Branch */}
        <div className="flex-1 flex flex-col items-end pr-2 relative max-w-[240px]">
          {tasks[2] && (
            <>
              <FlowTask task={tasks[2]} onToggle={(v) => onToggle(period, 2, v)} />
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 h-[1.5px] transition-all duration-500 ${tasks[2].completed ? "bg-emerald-500 w-4" : "bg-gray-300 w-2"}`} />
            </>
          )}
        </div>

        {/* Center line gap */}
        <div className="w-12 flex-shrink-0" />

        {/* Right Branch */}
        <div className="flex-1 flex flex-col items-start pl-2 relative max-w-[240px]">
          {tasks[3] && (
            <>
              <FlowTask task={tasks[3]} onToggle={(v) => onToggle(period, 3, v)} />
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-[1.5px] transition-all duration-500 ${tasks[3].completed ? "bg-emerald-500 w-4" : "bg-gray-300 w-2"}`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetCompany, setTargetCompany] = useState("");
  const [duration, setDuration] = useState("90");
  const [roadmap, setRoadmap] = useState<RoadmapResult | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // View state - optimized for responsive tabs
  const [activeMobileTab, setActiveMobileTab] = useState<"tasks" | "map" | "gaps">("tasks");
  const [desktopViewMode, setDesktopViewMode] = useState<"checklist" | "flowchart">("checklist");
  const [activeMenuIdx, setActiveMenuIdx] = useState<number | null>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitText, setNewHabitText] = useState("");

  // Calendar setup (Jun 24, 2026 - Wednesday)
  const daysOfWeek = [
    { name: "S", num: 21 },
    { name: "M", num: 22 },
    { name: "T", num: 23 },
    { name: "W", num: 24, active: true },
    { name: "T", num: 25 },
    { name: "F", num: 26 },
    { name: "S", num: 27 },
  ];

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
      formData.append("duration", duration);
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
    
    const updatedTasks = {
      dailyTasks: roadmap.dailyTasks.map((t, i) => period === "daily" && i === index ? { ...t, completed } : t),
      weeklyTasks: roadmap.weeklyTasks.map((t, i) => period === "weekly" && i === index ? { ...t, completed } : t),
      monthlyTasks: roadmap.monthlyTasks.map((t, i) => period === "monthly" && i === index ? { ...t, completed } : t),
    };
    
    const total = updatedTasks.dailyTasks.length + updatedTasks.weeklyTasks.length + updatedTasks.monthlyTasks.length;
    const done = 
      updatedTasks.dailyTasks.filter(t => t.completed).length +
      updatedTasks.weeklyTasks.filter(t => t.completed).length +
      updatedTasks.monthlyTasks.filter(t => t.completed).length;
      
    const updated = {
      ...roadmap,
      ...updatedTasks,
      completionPercentage: total > 0 ? Math.round((done / total) * 100) : 0,
    };
    
    setRoadmap(updated);

    try {
      const serverUpdated = await toggleTask(roadmap.id, period, index, completed);
      setRoadmap(serverUpdated);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitText.trim() || !roadmap) return;
    try {
      const updated = await addRoadmapTask(roadmap.id, "daily", newHabitText.trim());
      setRoadmap(updated);
      setNewHabitText("");
      setIsAddingHabit(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (period: "daily" | "weekly" | "monthly", idx: number) => {
    if (!roadmap) return;
    try {
      const updated = await deleteRoadmapTask(roadmap.id, period, idx);
      setRoadmap(updated);
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingInitial) {
    return (
      <div className="h-96 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  const totalCount = roadmap ? (roadmap.dailyTasks.length + roadmap.weeklyTasks.length + roadmap.monthlyTasks.length) : 0;
  const completedCount = roadmap ? (
    roadmap.dailyTasks.filter(t => t.completed).length +
    roadmap.weeklyTasks.filter(t => t.completed).length +
    roadmap.monthlyTasks.filter(t => t.completed).length
  ) : 0;
  const remainingCount = totalCount - completedCount;

  return (
    <div className="max-w-7xl mx-auto w-full py-2 sm:py-4 space-y-6">
      
      {/* Title & Goal config Panel */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <Map className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white flex items-center gap-3">
              Career GPS Roadmap
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              Your structured milestone syllabus calculated by SkillSprint AI.
            </p>
          </div>
        </div>

        {roadmap ? (
          <button 
            onClick={() => setRoadmap(null)}
            className="relative z-10 flex items-center justify-center gap-2 px-4 py-2 border border-white/10 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white rounded-xl transition-all w-full md:w-auto shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Destination
          </button>
        ) : (
          <form onSubmit={handleGenerate} className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input 
              type="text" 
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="Target Company (e.g. Stripe, Google)"
              className="bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/50"
              required
            />
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-xs cursor-pointer text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            >
              <option value="30" className="text-gray-900">30 Days</option>
              <option value="60" className="text-gray-900">60 Days</option>
              <option value="90" className="text-gray-900">90 Days</option>
            </select>
            <button 
              type="submit" 
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl px-5 py-2.5 transition-all shadow-sm flex items-center justify-center gap-1.5 border border-white/10"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
              Generate Path
            </button>
          </form>
        )}
      </div>

      {roadmap && (
        <div className="space-y-6">
          
          {/* 1. Global Overview Grid (Takes full width, fully responsive 1x4 or 2x2 layout) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Done tasks */}
            <div className="bg-[#f3f0ff] border border-[#dcd1ff] rounded-2xl p-4.5 flex justify-between items-center group cursor-pointer shadow-sm hover:shadow transition-all">
              <div>
                <span className="text-3xl font-extrabold text-indigo-700 block">{completedCount}</span>
                <span className="text-[11px] text-indigo-500 font-bold uppercase tracking-wider block mt-1">Tasks Done</span>
              </div>
              <svg className="w-12 h-6 text-indigo-400 shrink-0" viewBox="0 0 50 20" fill="none">
                <path d="M0 15 Q10 2 20 12 T40 5 T50 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Skill Gaps */}
            <div className="bg-[#fff5f2] border border-[#ffe0d6] rounded-2xl p-4.5 flex justify-between items-center group cursor-pointer shadow-sm hover:shadow transition-all">
              <div>
                <span className="text-3xl font-extrabold text-amber-700 block">{roadmap.missingSkills.length}</span>
                <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider block mt-1">Skill Gaps</span>
              </div>
              <svg className="w-12 h-6 text-amber-400 shrink-0" viewBox="0 0 50 20" fill="none">
                <path d="M0 10 Q12 2 25 15 T50 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Remaining goals */}
            <div className="bg-[#f0f7ff] border border-[#d0e5ff] rounded-2xl p-4.5 flex justify-between items-center group cursor-pointer shadow-sm hover:shadow transition-all">
              <div>
                <span className="text-3xl font-extrabold text-blue-700 block">{remainingCount}</span>
                <span className="text-[11px] text-blue-500 font-bold uppercase tracking-wider block mt-1">Remaining</span>
              </div>
              <svg className="w-12 h-6 text-blue-400 shrink-0" viewBox="0 0 50 20" fill="none">
                <path d="M0 5 Q15 15 30 5 T50 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Completion Percentage */}
            <div className="bg-[#f0fdf4] border border-[#dcffd6] rounded-2xl p-4.5 flex justify-between items-center group cursor-pointer shadow-sm hover:shadow transition-all">
              <div>
                <span className="text-3xl font-extrabold text-emerald-700 block">{roadmap.completionPercentage}%</span>
                <span className="text-[11px] text-emerald-500 font-bold uppercase tracking-wider block mt-1">Completion</span>
              </div>
              <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="16" cy="16" r="13" className="stroke-emerald-100" strokeWidth="3" fill="transparent" />
                  <circle cx="16" cy="16" r="13" className="stroke-emerald-500" strokeWidth="3" fill="transparent" strokeDasharray={2*Math.PI*13} strokeDashoffset={2*Math.PI*13*(1 - roadmap.completionPercentage/100)} />
                </svg>
              </div>
            </div>
          </div>

          {/* 2. Responsive Content Layout (Tabbed on Mobile, Side-by-Side Grid on Desktop) */}
          
          {/* Tab selector - Visible ONLY on mobile screens (< 1024px) */}
          <div className="flex lg:hidden bg-gray-150 p-1.5 rounded-xl border border-gray-200/50 shadow-inner">
            <button
              onClick={() => setActiveMobileTab("tasks")}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                activeMobileTab === "tasks" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Habits & Checklist
            </button>
            <button
              onClick={() => setActiveMobileTab("map")}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                activeMobileTab === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Interactive Map
            </button>
            <button
              onClick={() => setActiveMobileTab("gaps")}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                activeMobileTab === "gaps" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Goal & Gaps
            </button>
          </div>

          {/* Core Grid Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left/Main Column - Maps to Mobile Tab 'tasks' or 'map' */}
            <div className={`lg:col-span-8 space-y-6 ${activeMobileTab === "gaps" ? "hidden lg:block" : ""}`}>
              
              {/* Task list/Flowchart container */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
                
                {/* Header view Mode (Toggle visible only on desktop to choose between tree map or checklist) */}
                <div className="hidden lg:flex justify-between items-center pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-bold text-slate-800 text-md">Roadmap Syllabus</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Toggle display preferences according to your study style.</p>
                  </div>
                  
                  <div className="flex bg-gray-150 p-0.5 rounded-lg border border-gray-200/50">
                    <button 
                      onClick={() => setDesktopViewMode("checklist")}
                      className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        desktopViewMode === "checklist" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Checklist Tasks
                    </button>
                    <button 
                      onClick={() => setDesktopViewMode("flowchart")}
                      className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        desktopViewMode === "flowchart" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Flowchart GPS
                    </button>
                  </div>
                </div>

                {/* Content Renderers */}
                
                {/* 2A. Tasks Checklist (Default Mobile, or selected Desktop Checklist) */}
                <div className={`${activeMobileTab === "tasks" ? "block" : "hidden"} lg:block ${desktopViewMode === "checklist" ? "lg:block" : "lg:hidden"} space-y-6`}>
                  {/* Weekly Goals list (Projects style) */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-[#4f46e5]" /> Weekly Milestones
                      </h4>
                      <span className="text-xs text-gray-500 font-semibold">{roadmap.weeklyTasks.length} Milestones</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {roadmap.weeklyTasks.map((task, idx) => (
                        <div 
                          key={idx} 
                          className={`relative flex items-center justify-between p-4 bg-white border border-gray-150 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow ${
                            task.completed ? "opacity-70 bg-slate-50/50" : ""
                          }`}
                        >
                          <div className="space-y-1">
                            <span className="px-2.5 py-0.5 bg-[#4f46e5]/10 text-[9px] text-[#4f46e5] font-bold rounded-lg uppercase tracking-wider">
                              Week {idx + 1} Goal
                            </span>
                            <h4 className={`text-[12.5px] font-bold text-slate-700 leading-snug ${task.completed ? "line-through text-gray-400" : ""}`}>
                              {task.text}
                            </h4>
                          </div>

                          <div className="relative">
                            <button 
                              onClick={() => setActiveMenuIdx(activeMenuIdx === idx ? null : idx)}
                              className="p-1 rounded-lg hover:bg-slate-50 border border-transparent hover:border-gray-200 transition-all cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                            
                            {activeMenuIdx === idx && (
                              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 w-28 animate-in fade-in duration-200">
                                <button
                                  onClick={() => {
                                    handleToggle("weekly", idx, !task.completed);
                                    setActiveMenuIdx(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                                >
                                  <span>{task.completed ? "Undo Done" : "Complete"}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteTask("weekly", idx);
                                    setActiveMenuIdx(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-650 hover:bg-slate-50 flex items-center gap-1.5 border-t border-gray-100"
                                >
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Checkpoints */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-[#4f46e5]" /> Monthly Checkpoints
                      </h4>
                      <span className="text-xs text-gray-500 font-semibold">{roadmap.monthlyTasks.length} Checkpoints</span>
                    </div>

                    <div className="space-y-2.5">
                      {roadmap.monthlyTasks.map((task, idx) => (
                        <div 
                          key={idx}
                          onClick={() => handleToggle("monthly", idx, !task.completed)}
                          className={`flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-250 bg-white/60 hover:bg-white transition-all cursor-pointer shadow-sm ${
                            task.completed ? "opacity-60 bg-gray-100/50" : ""
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"
                          }`}>
                            {task.completed && <span className="text-[8px] font-extrabold">✓</span>}
                          </div>
                          <span className={`text-[12.5px] font-bold ${task.completed ? "line-through text-gray-400" : "text-slate-700"}`}>
                            {task.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2B. Interactive Flowchart Map (Mobile Map Tab, or Desktop Map Mode) */}
                <div className={`${activeMobileTab === "map" ? "block" : "hidden"} lg:block ${desktopViewMode === "flowchart" ? "lg:block" : "lg:hidden"} relative select-none py-6`}>
                  {/* Vertical Progress Connector Line */}
                  <div className="absolute top-16 bottom-16 left-1/2 -translate-x-1/2 w-[2.5px] bg-gray-200 -z-10">
                    <div 
                      className="w-full bg-[#4f46e5] rounded transition-all duration-1000 origin-top" 
                      style={{ height: `${roadmap.completionPercentage}%` }}
                    />
                  </div>

                  <TaskGroupFlow 
                    title="Daily habits" 
                    tasks={roadmap.dailyTasks} 
                    period="daily" 
                    onToggle={handleToggle} 
                  />

                  <TaskGroupFlow 
                    title="Weekly targets" 
                    tasks={roadmap.weeklyTasks} 
                    period="weekly" 
                    onToggle={handleToggle} 
                  />

                  <TaskGroupFlow 
                    title="Monthly checkpoints" 
                    tasks={roadmap.monthlyTasks} 
                    period="monthly" 
                    onToggle={handleToggle} 
                  />
                </div>

              </div>
            </div>

            {/* Right Column/Sidebar - Mobile 'gaps' or 'tasks' tab, or Desktop Right Sidebar */}
            <div className={`lg:col-span-4 space-y-6 ${activeMobileTab === "map" ? "hidden lg:block" : "block"}`}>
              
              {/* Daily habits tracker (Mockup calendar list) */}
              <div className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 ${activeMobileTab === "tasks" ? "block" : "hidden lg:block"}`}>
                
                {/* calendar header */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                    <span>24 Jun, 2026 Wednesday</span>
                    <div className="flex gap-1">
                      <span className="p-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed">◀</span>
                      <span className="p-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed">▶</span>
                    </div>
                  </div>

                  {/* Calendar weekday bar */}
                  <div className="grid grid-cols-7 gap-1 text-center bg-gray-50 border border-gray-150 rounded-xl p-1.5">
                    {daysOfWeek.map((day, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1.5">
                        <span className="text-[9px] text-gray-400 font-bold uppercase">{day.name}</span>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold ${
                          day.active 
                            ? "bg-slate-900 text-white shadow-sm border border-slate-900" 
                            : "text-slate-600"
                        }`}>
                          {day.num}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Today's checklist header */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <h4 className="font-bold text-slate-800 text-[14.5px]">Daily Habits</h4>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-450 mt-0.5" />
                    </div>

                    <button 
                      onClick={() => setIsAddingHabit(!isAddingHabit)}
                      className="w-7 h-7 rounded-full bg-[#4f46e5] text-white flex items-center justify-center hover:bg-[#4338ca] shadow cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Add habit inline input */}
                  <AnimatePresence>
                    {isAddingHabit && (
                      <motion.form 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onSubmit={handleAddHabitSubmit}
                        className="flex gap-2 p-2.5 bg-slate-50 border border-gray-200 rounded-xl shadow-inner"
                      >
                        <input
                          type="text"
                          required
                          value={newHabitText}
                          onChange={(e) => setNewHabitText(e.target.value)}
                          placeholder="New habit..."
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#4f46e5]"
                        />
                        <button type="submit" className="bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg">
                          Save
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* List of daily habits */}
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {roadmap.dailyTasks.map((task, idx) => {
                      const tags = [
                        { label: "To Do", color: "text-[#4f46e5]", bg: "bg-[#4f46e5]/10", icon: <CheckSquare className="w-3.5 h-3.5 text-[#4f46e5]" />, time: "11:20 AM - 12:20 PM" },
                        { label: "Event", color: "text-[#3b82f6]", bg: "bg-[#3b82f6]/10", icon: <Calendar className="w-3.5 h-3.5 text-[#3b82f6]" />, time: "12:30 PM - 01:00 PM" },
                        { label: "Reminder", color: "text-indigo-650", bg: "bg-indigo-50", icon: <Bell className="w-3.5 h-3.5 text-indigo-650" />, time: "02:00 PM - 02:30 PM" },
                        { label: "Milestone", color: "text-emerald-650", bg: "bg-emerald-50", icon: <Clock className="w-3.5 h-3.5 text-emerald-650" />, time: "04:20 PM - 05:00 PM" }
                      ][idx % 4];

                      return (
                        <div 
                          key={idx}
                          className={`flex items-start justify-between p-3 bg-white border border-gray-150 rounded-xl shadow-sm hover:shadow-md transition-all group ${
                            task.completed ? "opacity-70 bg-slate-50/50" : ""
                          }`}
                        >
                          <div className="flex gap-2.5">
                            <div 
                              onClick={() => handleToggle("daily", idx, !task.completed)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border cursor-pointer transition-all ${
                                task.completed 
                                  ? "bg-emerald-500 border-emerald-500 text-white" 
                                  : `${tags.bg} border-transparent hover:border-gray-300`
                              }`}
                            >
                              {task.completed ? <span className="text-[9px] font-extrabold">✓</span> : tags.icon}
                            </div>

                            <div className="space-y-0.5">
                              <span className={`text-[9px] font-bold uppercase tracking-wider block ${tags.color}`}>
                                {tags.label}
                              </span>
                              <h4 
                                onClick={() => handleToggle("daily", idx, !task.completed)}
                                className={`text-[12.5px] font-bold text-slate-700 leading-snug cursor-pointer select-none ${
                                  task.completed ? "line-through text-gray-400" : ""
                                }`}
                              >
                                {task.text}
                              </h4>
                              <span className="text-[10px] text-gray-400 block font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-350" /> {tags.time}
                              </span>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleDeleteTask("daily", idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer self-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Destination metadata card (Notion style callout card) */}
              <div className={`bg-[#f9f9fb] border border-gray-200 rounded-2xl p-5 space-y-5 shadow-sm ${activeMobileTab === "gaps" ? "block" : "hidden lg:block"}`}>
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    🎯 Destination Target
                  </h3>
                  <div className="p-3.5 rounded-xl bg-white border border-gray-150 shadow-sm text-slate-700">
                    <strong className="text-slate-800 block text-[13.5px] font-bold">{roadmap.targetRole}</strong>
                    <span className="text-slate-500 flex items-center gap-1 mt-1 text-[10.5px] font-medium">
                      <Briefcase className="w-3 h-3 text-gray-400" /> {roadmap.targetCompany}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    💡 Missing Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {roadmap.missingSkills?.map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-white border border-gray-200 text-slate-700 text-[10px] font-semibold rounded-lg shadow-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>
          
        </div>
      )}
    </div>
  );
}
