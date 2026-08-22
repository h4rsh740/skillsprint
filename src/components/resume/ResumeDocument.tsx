import React from "react";
import { ResumeData, EnhancedResume, ResumeChange } from "@/lib/resumeiq/types";

const CHANGE_TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  Added: { label: "Added", bg: "bg-emerald-50 dark:bg-emerald-950/30", color: "text-emerald-700 dark:text-emerald-400" },
  Improved: { label: "Improved", bg: "bg-blue-50 dark:bg-blue-950/30", color: "text-blue-700 dark:text-blue-400" },
  "Keyword Optimized": { label: "Keyword Optimized", bg: "bg-purple-50 dark:bg-purple-950/30", color: "text-purple-700 dark:text-purple-400" },
  Reorganized: { label: "Reorganized", bg: "bg-amber-50 dark:bg-amber-950/30", color: "text-amber-700 dark:text-amber-400" },
  Condensed: { label: "Condensed", bg: "bg-neutral-100 dark:bg-neutral-800/40", color: "text-neutral-700 dark:text-neutral-300" },
  // Legacy aliases
  ATS_OPTIMIZATION: { label: "ATS Optimization", bg: "bg-emerald-50 dark:bg-emerald-950/30", color: "text-emerald-700 dark:text-emerald-400" },
  GRAMMAR_SPELLING: { label: "Grammar & Spelling", bg: "bg-blue-50 dark:bg-blue-950/30", color: "text-blue-700 dark:text-blue-400" },
  CLARITY_CONCISENESS: { label: "Clarity & Conciseness", bg: "bg-amber-50 dark:bg-amber-950/30", color: "text-amber-700 dark:text-amber-400" },
  IMPACT_METRICS: { label: "Impact & Metrics", bg: "bg-purple-50 dark:bg-purple-950/30", color: "text-purple-700 dark:text-purple-400" },
  PROFESSIONAL_TONE: { label: "Professional Tone", bg: "bg-indigo-50 dark:bg-indigo-950/30", color: "text-indigo-700 dark:text-indigo-400" },
};

interface ResumeDocumentProps {
  data: ResumeData | EnhancedResume;
  changes?: ResumeChange[];
  selectedId?: string;
  onSelect?: (ch: ResumeChange) => void;
  isOrig?: boolean;
}

