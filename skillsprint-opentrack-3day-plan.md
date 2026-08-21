# SkillSprint AI — Razorpay Buildathon: Open Track, 3-Day Plan

Track: Open Track
Centerpiece: Full journey — profile → analysis → roadmap → interview prep
No new payment/commerce integration. Focus: reliability, polish, demo quality.

---

## Why this works for Open Track
- "Build a solution around a real problem" — placement/career-readiness gap for students.
- "Use AI meaningfully" — GitHub skill inference, resume/ATS analysis, roadmap generation, voice interview are all already AI-core, not decorative.
- "Demonstrate a working product" — the full journey already exists; risk is in reliability, not building.
- "Show measurable or clearly demonstrated value" — needs a concrete before/after (e.g. ATS score improvement, skill gap closed) shown on camera.

---

## DAY 1 — Stress-test and stabilize the full journey

- [ ] Walk the entire flow yourself as a fresh user: sign up → connect GitHub → upload resume → get ATS score → see skill gaps → get roadmap → start a mock interview. Note every rough edge, slow load, or broken state.
- [ ] Fix anything that breaks the chain — a demo that stalls mid-flow is worse than a smaller demo that's smooth. Prioritize fixing over adding.
- [ ] Pick (or create) ONE realistic demo profile/resume that produces a compelling, slightly-flawed ATS score (not 95/100 — a real gap makes the "value" story land better) and clear, specific skill gaps.
- [ ] If GitHub inference or resume parsing is flaky with real accounts, seed a clean demo account now so Day 3 recording isn't fighting live data quality.

**End of Day 1 checkpoint:** You can run the full journey once, start to finish, without hitting a bug.

---

## DAY 2 — Sharpen the "value" story + fill gaps

- [ ] Identify the clearest before/after moment in the flow (e.g., "ATS score 58 → roadmap recommends 3 specific skills → after adding a project matching gap #1, rescan shows 71"). If this loop doesn't exist yet, this is the one thing worth building — a "rescan after roadmap action" moment is your strongest evidence of value.
- [ ] Polish the weakest UI screen in the chain (usually roadmap or interview prep) — just enough that nothing looks unfinished on camera, not a redesign.
- [ ] Run the full journey twice more, timing it — it needs to fit comfortably inside ~3 minutes of the 5-minute pitch, leaving room for problem framing and architecture.
- [ ] Write the architecture explanation: which AI models power which step (Gemini for X, GitHub API + inference for Y, etc.) — Open Track still rewards "technical depth," so be ready to name the actual pipeline, not just "we use AI."

**End of Day 2 checkpoint:** The full journey runs smoothly twice in a row, and you can point to one concrete "before → AI insight → after" moment as your value proof.

---

## DAY 3 — Repo, pitch, submit

**Morning**
- [ ] Rewrite README top section: problem statement (3 lines), what the AI actually does at each step, setup instructions.
- [ ] Clean commit history if it's messy; remove dead code, unused env vars, leftover payment scaffolding if any exists from earlier exploration.

**Afternoon**
- [ ] Record the pitch: problem (20s) → live full-journey demo (2.5–3 min) → architecture walkthrough naming the AI pipeline (45s) → the before/after value moment called out explicitly (20s) → close. Do 2 takes.
- [ ] Final check: repo is public, README is readable standalone, video file/link works.

**Evening**
- [ ] Submit early, not at the deadline — leaves buffer for form/upload issues.

---

## What NOT to build
- No Razorpay/payment integration — not required for Open Track.
- No new AI features — this is a reliability and storytelling sprint, not a build sprint.
- No new UI screens beyond polishing what's already in the journey.

## Non-negotiable checkpoint
By end of Day 2: the full journey (profile → analysis → roadmap → interview prep) runs twice in a row without failure, and you have one clear, specific "value demonstrated" moment ready to show on camera.
