"use client";

import { useEffect, useState } from "react";
import { Briefcase, Target, ExternalLink, Sparkles, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getJobRecommendations, type JobListing } from "@/actions/jobs";

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await getJobRecommendations();
        setJobs(res);
      } catch (err) {
        console.error("Failed to load jobs", err);
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium text-[15px]">Scouring JSearch & Adzuna API indices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <Briefcase className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white flex items-center gap-3">
              Job Match recommendations
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              Smart placement matching comparing your skills and GitHub velocity against active job listings.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {jobs.map((job) => {
          const isHighMatch = job.matchScore >= 80;
          const isMidMatch = job.matchScore >= 50;
          
          return (
            <div 
              key={job.id}
              className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col lg:flex-row gap-6 justify-between items-start"
            >
              {/* Job Details */}
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                    isHighMatch 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                      : isMidMatch 
                        ? "bg-amber-50 text-amber-700 border border-amber-100" 
                        : "bg-red-50 text-red-700 border border-red-100"
                  }`}>
                    <Target className="w-3.5 h-3.5" />
                    {job.matchScore}% Match
                  </span>
                  <span className="text-[13px] font-semibold text-gray-500">{job.company}</span>
                  <span className="text-[13px] text-gray-400">•</span>
                  <span className="text-[13px] text-gray-500">{job.location}</span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h3>
                  <p className="text-[14px] text-gray-600 mt-2.5 leading-relaxed">{job.description}</p>
                </div>

                {/* Skills tags breakdown */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Skills Breakdown</span>
                  <div className="flex flex-wrap gap-2">
                    {/* Matching skills */}
                    {job.matchingSkills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {skill}
                      </span>
                    ))}
                    {/* Missing skills */}
                    {job.missingSkills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-100/50 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Explainable AI Annotation */}
                <div className="p-4 rounded-2xl bg-white/70 border border-gray-100/80 text-xs text-gray-700 leading-relaxed flex gap-2.5 shadow-inner">
                  <Sparkles className="w-4 h-4 text-[#4f46e5] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900 font-semibold block mb-0.5">Explainable AI Insight</strong>
                    <p>{job.explainableReason}</p>
                  </div>
                </div>
              </div>

              {/* Salary & Application Link */}
              <div className="lg:w-48 w-full flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between lg:justify-start gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-200">
                <div className="lg:text-right w-full sm:w-auto">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Estimated Compensation</span>
                  <span className="font-bold text-gray-900 text-lg mt-1 block">{job.salary}</span>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto lg:w-full">
                  <a 
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-semibold rounded-full w-full py-2.5 transition-colors shadow"
                  >
                    <span>Apply Now</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                  
                  <button 
                    onClick={() => setSelectedJob(job)}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-800 text-[13px] font-semibold rounded-full w-full py-2.5 transition-colors border border-gray-200 shadow-sm cursor-pointer"
                  >
                    Compare Profile
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compatibility Comparison Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-6 sm:p-8 max-w-2xl w-full relative z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4f46e5] bg-[#4f46e5]/10 px-3 py-1 rounded-full">
                    Profile Compatibility
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-2">{selectedJob.title}</h3>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">{selectedJob.company} • {selectedJob.location}</p>
                </div>
                
                {/* Score Circle */}
                <div className="flex flex-col items-center bg-indigo-50 border border-indigo-150 px-4 py-2 rounded-2xl">
                  <span className="text-2xl font-extrabold text-[#4f46e5]">{selectedJob.matchScore}%</span>
                  <span className="text-[8px] font-bold text-indigo-700 uppercase mt-0.5">MATCH</span>
                </div>
              </div>

              {/* Prep recommendation info */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center gap-3.5">
                <div className="p-3 bg-[#4f46e5]/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-[#4f46e5]" />
                </div>
                <div>
                  <strong className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Preparation Strategy</strong>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    {selectedJob.matchScore >= 80 
                      ? "Direct Match: Your profile matches their core stack. Apply immediately." 
                      : selectedJob.matchScore >= 50 
                        ? `Bridge Gaps: Expected 7-10 days of targeted practice on ${selectedJob.missingSkills.slice(0, 2).join(", ")} recommended.` 
                        : "Long-term Prep: Focus on foundational concepts. We recommend building 2 full-stack projects first."}
                  </p>
                </div>
              </div>

              {/* Side by side skills comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/20 border border-emerald-100 p-4.5 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-md inline-block">Matched Skills ({selectedJob.matchingSkills.length})</span>
                  {selectedJob.matchingSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJob.matchingSkills.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-lg shadow-sm">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No direct matching skills detected.</p>
                  )}
                </div>

                <div className="bg-amber-50/20 border border-amber-100 p-4.5 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-md inline-block">Missing Gaps ({selectedJob.missingSkills.length})</span>
                  {selectedJob.missingSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJob.missingSkills.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-[11px] font-semibold rounded-lg shadow-sm">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 font-semibold italic flex items-center gap-1">✓ Complete skills alignment!</p>
                  )}
                </div>
              </div>

              {/* Explainable AI Annotation */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Recruiter Insight Analysis</span>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/50 text-[13px] leading-relaxed text-gray-700 font-medium">
                  {selectedJob.explainableReason}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-150">
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="text-gray-500 hover:text-gray-700 font-semibold text-[13.5px] transition-colors"
                >
                  Close Comparison
                </button>
                <a 
                  href={selectedJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[13.5px] font-semibold rounded-full px-5 py-2.5 transition-colors shadow"
                >
                  <span>Apply Now</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
