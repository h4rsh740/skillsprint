"use client";

import { useEffect, useState } from "react";
import { Briefcase, Target, ExternalLink, Sparkles, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { getJobRecommendations, type JobListing } from "@/actions/jobs";

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobListing[]>([]);

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
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-[#4f46e5]" /> Job Match recommendations
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Smart placement matching comparing your skills and GitHub velocity against active job listings.</p>
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
              <div className="lg:w-48 w-full flex lg:flex-col items-end justify-between lg:justify-start gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-200">
                <div className="lg:text-right">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Estimated Compensation</span>
                  <span className="font-bold text-gray-900 text-lg mt-1 block">{job.salary}</span>
                </div>

                <a 
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-semibold rounded-full px-5 py-2.5 transition-colors shadow"
                >
                  <span>Apply Now</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
