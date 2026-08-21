# SkillSprint AI — Razorpay Buildathon: Open Track Task List

> **Track**: Open Track  
> **Centerpiece**: Full student journey: Onboarding → Profile & GitHub/Resume Analysis → AI Learning Roadmap → AI Mock Interview  
> **Focus**: Zero-error end-to-end flow, rock-solid reliability, before/after value proof, crisp demo recording.

---

## DAY 1 — Stress-Test and Stabilize the Full Journey ✅ DONE

### Morning: End-to-End Walkthrough & Issue Discovery
- [x] Walk the entire flow as a fresh user — all 8 routes return **200 OK** ✅
- [x] Sign Up / Auth login flow ✅
- [x] Connect GitHub profile & trigger repo analysis ✅
- [x] Upload Resume & trigger ATS/keyword scan ✅
- [x] View Career Score breakdown & Skill Gaps page ✅
- [x] Generate dynamic Learning Roadmap based on identified gaps ✅
- [x] Launch AI Voice Mock Interview session & submit answers ✅

### Afternoon: Bug Fixing & Stabilization
- [x] `npx tsc --noEmit` → **0 errors** ✅
- [x] Removed dead files: `receipt-printer.tsx`, `agent-gating.ts` ✅
- [x] Gemini API fallbacks present in all actions ✅
- [x] Demo profile seed available via `/dashboard/admin` → "Seed Dummy Candidates" ✅
  > **You still need to:** Log in → go to `/dashboard/admin` → click seed button once

### ✅ Day 1 Checkpoint — COMPLETE

---

## DAY 2 — Sharpen the "Value" Story + UI Polish ✅ DONE

### The "Before → AI Insight → After" Value Loop
- [x] Resume Intel page shows `beforeScore` vs `afterScore` side-by-side with delta `+N pts` ✅
- [x] **NEW**: "Re-scan Resume" button added below KPI row — re-runs full ATS analysis on same resume ✅
- [x] **NEW**: "Rescan #N ✦" tab appears after first rescan — shows 3-column score comparison (Scan 1 · Delta · Current) ✅
- [x] Career Score recalculation via `db.updateScores()` on new analyses ✅

### UI Polish & Timing Run
- [x] Overview Dashboard (`/dashboard`) ✅
- [x] Resume Intel & ATS Analyzer with Rescan (`/dashboard/resume-intel`) ✅
- [x] AI Learning Roadmap (`/dashboard/roadmap`) ✅
- [x] AI Mock Interview — voice + text mode (`/dashboard/mock-interview`) ✅
- [ ] Run 2 full timed rehearsals (target: 2.5–3 min demo window) — needs you
- [ ] Practice architecture explanation aloud — needs you

### ✅ Day 2 Checkpoint — CODE COMPLETE (rehearsals pending)

---

## DAY 3 — Repo, Pitch & Submit

### Morning: Documentation & Code Cleanup ✅ DONE
- [x] README rewritten with:
  - [x] Clear 3-line problem statement ✅
  - [x] AI pipeline table (what Gemini does at each step) ✅
  - [x] Correct `DATABASE_URL` using Supabase pooler pattern ✅
  - [x] Local setup & env instructions ✅
- [x] `.env.example` created with all actually-used vars, no dead Razorpay/KV vars ✅
- [x] Dead code removed (`receipt-printer.tsx`, `agent-gating.ts`) ✅
- [x] `npx tsc --noEmit` → **0 errors** ✅

### Afternoon: Pitch Recording — needs you
- [ ] Structure and record pitch video (under 5 minutes):
  - `[0:00–0:30]` Problem: career-readiness gap for CS students
  - `[0:30–3:00]` Live Demo: Sign up → GitHub → Resume ATS → **Re-scan** → Roadmap → Voice Interview
  - `[3:00–3:45]` Architecture: Gemini models, Web Speech, Supabase, Career Twin
  - `[3:45–4:15]` Value proof: Before/After score improvement + **Rescan Progress Tracker** shown live
  - `[4:15–4:45]` Closing vision
- [ ] Record 2 takes, pick the cleaner one

### Evening: Submission — needs you
- [ ] Upload video (YouTube unlisted or Loom)
- [ ] Confirm GitHub repo is public
- [ ] Submit on Devfolio ahead of the 5 Sept deadline

---

## Non-Negotiable Checkpoints Summary

| Phase | Gate | Status |
|---|---|---|
| **End of Day 1** | Full journey runs start-to-finish without error | ✅ **DONE** |
| **End of Day 2** | "Before → AI → After" value loop ready for camera | ✅ **DONE** |
| **End of Day 3** | Pitch recorded & submitted on Devfolio | ⏳ Needs you |
