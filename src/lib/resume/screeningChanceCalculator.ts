// Deterministic "Estimated Resume Screening Chance" calculator.
//
// Produces a percentage estimate derived from the ATS score, keyword coverage,
// technical coverage, experience/project relevance and overall resume quality.
// No randomness — identical inputs always return identical output.

import type { ResumeData, JobProfile, KeywordAnalysis, ATSScore, ScreeningChance } from "./types";

const DISCLAIMER =
  "This percentage is an estimate based on resume-to-job alignment and ATS compatibility. Actual hiring decisions depend on the employer and recruitment process.";

export function calculateScreeningChance(
  resume: ResumeData,
  job: JobProfile,
  keywords: KeywordAnalysis,
  score: ATSScore
): ScreeningChance {
  const total = Math.max(1, keywords.targetKeywords.length);
  const keywordCoverage = keywords.matched.length / total; // 0..1
  const techMatched = keywords.matched.filter((k) =>
    /^(javascript|typescript|python|java|react|next\.js|node|sql|aws|docker|html|css|vue|angular|spring|django|tensorflow|pytorch|kubernetes|mongodb|postgresql|redis|graphql|tailwind|redux|fastapi|flask|git|linux|azure|gcp)$/.test(k)
  ).length;
  const techCoverage = techMatched / Math.max(1, keywords.targetKeywords.filter((k) => /javascript|typescript|python|java|react|next|node|sql|aws|docker|html|css|vue|angular|spring|django|tensorflow|pytorch|kubernetes|mongodb|postgresql|redis|graphql|tailwind|redux|fastapi|flask|git|linux|azure|gcp/.test(k)).length);

  const expNorm = (score.categories.find((c) => c.key === "experienceRelevance")?.score ?? 0) / 15;
  const projNorm = (score.categories.find((c) => c.key === "projectRelevance")?.score ?? 0) / 10;
  const qualityNorm =
    ((score.categories.find((c) => c.key === "resumeStructure")?.score ?? 0) +
      (score.categories.find((c) => c.key === "formatting")?.score ?? 0) +
      (score.categories.find((c) => c.key === "quantified")?.score ?? 0) +
      (score.categories.find((c) => c.key === "actionVerbs")?.score ?? 0)) /
    (10 + 5 + 5 + 5);

  // Weighted blend.
  const raw =
    score.total * 0.45 +
    keywordCoverage * 100 * 0.2 +
    techCoverage * 100 * 0.15 +
    expNorm * 100 * 0.1 +
    projNorm * 100 * 0.05 +
    qualityNorm * 100 * 0.05;

  const percent = Math.max(5, Math.min(95, Math.round(raw)));

  const factorsIncreasing: string[] = [];
  const factorsDecreasing: string[] = [];

  if (keywordCoverage >= 0.6)
    factorsIncreasing.push(`Strong keyword alignment (${Math.round(keywordCoverage * 100)}% of target keywords matched).`);
  else if (keywordCoverage >= 0.4)
    factorsIncreasing.push(`Moderate keyword alignment (${Math.round(keywordCoverage * 100)}% matched).`);

  if (resume.sectionsPresent.experience)
    factorsIncreasing.push("Relevant work experience section detected.");
  if (resume.projects.length > 0)
    factorsIncreasing.push(`${resume.projects.length} project(s) demonstrate applied skills.`);
  if ((score.categories.find((c) => c.key === "quantified")?.score ?? 0) >= 3)
    factorsIncreasing.push("Quantified, impact-driven achievements strengthen the application.");
  if ((score.categories.find((c) => c.key === "resumeStructure")?.score ?? 0) >= 8)
    factorsIncreasing.push("Clear, ATS-friendly resume structure.");

  if (keywords.missing.length > 0)
    factorsDecreasing.push(`${keywords.missing.length} target keyword(s) missing from the resume.`);
  if ((score.categories.find((c) => c.key === "quantified")?.score ?? 0) < 3)
    factorsDecreasing.push("Few or no quantified metrics to demonstrate impact.");
  if (!resume.sectionsPresent.experience)
    factorsDecreasing.push("No clearly detected work experience section.");
  if (!resume.sectionsPresent.summary)
    factorsDecreasing.push("Missing a professional summary.");
  if (resume.skills.length < 5)
    factorsDecreasing.push("Limited documented technical skill breadth.");

  return { percent, disclaimer: DISCLAIMER, factorsIncreasing, factorsDecreasing };
}
