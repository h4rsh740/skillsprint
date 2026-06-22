"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Briefcase, ChevronRight, TrendingUp, RefreshCw, ArrowRight } from "lucide-react";
import { generateCareerTwin, type CareerTwinResult } from "@/actions/career-twin";

export default function CareerTwinPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CareerTwinResult | null>(null);

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const data = await generateCareerTwin(formData);
      setResult(data);
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-[#4f46e5]" /> AI Career Twin
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Your digital clone projecting your professional future based on current velocity.</p>
      </div>

      {!result ? (
        <div className="liquid-glass rounded-3xl p-8 sm:p-12 max-w-3xl mx-auto shadow-sm border border-gray-200 mt-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Configure Your Twin</h2>
            <p className="text-gray-500 mt-2">Enter your current profile to generate an accurate 12-month trajectory.</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-gray-700">Current CGPA</label>
                <input 
                  required
                  name="cgpa"
                  type="text" 
                  placeholder="e.g. 8.5"
                  className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-gray-700">Target Role</label>
                <input 
                  required
                  name="targetRole"
                  type="text" 
                  placeholder="e.g. SDE-1, Frontend Developer"
                  className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 placeholder:text-gray-400"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-700">Current Key Skills (Comma separated)</label>
              <textarea 
                required
                name="skills"
                rows={3}
                placeholder="React, Next.js, Java, Spring Boot, AWS..."
                className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 placeholder:text-gray-400 resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={isGenerating}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] font-medium rounded-full py-3.5 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating Twin...
                </>
              ) : (
                <>
                  Generate Trajectory
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="fixed inset-0 bg-[#EFEFEF] pointer-events-none z-[-1] animate-in fade-in duration-1000" />
          {/* Trajectory visualization */}
          <div className="relative pt-10 px-4 max-w-4xl mx-auto">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 z-0 md:left-1/2 md:-ml-px" />
            
            <div className="space-y-16">
              {result.timeline.map((item, index) => (
                <TimelineItem 
                  key={index}
                  month={item.month}
                  title={item.title}
                  subtitle={item.subtitle}
                  skills={item.skills}
                  salary={item.salary}
                  align={index % 2 === 0 ? "left" : "right"}
                  active={index === 0}
                />
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 max-w-6xl mx-auto">
            {/* Left Column: SWOT Analysis */}
            <div className="liquid-glass-light rounded-2xl p-6 sm:p-8 flex flex-col">
              <div className="flex justify-between items-start gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Career Twin Summary</h3>
                  <p className="text-sm text-gray-500 mt-1">Current stack: {result.timeline[0]?.skills.join(', ') || "React, JavaScript"}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[13px] font-semibold rounded-full border border-emerald-200">
                  Confidence 92%
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="p-4 rounded-xl bg-white/40 border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600"/> Strengths</h4>
                  <ul className="text-[13px] text-gray-600 space-y-2 list-disc list-inside">
                    {result.swot?.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-white/40 border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-red-500"/> Weaknesses</h4>
                  <ul className="text-[13px] text-gray-600 space-y-2 list-disc list-inside">
                    {result.swot?.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-white/40 border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-500"/> Opportunities</h4>
                  <ul className="text-[13px] text-gray-600 space-y-2 list-disc list-inside">
                    {result.swot?.opportunities.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-white/40 border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-orange-500"/> Threats</h4>
                  <ul className="text-[13px] text-gray-600 space-y-2 list-disc list-inside">
                    {result.swot?.threats.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column: Recommended Roles & Explainable AI */}
            <div className="liquid-glass-light rounded-2xl p-6 sm:p-8 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Roles</h3>
              
              <div className="space-y-3 mb-6">
                {result.recommendedRoles?.map((role, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-gray-200 shadow-sm">
                    <div>
                      <strong className="block text-[14.5px] font-semibold text-gray-900">{role.title}</strong>
                      <div className="text-[12.5px] text-gray-500 mt-1">{role.description}</div>
                    </div>
                    <span className="px-2.5 py-1 bg-[#4f46e5]/10 text-[#4f46e5] text-[12px] font-bold rounded-full ml-3 whitespace-nowrap">
                      {role.match}%
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="text-md font-semibold text-gray-900 mt-2 mb-3">Explainable AI Reasoning</h3>
              <div className="p-4 rounded-xl border border-dashed border-[#8b5cf6]/40 bg-[#8b5cf6]/5 text-[13px] leading-relaxed text-gray-700">
                Recommended role: <strong className="text-gray-900">{result.recommendedRoles?.[0]?.title}</strong><br/><br/>
                Reason: {result.recommendedRoles?.[0]?.reason}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-10 pb-6">
            <button 
              onClick={() => setResult(null)}
              className="group flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[14px] font-medium rounded-full px-6 py-2.5 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5"
            >
              <RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:rotate-180 transition-all duration-500" />
              Recalculate Profile
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TimelineItem({ month, title, subtitle, skills, salary, align, active = false }: any) {
  const isLeft = align === "left";
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative z-10 flex flex-col md:flex-row items-center ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
    >
      <div className={`w-full md:w-1/2 flex ${isLeft ? 'justify-start md:justify-end pr-0 md:pr-12' : 'justify-start pl-0 md:pl-12'} pl-12 md:pl-0 mb-4 md:mb-0`}>
        <div className={`w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-md ${active ? 'liquid-glass-light border-2 border-[#4f46e5]/40' : 'bg-white/40 border border-white/40 backdrop-blur-md'}`}>
          <div className="pb-4 border-b border-gray-100/50 mb-4">
            <div className="flex justify-between items-start mb-3">
              <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full uppercase tracking-wider ${active ? 'bg-[#4f46e5] text-white' : 'bg-gray-100 text-gray-600'}`}>{month}</span>
              <span className="text-[12px] font-semibold text-emerald-600">{salary}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 leading-tight">{title}</h3>
            <p className="text-[13px] text-gray-500 mt-1">{subtitle}</p>
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s: string) => (
                <span key={s} className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-gray-50 text-gray-600 border border-gray-200">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={`absolute left-8 md:left-1/2 w-4 h-4 rounded-full border-4 -translate-x-[7px] md:-translate-x-2 transition-colors duration-500 ${active ? 'bg-[#4f46e5] border-white shadow-[0_0_0_4px_rgba(79,70,229,0.2)]' : 'bg-white border-gray-300'}`} />
    </motion.div>
  );
}
