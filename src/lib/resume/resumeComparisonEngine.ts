// Comparison helpers for the Original vs Enhanced view.
//
// Computes per-category score deltas and groups tracked changes by section.
// Pure and deterministic.

import type { ATSScore, ResumeChange } from "./types";

export interface CategoryDelta {
  label: string;
  before: number;
  after: number;
  delta: number;
  max: number;
}

export function categoryDeltas(before: ATSScore, after: ATSScore): CategoryDelta[] {
  const byKey = new Map(after.categories.map((c) => [c.key, c]));
  return before.categories.map((b) => {
    const a = byKey.get(b.key);
    const afterScore = a ? a.score : b.score;
    return {
      label: b.label,
      before: b.score,
      after: afterScore,
      delta: afterScore - b.score,
      max: b.max,
    };
  });
}

export function changesBySection(changes: ResumeChange[]): Record<string, ResumeChange[]> {
  const out: Record<string, ResumeChange[]> = {};
  for (const c of changes) {
    if (!out[c.section]) out[c.section] = [];
    out[c.section].push(c);
  }
  return out;
}

export const CHANGE_TYPE_META: Record<
  ResumeChange["changeType"],
  { label: string; color: string; bg: string; border: string }
> = {
  added: { label: "Added", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  improved: { label: "Improved", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  keyword: { label: "Keyword", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  removed: { label: "Removed", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
  reordered: { label: "Reordered", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
};
