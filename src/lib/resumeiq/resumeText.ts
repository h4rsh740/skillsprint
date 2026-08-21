import { EnhancedResume, ResumeData } from "./types";

export function enhancedToResumeData(enhanced: EnhancedResume): ResumeData {
  // Construct rawText representation for ATS scoring
  const parts: string[] = [];

  parts.push(enhanced.name || "");
  parts.push(enhanced.summary || "");
  parts.push((enhanced.skills || []).join(", "));

  (enhanced.experience || []).forEach(exp => {
    parts.push(`${exp.company} ${exp.position} ${exp.bullets.join(" ")}`);
  });

  (enhanced.projects || []).forEach(proj => {
    parts.push(`${proj.name} ${proj.bullets.join(" ")}`);
  });

  (enhanced.education || []).forEach(edu => {
    parts.push(`${edu.school} ${edu.degree}`);
  });

  parts.push((enhanced.certifications || []).join(", "));
  parts.push((enhanced.achievements || []).join(", "));

  const rawText = parts.filter(Boolean).join("\n\n");

  return {
    ...enhanced,
    rawText,
  } as ResumeData;
}
