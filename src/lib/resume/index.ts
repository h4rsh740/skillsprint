// Orchestrator for the full local resume analysis pipeline.
//
// Stages, all deterministic and API-free:
//   1. structure raw text -> ResumeData
//   2. analyze job keywords
//   3. score original resume (ATS)
//   4. detect issues
//   5. enhance resume (rule-based, anti-hallucination) + re-score
//   6. compute screening chance
//
// The enhancement is re-run once more if the improvement is small, using only
// valid resume information (no fabrication).

import { structureResume } from "./resumeStructurer";
import { analyzeKeywords } from "./jobKeywordExtractor";
import { scoreResume } from "./atsScoringEngine";
import { detectIssues } from "./resumeIssueDetector";
import { enhanceResume } from "./resumeEnhancementEngine";
import { calculateScreeningChance } from "./screeningChanceCalculator";
import type { JobProfile, ResumeAnalysis, ResumeData } from "./types";

const MIN_IMPROVEMENT = 8;

export function analyzeResumeComplete(
  resumeText: string,
  job: JobProfile,
  fileName: string,
  fileSize: number
): ResumeAnalysis {
  const original: ResumeData = structureResume(resumeText);
  const keywords = analyzeKeywords(original, job);

  const beforeScore = scoreResume(original, job, keywords);
  const issues = detectIssues(original, job, keywords, beforeScore);

  // Pass 1
  const enhanced1 = enhanceResume(original, job, keywords, 1);
  const after1 = scoreResume(enhanced1.data, job, keywords);

  // Optional pass 2 when the first pass barely moved the needle.
  let best = { enhanced: enhanced1, score: after1 };
  if (after1.total - beforeScore.total < MIN_IMPROVEMENT) {
    const enhanced2 = enhanceResume(original, job, keywords, 2);
    const after2 = scoreResume(enhanced2.data, job, keywords);
    if (after2.total > after1.total) best = { enhanced: enhanced2, score: after2 };
  }

  // Never let the "enhanced" score regress below the original (the structured
  // text can occasionally be slightly lossier than the raw extract). If no
  // variant improves on the original, keep the original as-is — honest, no
  // fabricated improvement and no degradation.
  let enhanced = best.enhanced;
  let afterScore = best.score;
  if (afterScore.total < beforeScore.total) {
    enhanced = { data: original, changes: [] };
    afterScore = beforeScore;
  }

  const screening = calculateScreeningChance(original, job, keywords, beforeScore);

  return {
    original,
    enhanced,
    keywords,
    beforeScore,
    afterScore,
    issues,
    screening,
    job,
    fileName,
    fileSize,
  };
}
