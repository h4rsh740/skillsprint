import { EnhancedResume, ResumeData } from "./types";

export function enhancedToResumeData(enhanced: EnhancedResume): ResumeData {
  // Construct rawText representation for ATS scoring
  const parts: string[] = [];

  parts.push(enhanced.personal?.name || enhanced.name || "");
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
  parts.push((enhanced.extracurricular || []).join(", "));
  parts.push((enhanced.areasOfInterest || []).join(", "));

  const rawText = parts.filter(Boolean).join("\n\n");

  return {
    ...enhanced,
    rawText,
  } as ResumeData;
}