export function ResumeDocument({ data, changes = [], selectedId, onSelect, isOrig }: ResumeDocumentProps) {
  const isTwoColumn = data.layout?.type === "two-column";

  const findChange = (text: string, sectionHint: string) => {
    if (!text || !changes.length) return null;
    const cleanText = text.trim().toLowerCase();
    return changes.find(c => {
      if (sectionHint && !c.section.toLowerCase().includes(sectionHint.toLowerCase())) return false;
      const matchText = isOrig ? c.original : c.enhanced;
      if (!matchText) return false;
      const cleanMatch = matchText.trim().toLowerCase();
      return cleanMatch.includes(cleanText) || cleanText.includes(cleanMatch);
    });
  };

  const renderBullet = (bullet: string, sectionHint: string, idx: number) => {
    const ch = findChange(bullet, sectionHint);
    const highlighted = Boolean(ch);
    const isSelected = ch && selectedId === ch.id;
    const meta = ch ? (CHANGE_TYPE_META[ch.changeType] || CHANGE_TYPE_META.Improved) : null;

    return (
      <li 
        key={idx}
        onClick={() => onSelect && ch && onSelect(ch)}
        className={`text-[10.5px] leading-snug rounded relative ml-3 pl-1 mb-1 list-disc ${
          highlighted && meta 
            ? `${meta.bg} border-l-2 ${isSelected ? "border-l-indigo-600 bg-indigo-50/50" : "border-l-indigo-400/50"} ${onSelect ? 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800' : ''} my-0.5 py-0.5` 
            : "text-neutral-950 dark:text-neutral-200"
        }`}
      >
        {bullet}
      </li>
    );
  };

  const renderSectionContent = (section: any) => {
    const { type, title, id } = section;
    
    if (type === "summary" && data.summary) {
      const ch = findChange(data.summary, "summary");
      const highlighted = Boolean(ch);
      const isSelected = ch && selectedId === ch.id;
      const meta = ch ? CHANGE_TYPE_META[ch.changeType as keyof typeof CHANGE_TYPE_META] : null;
      return (
        <p 
          onClick={() => onSelect && ch && onSelect(ch)}
          className={`text-[10.5px] leading-snug rounded mb-4 ${
            highlighted && meta
              ? `${meta.bg} border-l-2 ${isSelected ? "border-l-indigo-600 bg-indigo-50/50" : "border-l-indigo-400/50"} ${onSelect ? 'cursor-pointer hover:bg-neutral-100' : ''} p-1`
              : "text-neutral-950 dark:text-neutral-200"
          }`}
        >
          {data.summary}
        </p>
      );
    }

    if (type === "experience" && data.experience?.length > 0) {
      return (
        <div className="space-y-3 mb-4">
          {data.experience.map((exp, idx) => (
            <div key={idx}>
              <div className="flex justify-between items-baseline font-bold text-neutral-950 dark:text-white text-[11px]">
                <span>{exp.position}</span>
                <span className="text-[10px] font-normal text-neutral-700 dark:text-neutral-400">{exp.startDate} – {exp.endDate || "Present"}</span>
              </div>
              <div className="flex justify-between items-baseline text-neutral-800 dark:text-neutral-300 text-[10.5px] italic mb-1">
                <span>{exp.company}</span>
                <span>{exp.location}</span>
              </div>
              <ul className="mt-1">
                {exp.bullets.map((bullet, bIdx) => renderBullet(bullet, "experience", bIdx))}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    if (type === "projects" && data.projects?.length > 0) {
      return (
        <div className="space-y-3 mb-4">
          {data.projects.map((proj, idx) => (
            <div key={idx}>
              <div className="text-neutral-950 dark:text-white text-[11px] font-bold">
                {proj.name}
              </div>
              {proj.description && <div className="text-[10px] text-neutral-700 dark:text-neutral-400 italic mb-1">{proj.description}</div>}
              <ul className="mt-1">
                {proj.bullets.map((bullet, bIdx) => renderBullet(bullet, "project", bIdx))}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    if (type === "skills" && data.skills?.length > 0) {
      return (
        <div className="mb-4">
          <ul className="text-[10.5px] text-neutral-950 dark:text-neutral-200 space-y-1">
            {data.skills.map((skill, sIdx) => {
              const ch = findChange(skill, "skills");
              const highlighted = Boolean(ch);
              const isSelected = ch && selectedId === ch.id;
              const meta = ch ? CHANGE_TYPE_META[ch.changeType as keyof typeof CHANGE_TYPE_META] : null;
              return (
                <li 
                  key={sIdx}
                  onClick={() => onSelect && ch && onSelect(ch)}
                  className={`list-disc ml-3 pl-1 rounded transition-all ${
                    highlighted && meta
                      ? `${meta.bg} ${isSelected ? "ring-1 ring-indigo-600" : ""} ${onSelect ? 'cursor-pointer hover:bg-neutral-100' : ''} p-0.5`
                      : ""
                  }`}
                >
                  {skill}
                </li>
              );
            })}
          </ul>
        </div>
      );
    }

    if (type === "education" && data.education?.length > 0) {
      return (
        <div className="space-y-2 mb-4">
          {data.education.map((edu, idx) => (
            <div key={idx} className="flex justify-between items-baseline text-[10.5px]">
              <div>
                <span className="font-bold text-neutral-950 dark:text-white">{edu.degree}</span>
                <span className="text-neutral-800 dark:text-neutral-300">, {edu.school}</span>
              </div>
              <span className="text-[10px] text-neutral-700 dark:text-neutral-400 whitespace-nowrap ml-2">
                {edu.startDate || edu.endDate ? `${edu.startDate || ""} – ${edu.endDate || ""}` : ""}
              </span>
            </div>
          ))}
        </div>
      );
    }
    
    if (type === "certifications" && data.certifications?.length > 0) {
      return (
        <div className="mb-4 text-[10.5px]">
          {data.certifications.map((item, i) => {
             const parts = item.split(/\s*[-–]\s*/);
             if (parts.length >= 2) {
               return (
                 <div key={i} className="flex justify-between py-0.5 border-b border-neutral-300 dark:border-neutral-800 last:border-0">
                   <span className="font-medium text-neutral-950 dark:text-neutral-200">{parts[0]}</span>
                   <span className="text-neutral-700 dark:text-neutral-400 text-right max-w-[40%]">{parts.slice(1).join(" - ")}</span>
                 </div>
               );
             }
             return <div key={i} className="py-0.5 text-neutral-950 dark:text-neutral-200">{item}</div>;
          })}
        </div>
      );
    }

    const isGenericList = ["achievements", "extracurricular"].includes(type);
    if (isGenericList) {
      const listData = (data as any)[type] as string[];
      if (listData?.length > 0) {
        return (
          <ul className="mb-4">
            {listData.map((item, i) => (
              <li key={i} className="text-[10.5px] leading-snug text-neutral-950 dark:text-neutral-200 list-disc ml-3 pl-1 mb-1">{item}</li>
            ))}
          </ul>
        );
      }
    }

    if (type === "areasOfInterest" && data.areasOfInterest?.length > 0) {
      return (
        <ul className="mb-4">
          {data.areasOfInterest.map((item, i) => (
            <li key={i} className="text-[10.5px] leading-snug text-neutral-950 dark:text-neutral-200 list-disc ml-3 pl-1 mb-0.5">{item}</li>
          ))}
        </ul>
      );
    }

    if (type === "custom") {
      const customSec = data.customSections?.find(c => c.title === title);
      if (customSec && customSec.content?.length > 0) {
        return (
          <ul className="mb-4">
            {customSec.content.map((item, i) => (
              <li key={i} className="text-[10.5px] leading-snug text-neutral-950 dark:text-neutral-200 list-disc ml-3 pl-1 mb-1">{item}</li>
            ))}
          </ul>
        );
      }
    }

    return null;
  };

  const renderSectionBlock = (section: any) => (
    <div key={section.id} className="mb-2">
      <div className="font-bold text-neutral-950 dark:text-white uppercase tracking-widest text-[11px] mb-1.5 pb-0.5 border-b border-neutral-900 dark:border-neutral-400">
        {section.title}
      </div>
      {renderSectionContent(section)}
    </div>
  );

  const defaultSections = [
    { id: "sec-sum", title: "Summary", type: "summary", order: 0, column: "main" },
    { id: "sec-sk", title: "Technical Skills", type: "skills", order: 1, column: "main" },
    { id: "sec-exp", title: "Work Experience", type: "experience", order: 2, column: "main" },
    { id: "sec-proj", title: "Projects", type: "projects", order: 3, column: "main" },
    { id: "sec-edu", title: "Education", type: "education", order: 4, column: "main" },
    { id: "sec-cert", title: "Certifications", type: "certifications", order: 5, column: "main" },
    { id: "sec-ach", title: "Achievements", type: "achievements", order: 6, column: "main" },
  ];

  const sectionsList = (data.layout?.sections && data.layout.sections.length > 0)
    ? data.layout.sections
    : defaultSections;

  const leftSections = sectionsList.filter(s => s.column === "left" && s.title.toLowerCase() !== "contact");
  const rightSections = sectionsList.filter(s => s.column === "right" && s.title.toLowerCase() !== "contact");
  const mainSections = isTwoColumn
    ? []
    : sectionsList.filter(s => s.title.toLowerCase() !== "contact");

  const name = data.personal?.name || data.name || "Candidate Name";
  const title = data.personal?.title || data.title || "";

  return (
    <div className="bg-white dark:bg-neutral-950 w-[794px] min-h-[1123px] p-12 text-left font-serif mx-auto print:m-0 print:p-8 print:shadow-none print:w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-neutral-950 dark:text-white mb-1">
          {name}
        </h1>
        {title ? (
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">
            {title}
          </h2>
        ) : null}
        
        {(!isTwoColumn || !data.layout?.sections?.some(s => s.title.toLowerCase() === "contact")) && (
          <div className="text-[10.5px] text-neutral-800 dark:text-neutral-300 flex flex-wrap gap-x-2 gap-y-1">
            {[
              data.personal?.phone || data.phone, 
              data.personal?.email || data.email, 
              data.personal?.location || data.location, 
              data.personal?.linkedin || data.linkedin, 
              data.personal?.github || data.github,
              data.personal?.portfolio || data.portfolio,
              ...(data.personal?.otherLinks || [])
            ].filter(Boolean).map((info, i, arr) => (
              <span key={i} className="inline-flex items-center">
                {info}
                {i < arr.length - 1 && <span className="ml-2">|</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {isTwoColumn ? (
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-[35%] flex flex-col shrink-0">
            {data.layout?.sections?.some(s => s.title.toLowerCase() === "contact") && (
              <div className="mb-2">
                <div className="font-bold text-neutral-950 dark:text-white uppercase tracking-widest text-[11px] mb-1.5 pb-0.5 border-b border-neutral-900 dark:border-neutral-400">
                  Contact
                </div>
                <ul className="text-[10.5px] text-neutral-950 dark:text-neutral-200 space-y-1 mb-4">
                  {(data.personal?.phone || data.phone) && <li>{data.personal?.phone || data.phone}</li>}
                  {(data.personal?.email || data.email) && <li>{data.personal?.email || data.email}</li>}
                  {(data.personal?.location || data.location) && <li>{data.personal?.location || data.location}</li>}
                  {(data.personal?.linkedin || data.linkedin) && <li>{data.personal?.linkedin || data.linkedin}</li>}
                  {(data.personal?.github || data.github) && <li>{data.personal?.github || data.github}</li>}
                </ul>
              </div>
            )}
            {leftSections.map(renderSectionBlock)}
          </div>
          
          <div className="w-full md:w-[65%] flex flex-col">
            {rightSections.map(renderSectionBlock)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {mainSections.map(renderSectionBlock)}
        </div>
      )}
    </div>
  );
}
