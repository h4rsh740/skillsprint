"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle2, AlertCircle, Star, RefreshCw } from "lucide-react";
import { analyzeResume, type ResumeAnalysisResult } from "@/actions/resume";

export default function ResumeIntelPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const data = await analyzeResume(formData);
      setResult(data);
    } catch (error) {
      console.error("Failed to analyze resume", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <FileText className="h-8 w-8 text-[#4f46e5]" /> Resume Intelligence
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Upload your resume for deep AI analysis and ATS scoring.</p>
      </div>

      {!result ? (
        <div className="liquid-glass border-dashed border-2 border-gray-300 rounded-3xl h-96 flex flex-col items-center justify-center space-y-6 max-w-4xl mx-auto shadow-sm transition-all hover:bg-white/40">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.docx,.png,.jpg"
            onChange={handleFileChange}
          />
          <div className="p-6 rounded-full bg-[#4f46e5]/10">
            <Upload className="h-10 w-10 text-[#4f46e5]" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">Upload your resume</h3>
            <p className="text-sm text-gray-500 mt-1">PDF, DOCX, or Image (Max 5MB)</p>
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="group flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] font-medium rounded-full pl-6 pr-2 py-2.5 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <div className="flex items-center gap-3 pr-4">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Analyzing with AI...</span>
              </div>
            ) : (
              <>
                <div className="h-[20px] overflow-hidden relative">
                  <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                    <span className="h-[20px] flex items-center">Select File</span>
                    <span className="h-[20px] flex items-center">Select File</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <Upload className="w-4 h-4 text-[#4f46e5]" />
                </div>
              </>
            )}
          </button>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto"
        >
          {/* Main Analysis Column */}
          <div className="md:col-span-2 space-y-6">
            <div className="liquid-glass rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
                <FileText className="h-6 w-6 text-[#4f46e5]" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 leading-tight">Resume Insights</h3>
                  <p className="text-sm text-gray-500">Extracted intelligence from your profile</p>
                </div>
              </div>
              
              <div className="space-y-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Strengths
                  </h4>
                  <ul className="space-y-3 text-[14px] text-gray-700 list-disc list-inside bg-white/40 p-4 rounded-xl border border-white">
                    {result.strengths.map((str, i) => <li key={i}>{str}</li>)}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Weak Areas & Missing Skills
                  </h4>
                  <ul className="space-y-3 text-[14px] text-gray-700 list-disc list-inside bg-white/40 p-4 rounded-xl border border-white">
                    {result.weaknesses.map((weak, i) => <li key={i}>{weak}</li>)}
                  </ul>
                </div>

                {result.rewriteSuggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5 text-[#F26522]" />
                      AI Rewrite Suggestions
                    </h4>
                    <div className="p-5 rounded-2xl bg-white shadow-sm border border-gray-100 text-[14px] leading-relaxed">
                      <p className="text-gray-500 mb-2">Instead of:</p>
                      <p className="italic text-gray-700 mb-4">"{result.rewriteSuggestions[0].original}"</p>
                      <p className="text-[#4f46e5] font-medium mb-2">Use this optimized bullet:</p>
                      <p className="font-medium text-gray-900">"{result.rewriteSuggestions[0].improved}"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scoring Column */}
          <div className="space-y-6">
            <div className="liquid-glass rounded-3xl p-6 sm:p-8">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">ATS Score</h3>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tighter text-gray-900">{result.atsScore}</span>
                <span className="text-lg text-gray-500 mb-1 font-medium">/ 100</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mt-5">
                <div className={`h-full ${result.atsScore > 75 ? 'bg-emerald-500' : 'bg-yellow-500'} rounded-full transition-all duration-1000`} style={{ width: `${result.atsScore}%` }} />
              </div>
              <p className="text-[13px] text-gray-600 mt-4 leading-relaxed">Based on industry standard keyword matching and formatting parsers.</p>
            </div>

            <div className="liquid-glass rounded-3xl p-6 sm:p-8">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Placement Probability</h3>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tighter text-[#4f46e5]">{result.placementProbability}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mt-5">
                <div className="h-full bg-[#4f46e5] rounded-full transition-all duration-1000" style={{ width: `${result.placementProbability}%` }} />
              </div>
              <p className="text-[13px] text-gray-600 mt-4 leading-relaxed">Estimated probability of passing initial technical screening rounds.</p>
            </div>

            <button 
              onClick={() => setResult(null)}
              className="w-full flex justify-center items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 text-[14px] font-medium rounded-full py-3.5 transition-colors border border-gray-200 shadow-sm"
            >
              Upload New Resume
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
