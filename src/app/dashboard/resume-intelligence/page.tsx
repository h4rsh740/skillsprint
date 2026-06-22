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
          className="space-y-6 max-w-6xl mx-auto"
        >
          {/* 4-KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[13px] text-gray-500 font-medium">Resume Score</h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">{result.resumeScore}</div>
              <div className="mt-2 text-[12px] px-2.5 py-1 bg-[#4f46e5]/10 text-[#4f46e5] rounded-full inline-block font-medium">Top 18% vs peers</div>
            </div>
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[13px] text-gray-500 font-medium">ATS Score</h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">{result.atsScore}</div>
              <div className="mt-2 text-[12px] px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full inline-block font-medium">Needs keyword alignment</div>
            </div>
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[13px] text-gray-500 font-medium">Projects Parsed</h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">{result.projectsParsed}</div>
              <div className="mt-2 text-[12px] px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full inline-block font-medium">2 should be promoted</div>
            </div>
            <div className="liquid-glass-light p-5 rounded-2xl">
              <h3 className="text-[13px] text-gray-500 font-medium">Keyword Gaps</h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">{result.keywordGaps}</div>
              <div className="mt-2 text-[12px] px-2.5 py-1 bg-red-100 text-red-600 rounded-full inline-block font-medium">Priority skills missing</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Extracted Signals */}
            <div className="liquid-glass-light rounded-3xl p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Extracted Signals</h3>
              <div className="flex flex-wrap gap-2 mb-8">
                {result.extractedSignals.map(signal => (
                  <span key={signal} className="px-3 py-1.5 bg-white/60 border border-gray-200 text-gray-700 text-[13px] rounded-full font-medium shadow-sm">
                    {signal}
                  </span>
                ))}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Health</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-white/40 border border-white/20">
                  <span className="text-[14px] text-gray-700 font-medium">Headline</span>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[12px] font-semibold rounded-full">Average</span>
                </div>
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-white/40 border border-white/20">
                  <span className="text-[14px] text-gray-700 font-medium">Projects</span>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[12px] font-semibold rounded-full">Strong</span>
                </div>
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-white/40 border border-white/20">
                  <span className="text-[14px] text-gray-700 font-medium">Skills</span>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[12px] font-semibold rounded-full">Needs Regrouping</span>
                </div>
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-white/40 border border-white/20">
                  <span className="text-[14px] text-gray-700 font-medium">Experience</span>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[12px] font-semibold rounded-full">Light</span>
                </div>
              </div>
            </div>

            {/* Improvement Suggestions */}
            <div className="liquid-glass-light rounded-3xl p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Improvement Suggestions</h3>
              <div className="space-y-4">
                {result.improvementSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/40 border border-gray-200 shadow-sm">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] flex items-center justify-center text-white font-bold shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <strong className="text-[14px] font-semibold text-gray-900">{suggestion.title}</strong>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${suggestion.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                          {suggestion.priority}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-500 mb-3">{suggestion.description}</p>
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${suggestion.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setResult(null)}
                className="w-full mt-6 flex justify-center items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 text-[14px] font-medium rounded-full py-3.5 transition-colors border border-gray-200 shadow-sm"
              >
                Upload New Resume
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
