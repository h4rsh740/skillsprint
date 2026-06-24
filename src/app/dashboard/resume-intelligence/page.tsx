"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle2, AlertCircle, Star, RefreshCw, Download, Sparkles } from "lucide-react";
import { analyzeResume, type ResumeAnalysisResult, type StructuredResume } from "@/actions/resume";

export default function ResumeIntelPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [applied, setApplied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setApplied(false);
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

  const handleDownloadPDF = (resume: StructuredResume) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to export as PDF");
      return;
    }

    const skillsHTML = resume.skills.map(s => 
      `<span class="skill-tag">${s}</span>`
    ).join('');

    const experienceHTML = resume.experience.map(exp => `
      <div class="resume-section-item">
        <div class="resume-item-header">
          <span class="company-name">${exp.company}</span>
          <span class="item-date">${exp.date}</span>
        </div>
        <div class="role-name">${exp.role}</div>
        <ul class="bullet-list">
          ${exp.bullets.map(b => `<li>${b}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    const projectsHTML = resume.projects.map(proj => `
      <div class="resume-section-item">
        <div class="resume-item-header">
          <span class="project-title">${proj.title}</span>
        </div>
        <div class="project-desc">${proj.description}</div>
        <ul class="bullet-list">
          ${proj.bullets.map(b => `<li>${b}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    const educationHTML = resume.education.map(edu => `
      <div class="resume-section-item">
        <div class="resume-item-header">
          <span class="school-name">${edu.institution}</span>
          <span class="item-date">${edu.date}</span>
        </div>
        <div class="degree-name">${edu.degree} ${edu.gpa ? `• GPA: ${edu.gpa}` : ''}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${resume.personalInfo.name} - Optimized Resume</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
            @page { size: A4; margin: 20mm; }
            @media print {
              body { padding: 0; margin: 0; }
              .no-print { display: none !important; }
            }
            body {
              font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
              color: #1e293b;
              background: #ffffff;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              margin-bottom: 24px;
              border-bottom: 2px solid #4f46e5;
              padding-bottom: 16px;
            }
            .name {
              font-size: 28px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 6px 0;
              letter-spacing: -0.02em;
            }
            .contact-info {
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
              display: flex;
              justify-content: center;
              gap: 12px;
              flex-wrap: wrap;
            }
            .contact-info a {
              color: #4f46e5;
              text-decoration: none;
            }
            .summary-section {
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 800;
              color: #4f46e5;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
              margin: 20px 0 10px 0;
            }
            .summary-text {
              font-size: 13px;
              color: #334155;
              margin: 0;
              font-weight: 500;
            }
            .resume-section-item {
              margin-bottom: 14px;
              page-break-inside: avoid;
            }
            .resume-item-header {
              display: flex;
              justify-content: space-between;
              font-weight: 700;
              font-size: 13.5px;
              color: #0f172a;
            }
            .item-date {
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
            }
            .role-name, .degree-name {
              font-size: 12.5px;
              font-weight: 600;
              color: #475569;
              margin-top: 2px;
            }
            .project-desc {
              font-size: 12px;
              font-weight: 500;
              color: #64748b;
              margin-top: 2px;
            }
            .bullet-list {
              margin: 6px 0 0 0;
              padding-left: 18px;
              list-style-type: disc;
            }
            .bullet-list li {
              font-size: 12.5px;
              color: #334155;
              margin-bottom: 4px;
              font-weight: 500;
            }
            .skills-container {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              margin-top: 8px;
            }
            .skill-tag {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 6px;
              background: #f1f5f9;
              color: #334155;
              font-size: 11.5px;
              font-weight: 600;
              border: 1px solid #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="name">${resume.personalInfo.name}</h1>
            <div class="contact-info">
              ${resume.personalInfo.phone ? `<span>📞 ${resume.personalInfo.phone}</span>` : ''}
              ${resume.personalInfo.email ? `<span>✉️ <a href="mailto:${resume.personalInfo.email}">${resume.personalInfo.email}</a></span>` : ''}
              ${resume.personalInfo.location ? `<span>📍 ${resume.personalInfo.location}</span>` : ''}
              ${resume.personalInfo.github ? `<span>💻 <a href="https://${resume.personalInfo.github}" target="_blank">${resume.personalInfo.github}</a></span>` : ''}
              ${resume.personalInfo.linkedin ? `<span>🔗 <a href="https://${resume.personalInfo.linkedin}" target="_blank">${resume.personalInfo.linkedin}</a></span>` : ''}
            </div>
          </div>

          <div class="summary-section">
            <h2 class="section-title">Professional Summary</h2>
            <p class="summary-text">${resume.summary}</p>
          </div>

          <div>
            <h2 class="section-title">Skills & Expertise</h2>
            <div class="skills-container">
              ${skillsHTML}
            </div>
          </div>

          <div>
            <h2 class="section-title">Work Experience</h2>
            ${experienceHTML}
          </div>

          <div>
            <h2 class="section-title">Academic Projects</h2>
            ${projectsHTML}
          </div>

          <div>
            <h2 class="section-title">Education</h2>
            ${educationHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <FileText className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white flex items-center gap-3">
              Resume Intelligence
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              Upload your resume for deep AI analysis and ATS scoring.
            </p>
          </div>
        </div>
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
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {applied && result.improvedAtsScore ? (
                  <span className="text-emerald-600 flex items-baseline gap-1 animate-in fade-in duration-300">
                    {result.improvedAtsScore}
                    <span className="text-[11px] font-normal text-gray-400"> (was {result.atsScore})</span>
                  </span>
                ) : (
                  result.atsScore
                )}
              </div>
              <div className={`mt-2 text-[12px] px-2.5 py-1 rounded-full inline-block font-medium transition-colors ${applied ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {applied ? '✓ Perfect keyword alignment' : 'Needs keyword alignment'}
              </div>
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
            <div className="liquid-glass-light rounded-3xl p-6 sm:p-8 animate-in fade-in duration-300">
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
            <div className="liquid-glass-light rounded-3xl p-6 sm:p-8 animate-in fade-in duration-300">
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
                onClick={() => { setResult(null); setApplied(false); }}
                className="w-full mt-6 flex justify-center items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 text-[14px] font-medium rounded-full py-3.5 transition-colors border border-gray-200 shadow-sm"
              >
                Upload New Resume
              </button>
            </div>
          </div>

          {/* AI Resume Optimizer Side-by-Side Comparison */}
          {result.originalResume && result.improvedResume && (
            <div className="liquid-glass-light rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200/80">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#4f46e5] animate-pulse" /> AI Resume Optimizer
                  </h3>
                  <p className="text-gray-500 text-[13px] mt-1">Review the changes and export your polished, high-fidelity resume.</p>
                </div>
                
                {!applied ? (
                  <button
                    onClick={() => setApplied(true)}
                    className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[14px] font-semibold rounded-full px-6 py-3 transition-colors shadow-sm self-start md:self-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Apply AI Improvements</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2 self-start md:self-auto">
                    <button
                      onClick={() => handleDownloadPDF(result.improvedResume!)}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[14px] font-semibold rounded-full px-6 py-3 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF Resume</span>
                    </button>
                    <button
                      onClick={() => setApplied(false)}
                      className="flex items-center gap-2 bg-white border border-gray-250 text-gray-600 hover:bg-gray-50 text-[14px] font-semibold rounded-full px-5 py-3 transition-colors shadow-sm"
                    >
                      <span>Undo</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Original Resume Side */}
                <div className="border border-gray-255 rounded-2xl p-5 bg-white/30 shadow-inner relative opacity-70">
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                    Original Contents
                  </span>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-4">Original Resume</h4>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 text-left font-sans text-xs text-gray-700 leading-relaxed">
                    <div>
                      <div className="text-base font-bold text-slate-800">{result.originalResume.personalInfo.name}</div>
                      <div className="text-gray-500 mt-0.5">
                        {result.originalResume.personalInfo.email} {result.originalResume.personalInfo.phone && `| ${result.originalResume.personalInfo.phone}`} {result.originalResume.personalInfo.location && `| ${result.originalResume.personalInfo.location}`}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-150 pt-3">
                      <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-1">Professional Summary</div>
                      <p className="italic text-gray-600">"{result.originalResume.summary}"</p>
                    </div>

                    <div className="border-t border-gray-150 pt-3">
                      <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-1.5">Skills</div>
                      <div className="flex flex-wrap gap-1">
                        {result.originalResume.skills.map((s, i) => (
                          <span key={i} className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[10px] text-gray-700 font-semibold">{s}</span>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-150 pt-3">
                      <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-2">Work Experience</div>
                      {result.originalResume.experience.map((exp, idx) => (
                        <div key={idx} className="mb-3 last:mb-0">
                          <div className="flex justify-between font-bold text-slate-850">
                            <span>{exp.company} - {exp.role}</span>
                            <span className="text-gray-400 font-medium text-[10px]">{exp.date}</span>
                          </div>
                          <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-500">
                            {exp.bullets.map((b, i) => <li key={i}>"{b}"</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-150 pt-3">
                      <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-2">Projects</div>
                      {result.originalResume.projects.map((proj, idx) => (
                        <div key={idx} className="mb-3 last:mb-0">
                          <div className="font-bold text-slate-850">{proj.title}</div>
                          <p className="text-gray-500 italic mt-0.5">"{proj.description}"</p>
                          <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-500">
                            {proj.bullets.map((b, i) => <li key={i}>"{b}"</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-150 pt-3">
                      <div className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-2">Education</div>
                      {result.originalResume.education.map((edu, idx) => (
                        <div key={idx} className="mb-2 last:mb-0">
                          <div className="flex justify-between font-bold text-slate-850">
                            <span>{edu.institution}</span>
                            <span className="text-gray-400 font-medium text-[10px]">{edu.date}</span>
                          </div>
                          <div className="text-gray-500 mt-0.5">{edu.degree} {edu.gpa && `| GPA: ${edu.gpa}`}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Optimized Side */}
                <div className={`border-2 rounded-2xl p-5 shadow-sm relative transition-all duration-300 ${applied ? 'border-emerald-500 bg-emerald-50/10' : 'border-[#4f46e5]/30 bg-indigo-50/5'}`}>
                  <span className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${applied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-indigo-50 text-indigo-650 border-indigo-150'}`}>
                    {applied ? `Improvements Integrated (ATS: ${result.improvedAtsScore || 96}/100)` : `AI Optimization Preview (Est. ATS: ${result.improvedAtsScore || 96}/100)`}
                  </span>
                  <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wide mb-4">AI-Optimized Resume</h4>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 text-left font-sans text-xs text-slate-800 leading-relaxed">
                    <div>
                      <div className="text-base font-bold text-slate-900">{result.improvedResume.personalInfo.name}</div>
                      <div className="text-gray-500 mt-0.5">
                        {result.improvedResume.personalInfo.email} {result.improvedResume.personalInfo.phone && `| ${result.improvedResume.personalInfo.phone}`} {result.improvedResume.personalInfo.location && `| ${result.improvedResume.personalInfo.location}`}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-150 pt-3">
                      <div className="font-bold text-indigo-800 uppercase tracking-wider text-[10px] mb-1">Professional Summary</div>
                      <p className={`font-medium ${applied ? 'text-emerald-900 bg-emerald-50/30 p-2 rounded-lg border border-emerald-100/50' : 'text-slate-850'}`}>
                        {result.improvedResume.summary}
                      </p>
                    </div>

                    <div className="border-t border-gray-150 pt-3">
                      <div className="font-bold text-indigo-800 uppercase tracking-wider text-[10px] mb-1.5">Skills</div>
                      <div className="flex flex-wrap gap-1">
                        {result.improvedResume.skills.map((s, i) => {
                          const isNew = !result.originalResume!.skills.includes(s);
                          return (
                            <span 
                              key={i} 
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${isNew ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm font-bold' : 'bg-gray-100 border-gray-250 text-gray-700'}`}
                            >
                              {s} {isNew && '★'}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-gray-150 pt-3">
                      <div className="font-bold text-indigo-800 uppercase tracking-wider text-[10px] mb-2">Work Experience</div>
                      {result.improvedResume.experience.map((exp, idx) => (
                        <div key={idx} className="mb-3 last:mb-0">
                          <div className="flex justify-between font-bold text-slate-855">
                            <span>{exp.company} - {exp.role}</span>
                            <span className="text-gray-400 font-medium text-[10px]">{exp.date}</span>
                          </div>
                          <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-700">
                            {exp.bullets.map((b, i) => {
                              const isModified = !result.originalResume!.experience[idx]?.bullets.includes(b);
                              return (
                                <li 
                                  key={i} 
                                  className={isModified ? 'text-emerald-800 bg-emerald-50/20 px-1 py-0.5 rounded font-medium border border-dashed border-emerald-100/50' : 'text-slate-600'}
                                >
                                  {b}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-150 pt-3">
                      <div className="font-bold text-indigo-800 uppercase tracking-wider text-[10px] mb-2">Projects</div>
                      {result.improvedResume.projects.map((proj, idx) => (
                        <div key={idx} className="mb-3 last:mb-0">
                          <div className="font-bold text-slate-855">{proj.title}</div>
                          <p className="text-slate-700 mt-0.5 font-medium">{proj.description}</p>
                          <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-700">
                            {proj.bullets.map((b, i) => {
                              const isModified = !result.originalResume!.projects[idx]?.bullets.includes(b);
                              return (
                                <li 
                                  key={i} 
                                  className={isModified ? 'text-emerald-800 bg-emerald-50/20 px-1 py-0.5 rounded font-medium border border-dashed border-emerald-100/50' : 'text-slate-600'}
                                >
                                  {b}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-150 pt-3">
                      <div className="font-bold text-indigo-800 uppercase tracking-wider text-[10px] mb-2">Education</div>
                      {result.improvedResume.education.map((edu, idx) => (
                        <div key={idx} className="mb-2 last:mb-0">
                          <div className="flex justify-between font-bold text-slate-855">
                            <span>{edu.institution}</span>
                            <span className="text-gray-400 font-medium text-[10px]">{edu.date}</span>
                          </div>
                          <div className="text-slate-600 mt-0.5">{edu.degree} {edu.gpa && `| GPA: ${edu.gpa}`}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {result.rewriteSuggestions && result.rewriteSuggestions.length > 0 && !result.originalResume && (
            <div className="liquid-glass-light rounded-3xl p-6 sm:p-8 animate-in fade-in duration-350">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Resume Bullet Point Rewrites</h3>
              <p className="text-gray-500 text-[13px] mb-6">AI-generated recommendations to elevate technical achievements to action-oriented, metrics-driven bullet points.</p>
              
              <div className="space-y-4">
                {result.rewriteSuggestions.map((rewrite, idx) => (
                  <div key={idx} className="grid md:grid-cols-2 gap-4 p-5 rounded-2xl bg-white/40 border border-gray-200/50 shadow-sm">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100 inline-block">Original</span>
                      <p className="text-[13.5px] text-gray-600 italic bg-red-50/20 border border-red-100/50 p-3.5 rounded-xl">"{rewrite.original}"</p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 inline-block">AI Improved</span>
                      <p className="text-[13.5px] text-slate-800 font-medium bg-emerald-50/20 border border-emerald-100/50 p-3.5 rounded-xl">"{rewrite.improved}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
