# SkillSprint AI Upgrade Audit

> Phase 0 deliverable. Produced by a full read-only trace of the repository at commit
> `519e21a` (branch `main`). No source files were modified. Every claim below was
> verified against the actual code — file paths and line references are included so
> each statement can be independently checked.

## 1. Executive Summary

SkillSprint AI is a real, working full-stack product: Next.js 16 App Router + React 19 +
TypeScript, Firebase Auth, Prisma 5 over Supabase Postgres, Gemini/OpenRouter AI, GitHub
REST ingestion, Web Speech API voice interviews, and Vercel deployment. Its strongest
asset is an unusually honest engineering culture: a fully **deterministic ATS scoring
engine** with per-category explanations, an **anti-hallucination validator** for AI resume
rewrites, a transparency document (`docs/REAL_VS_SIMULATED.md`), and a benchmark harness
that actually executes (`scripts/benchmark/run_benchmark.ts`) with real (if small) results
in `data/benchmark_results.json`.

However, the core "Career Twin" intelligence is **not yet evidence-based**:

1. **Scores are opaque and partly hardcoded.** The 14-metric breakdown in
   `src/actions/scores.ts` derives frontend/backend/system-design/AI-readiness scores
   from binary skill-string checks with fixed constants (55/78, 50/80, 60/82, 45/85).
   The portfolio score is literally `75 if connected else 50`. None of these can answer
   *"why 74?"* with evidence.
2. **AI fallbacks are silent.** `generateStructuredAIResponse` (src/lib/ai.ts:1808) ends
   with `return simulatedPayload` — a static template — with **no flag returned to the
   UI**. A judge cannot tell a live projection from the fabricated one.
3. **Progress history is fabricated.** `history: [{April,58},{May,65..67},{June,current}]`
   is templated in three places (src/actions/scores.ts:114, src/lib/db.ts:724, and the
   twin build route). `growthPercentage` is measured against a hardcoded `58`.
4. **No evidence model.** GitHub analysis collects genuine signals (languages, README,
   CI/CD, streaks, PRs) but they dead-end in a JSON blob; they never flow into skill
   scores. Interview results and roadmap completions likewise never update skills.
5. **No target-role engine for the Twin.** A genuinely good deterministic job matcher
   exists (`src/lib/matching/jobMatcher.ts` — weighted, confident, disclaimed) but is
   only used for the Jobs page, not for Career Twin gap analysis.
6. **No test suite.** `package.json` has no test runner; the only evaluation is the
   8-resume/6-roadmap/4-twin benchmark.

The 9.5 upgrade path therefore does **not** require new features — it requires wiring the
*existing real signals* (resume analyses, GitHub analyses, interviews, roadmap
completions) into an **Evidence → Explainable Scoring → Validated AI → Highest-Impact
Action → Rescan** loop, reusing `jobMatcher.ts`'s design patterns, and making every
fallback visible. Sections 14–17 give the concrete, incremental plan.

## 2. Current Architecture

### 2.1 Stack (verified from `package.json`, `next.config.ts`)

| Layer | Technology |
|---|---|
| Framework | Next.js **16.2.9** (App Router, Turbopack, `serverExternalPackages` for pdf-parse/unpdf/openai), React 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4, framer-motion, shadcn/ui, recharts, three.js |
| Auth | Firebase Auth (`src/context/AuthContext.tsx`, `src/app/auth/*`, `src/actions/auth.ts`); GitHub/LinkedIn OAuth routes under `src/app/api/auth/*` |
| Database | Supabase Postgres via Prisma 5 (`prisma/schema.prisma`, 590 lines, 21 models); local JSON fallback `prisma/db.json` when `DATABASE_URL` absent |
| AI | `src/lib/ai.ts` — Gemini REST (4 free-tier models, JSON mode) → OpenRouter (claude/gpt) → static payload. `src/lib/ai/openrouter.ts` for the jobs path |
| External data | GitHub REST API (`src/actions/github.ts`), job/hackathon providers (`src/lib/opportunities/*`) |
| Voice | Web Speech API in `src/app/dashboard/mock-interview/page.tsx` |
| Mobile | Capacitor wrapper (`android/`) — not part of the web pipeline |
| Hosting | Vercel (`vercel.json`); Firebase env fallbacks baked into `next.config.ts` for build-time safety |

### 2.2 Directory map (source of truth)

```
src/
  app/
    api/            resume/{parse,pdf,diagnose,analyze,report,enhance,upload},
                    career-twin/build, jobs/sync, hackathons/sync, auth/*, debug/*, track
    auth/           signin, signup, callback (Firebase)
    dashboard/      page (overview), career-twin, github, roadmap, mock-interview,
                    resume-intel, skill-graph, jobs, hackathons, chat, leaderboard,
                    portfolio-analyzer, shortlisting, prep-quizzes, admin, settings
    onboarding/     profile + first resume
  actions/          auth, onboarding, resume, resumeAnalyzer, github, career-twin,
                    scores, projects, roadmap, interview, jobs, hackathons, chat,
                    portfolio, analytics, search, admin   (all "use server")
  components/       ui/* (shadcn), resume/ResumeDocument, charts/*, dashboard/*
  context/          AuthContext.tsx
  lib/
    ai.ts (1904 ln) AI gateway: chat + structured + large static career-coach RESPONSES
    db.ts (1558 ln) Data facade: Prisma → local JSON (only when DATABASE_URL unset)
    resume/         DETERMINISTIC pipeline: structurer, keyword extractor, ATS engine,
                    issue detector, enhancement engine, screening chance
    resumeiq/       Gemini-enhancement pipeline + resumeEnhancementValidator
    matching/       jobMatcher.ts (deterministic job fit + confidence), hackathonMatcher.ts
    candidateData.ts 250 synthetic demo candidates (shortlisting demo)
scripts/benchmark/run_benchmark.ts   real executable benchmark
data/benchmark_results.json          real output of last run (2026-09-09)
docs/REAL_VS_SIMULATED.md            existing transparency audit
```

### 2.3 Server-side patterns

- All business logic lives in `src/actions/*` ("use server") and `src/lib/*`; pages are
  thin clients calling actions (`src/app/dashboard/page.tsx` → `getDashboardData()`).
  This is a good base for the 9.5 refactor: scoring can move into pure
  `src/lib/scoring/*` functions without touching UI contracts.
- Analytics: `Event` model + `track()` (`src/lib/track.ts`) already instrument
  `resume_uploaded`, `github_ingested`, `gap_analysis_completed` — a natural hook for
  Phase 5 (adaptive rescan).
- `SyncHistory` rows are written after every resume/GitHub/twin sync.

---

## 3. Data Flow (traced)

```
 SIGNUP/ONBOARDING  src/app/onboarding → src/actions/onboarding.ts
                    → db.upsertProfile (Profile: cgpa, targetRole, skills[],
                      githubUsername)
                    → analyzeResume(resumeFormData)  [if file provided]

 RESUME UPLOAD      src/actions/resume.ts::analyzeResume
                    → extractResumeText (unpdf/pdf-parse, local, real)
                    → analyzeResumeComplete (src/lib/resume/index.ts, deterministic):
                        structure → keywords → beforeScore → issues → enhance
                        → afterScore → screeningChance
                    → db.saveResumeFile + saveResumeAnalysis
                      (atsScore=after, resumeScore=before, grammarScore=90 hardcoded)
                    → track('resume_uploaded') + SyncHistory + Notification

 GITHUB CONNECT     src/app/api/auth/github/callback → src/actions/github.ts
                    → REST: repos, languages, readme, workflows, commits(10), issues
                    → githubScore / consistencyScore / projectQuality (§7 formulas)
                    → db.saveGitHubAccount + saveGitHubAnalysis
                    → track('github_ingested')

 CAREER TWIN BUILD  POST /api/career-twin/build
                    → loads Profile, GitHubAccount, LinkedInAccount, latest analyses
                    → one structured AI call (schema in §4.2)
                    → persisted as CareerTwin row (no validation, no liveness flag)
                    → computes CareerScore row with §7 hardcoded math
                    → getPersonalizedRecommendations() (AI, projects.ts)

 DASHBOARD          src/actions/scores.ts::getDashboardData
                    → 11 parallel DB reads → getSkillSprintScores (14 metrics, §7)
                    → side effect: db.updateScores() on every dashboard load
                    → UI: radar chart, history area chart, twin card, roadmap, recos

 ROADMAP/INTERVIEW  src/actions/roadmap.ts (AI + fallback template, tasks persisted)
                    src/actions/interview.ts (questions, turns, evaluation
                    → MentorSession rows)

 JOBS               src/actions/jobs.ts + src/lib/matching/jobMatcher.ts
                    → deterministic fit + optional AI explanation + confidence
```

### 3.1 Individual flow traces (full A–N coverage)

The block above groups flows for brevity; the per-flow traces required by the audit are:

**A. Authentication** — Input: Firebase client sign-in (Google / email / GitHub, `AuthContext.tsx`, `src/app/auth/*`) → Processing: `syncOAuthUser(uid, email, role)` (auth.ts:28) looks the user up by email, creates or migrates the row → Session: base64 JSON cookie `session_user_id` (auth.ts:93 — **unsigned**; on any DB error an "emergency" cookie is set from raw arguments, auth.ts:137–147) → AI: none → Validation: none on subsequent requests — the cookie is the sole credential; Firebase ID tokens attached as Bearer headers by onboarding pages are never verified server-side → DB: `users`, `sync_history` → UI: `/api/auth/session` polled by `AuthContext`; every server action guards via `getSessionUser()`.

**C. Resume parsing** — `/api/resume/parse` (resume-intel step 1) → `extractResumeText` (unpdf with pdf-parse fallback; local, real) → heuristic section detection into personalInfo / skills / experience / projects / education → no AI → stateless (not persisted) → returned to the client for display.

**D. ATS scoring** — `analyzeResumeComplete` (`src/lib/resume/index.ts`, deterministic): structure checks → keyword match vs job profile → `beforeScore` category breakdown → issue list → local enhancement → `afterScore` + `screeningChance` → persisted via `saveResumeAnalysis` (atsScore = after; §8 rows 9–10 for caveats) → UI: resume-intel step 2, dashboard radar.

**E. Resume enhancement** — `resumeEnhancementEngine` (local, deterministic — no AI): bullet rewrites with an anti-hallucination validator that rejects fabricated companies/metrics → `/api/resume/enhance` → `improvedResume` → PDF export via `/api/resume/pdf` (pdf-lib, single POST).

**G. GitHub analysis** — `analyzeGitHub(username)` (github.ts:121) → `githubFetch` with the decrypted per-user token (rate-limit aware, deliberately no silent unauthenticated fallback, github.ts:35–72) → REST: repos + per-repo languages/readme/workflows/commits in parallel (github.ts:82–87) + issues → deterministic `githubScore` / `consistencyScore` / `projectQuality`, plus a few fabricated fields (§8 rows 12–13) → `saveGitHubAnalysis` → UI: github page; auto-triggered after sign-in link (auth.ts:455).

**I. Skill analysis** — No dedicated engine exists. Skill evidence = the free-text `profile.skills` array only; binary membership checks produce dashboard skill scores (scores.ts:82–101); GitHub-derived `topSkills` feed job matching (jobs.ts:62–65) but never flow back into skill scores; the skill-graph page visualizes the same profile strings.

**K. Portfolio analysis** — `auditPortfolio(url)` (portfolio.ts:35) → single AI call (schema: design/performance/SEO 0–100) → **the model cannot fetch the URL**; scores are ungrounded guesses; the URL string is not validated and defaults to `https://yourportfolio.dev` → persisted → UI: portfolio-analyzer page.

**M. Mock interview** — two modes: Q&A (`generateInterviewQuestions` → 3 AI questions) and voice conversation (`respondToInterviewer` turn loop, Web Speech API, `isFinished` after 3 questions) → `evaluateConversation` (AI rubric: technical / communication / confidence / overall 0–100) → persisted to `MentorSession` (`leadershipScore: 80` hardcoded, interview.ts:225) → free-tier cap of 3 enforced server-side via row count (interview.ts:9, 22–39) → UI: mock-interview page + history.

Key observation: **every arrow into the Twin is a one-shot synthesis**; nothing flows
*back* from interviews, roadmap completions, or re-syncs into skill scores or the Twin,
except the coarse per-dimension averages recomputed at dashboard load.

---

## 4. Career Twin Audit

The "Career Twin" is **two separate AI-generation flows sharing one DB model**:

### 4.1 Flow A — `generateCareerTwin` (src/actions/career-twin.ts)

| Stage | What actually happens |
|---|---|
| INPUT | FormData: `cgpa`, `targetRole`, `skills` (from Profile or form; line 51–57). **No resume, GitHub, or interview data is used.** |
| PROCESSING | String interpolation into a prompt (lines 59–63). Nothing else. |
| AI | `generateStructuredAIResponse(prompt, systemPrompt, MODELS.CAREER_TWIN, simulatedPayload)` — asks Gemini/OpenRouter for timeline (Present/+3/+6/+12 months incl. salary + resource URLs), growthOpportunities, riskFactors, SWOT, recommendedRoles, placementReadiness. |
| VALIDATION | **None.** `JSON.parse` only (ai.ts:1854). If providers fail → returns the 90-line `simulatedPayload` (lines 73–162) with generic SWOT, `placementReadiness: 68`, `match: 86/82/78` roles, and a static ₹12–18L salary — indistinguishable from live output. |
| DATABASE | **Not persisted** by this flow. |
| UI | Rendered on `src/app/dashboard/career-twin/page.tsx` (client form → action). |

### 4.2 Flow B — POST `/api/career-twin/build` (src/app/api/career-twin/build/route.ts)

| Stage | What actually happens |
|---|---|
| INPUT | Session user; loads Profile, GitHubAccount, LinkedInAccount, latest ResumeAnalysis, latest GitHubAnalysis (lines 16–20). |
| PROCESSING | `githubScore = githubAnalysis?.portfolioCompleteness ?? 70` (line 24). Prompt includes connectivity booleans + ATS score. |
| AI | Structured call for strongSkills/weakSkills/preferredStack/dreamCompanies/predictions 3/6/12m/salaryProjection/riskFactors/growthOpportunities (schema lines 37–49). Fallback: `simulatedTwinPayload` (lines 51–69). |
| VALIDATION | **None.** Arrays/strings are persisted as returned. |
| DATABASE | `db.createCareerTwin(...)` (line 79) → `CareerTwin` model (prisma/schema.prisma:234). Then `db.updateScores(...)` with hardcoded fallbacks: `atsScore \|\| 70`, `linkedinScore = connected ? 82 : 0`, `portfolioScore = connected ? githubScore : 75`, `interview: 60`, `marketDemand: 75`, and `overallScore = round((ats+github+linkedin+portfolio+70)/5)` — the `70` is a hardcoded interview constant (lines 96–115). History is static April/May/June. |
| UI | `getLatestCareerTwin` feeds `getDashboardData` → dashboard twin card. |

### 4.3 Career Twin verdict

- The Twin is an **AI-free-association exercise over 4 profile strings** plus
  connectivity booleans. It has no access to actual GitHub languages, commit evidence,
  interview transcripts, or roadmap progress.
- Output quality is unmeasured: no schema check, no evidence requirement, no confidence,
  no liveness label.
- `CareerTwin.learningHistory/codingActivity/portfolioQuality/githubQuality/...` JSON
  columns exist in the schema (schema.prisma:244–252) but are **never written** — they
  are ready-made homes for the Phase 1 evidence payloads.

---

## 5. Scoring Audit

Every major score, traced to its formula and evidence support:

| Score | Formula / Source | AI? | Deterministic? | Evidence-backed? | Where shown |
|---|---|---|---|---|---|
| **ATS Score** (before/after) | `src/lib/resume/atsScoringEngine.ts` — fixed weights: Keyword 30, Tech Skills 20, Experience 15, Projects 10, Structure 10, Action Verbs 5, Quantified 5, Formatting 5. No Math.random, no APIs. | No | **Yes, fully** | **Yes** — all 8 categories return a human-readable `explanation` | Resume report, benchmark |
| **Screening Chance %** | `screeningChanceCalculator.ts` — ATS total ×0.45 + keyword coverage ×0.2 + tech coverage ×0.15 + experience ×0.1 + projects ×0.05 + quality ×0.05, clamped 5–95, with disclaimer. | No | Yes | Partially | Resume report |
| **GitHub Score** | `src/actions/github.ts` — `consistencyScore = min(50 + streak×3 + prCount×4, 100)`, `projectQuality = min(60 + stars×4 + forks×5 + CI?15, 100)`, plus composite githubScore over repos/stars/README/CI | No | Yes | **Partially** — real signals, but some persisted fields are hardcoded strings (§8) | GitHub page |
| **Career / SkillSprint Score** | `scores.ts:112` — `round((resume+github+portfolio+interview+hiring)/5)`; twin-build route uses `(ats+github+linkedin+portfolio+70)/5` with **hardcoded 70** for interview | No (explanations are templated strings) | Yes (but arbitrary) | **No for sub-metrics** — `profile.skills` is self-reported; portfolio 75 is fiction | Dashboard radar + charts |
| **Interview Score** | AI rubric only (0–100 ×4). Fallback = hardcoded 82/78/85/81. `leadershipScore: 80` hardcoded at persistence (interview.ts:225) | Yes | **No** | Weak — no per-answer evidence trail | Mock interview scorecard |
| **Job Match Score** | `jobMatcher.ts` — skill 35% (req 75/pref 25), experience 20%, project 15%, education 15%, resume 15%; confidence levels; disclaimer; AI only enhances narrative, deterministic values kept on AI failure | Optional narrative | Yes | **Yes** — matches actual required/preferred skills; `verifiedGithubSkills` input exists | Jobs page |
| **Placement Readiness** | Pure AI output. Fallback = hardcoded 68 | Yes | No | **No** | Career Twin page |
| **Salary Projection** | Pure AI free-text; fallback template says ₹12–18L | Yes | No | **No** | Career Twin timeline |
| **Portfolio Score** | Hardcoded `75` if GitHub/LinkedIn connected else `50` (scores.ts:76) | No | Yes | **No** | Dashboard |
| **Growth %** | `(score − 58)/58 × 100` — **58 is a hardcoded baseline** (scores.ts:135) | No | Yes | **No** | Dashboard trend |
| **History chart** | Static `[April 58, May 65–67, June current]` in 3 places (scores.ts:114, db.ts:724, twin build route) | No | "Yes" | **No** — fake time series | Dashboard area chart |

**Looks precise, lacks evidence (judge-attack surface):** Placement Readiness (68),
Salary Projection, Portfolio Score (75/50), LinkedIn Score (constant 82), Growth %
(baseline 58), the 14 sub-metrics (55/78, 50/80, 60/82, 45/85 constants), interview
`leadershipScore: 80`, and the mock-interview fallback scorecard (82/78/85/81).

---

## 6. Evidence Audit

What the system actually collects vs. what is actually *connected*:

| Source | Collected (real) | Persisted where | Connected to Twin/scores? |
|---|---|---|---|
| Resume | Structured sections: skills, experience bullets, projects, education, certifications, achievements (deterministic `structureResume`) | `ResumeAnalysis.suggestions` (full result JSON), weakBulletPoints, missingMetrics | **Isolated** — only the ATS number is consumed; structured skills never reach the Twin |
| GitHub | repos, languages (byte counts), README presence/size, GitHub Actions/CI, recent commits (10), PRs, issues, stars, forks, streak | `GitHubAnalysis` (languagesUsed, commitHistory, readmeQuality, cicdStatus…) | **Isolated** — only aggregate `portfolioCompleteness` reaches scores; languages never infer skills (except `detectProjectGaps`) |
| Jobs | `requiredSkills/preferredSkills/experienceYears/description` | `Job`, `JobMatch` | Connected **only** to the Jobs matcher, never to the Twin |
| Interviews | Questions, transcript, per-session rubric scores | `MentorSession.transcripts/feedback` | **Isolated** — only latest `overallScore` feeds one metric; no skill-level inference |
| Roadmap | Tasks, completion %, completedTasks | `Roadmap` + `LearningProgress` | **Isolated** — completion % never updates scores or the Twin |
| Profile | CGPA, targetRole, self-reported skills, college | `Profile` | Connected — but this is *claimed* skill, not evidence |
| LinkedIn | Headline/about/experience/education JSON | `LinkedInAccount/Analysis` | **Isolated** — only a constant `82` when connected |

Verdict: rich in collected evidence, poor in *connections*. There is no normalized
evidence record; each consumer re-interprets raw blobs ad hoc (or not at all). The
proposed `Evidence` concept maps cleanly onto `ResumeAnalysis.suggestions`,
`GitHubAnalysis`, `MentorSession`, and `LearningProgress` — all already persisted with
`userId` and timestamps.

---

## 7. AI Reliability Audit

### 7.1 Gateway behavior (`src/lib/ai.ts`)

- **Providers/models:** Gemini REST first — `gemini-3.5-flash` → `gemini-3.5-flash-lite`
  → `gemini-flash-latest` → `gemini-flash-lite-latest`; then OpenRouter via OpenAI SDK
  (`claude-3.5-sonnet` resume, `gpt-4o` interview, `claude-3-opus` twin constants).
- **Structured mode:** `generateStructuredAIResponse` (ai.ts:1808) uses
  `responseMimeType: "application/json"` / `json_object`, temperature 0.3, 4096 tokens;
  chat path uses temperature 0.85, 8s AbortController timeout, 2048 tokens.
- **JSON handling:** `JSON.parse` with markdown-fence strip retry (ai.ts:1884–1890).
  Gemini parse failure → next model → OpenRouter → **`return simulatedPayload`**
  (ai.ts:1896–1901) after a fake 500 ms delay.
- **Fallback key risk:** the Gemini key lookup includes
  `NEXT_PUBLIC_FIREBASE_API_KEY` (ai.ts:1818–1821) — a Firebase web key would be sent
  to the Gemini endpoint as if it were a Gemini key.
- **Docs drift:** OpenRouter `MODELS` constants (claude/gpt) rarely execute because
  Gemini wins first; README model claims don't fully match actual routing.

### 7.2 Where AI output is trusted without validation

| Call site | Schema validation? | Evidence check? | Persists AI output? | Risk |
|---|---|---|---|---|
| `career-twin.ts::generateCareerTwin` | No (`JSON.parse` only) | No | No (returns to client) | Hallucinated timeline/salary/SWOT shown as fact |
| `api/career-twin/build` | No | No | **Yes** → `CareerTwin` row | Unsupported skills/salary become the persisted Twin |
| `scores.ts` metric explanations | n/a (templated strings) | Partly false — e.g. "portfolio site design satisfies…" asserted with zero portfolio analysis | No | Fabricated-sounding reasons |
| `github.ts` | n/a (no AI in scoring) | n/a | Yes (deterministic) | Low |
| `roadmap.ts` | No (shape assumed) | No | **Yes** → `Roadmap` | Low-medium (advice only) |
| `interview.ts` (questions/turns/eval) | No | No | **Yes** → `MentorSession` | Fallback scorecard indistinguishable from real eval |
| `projects.ts` recommendations | No | No | **Yes** → `RecommendedProject` | Low (advice only) |
| `jobMatcher.ts` AI enhancement | Ad hoc field checks | Deterministic scores kept; AI swaps narrative only | Yes (narrative) | **Best-in-repo pattern** |
| `resumeiq` enhancement | **Yes — `validateEnhancedResume`**: reverts AI-changed names/companies/dates/schools, deletes fabricated metrics and skills absent from the original, restores factual lists verbatim | **Yes** | Sanitized only | **Gold standard in repo** |

### 7.3 Verdict

Two genuine validation layers exist (the deterministic ATS engine and
`validateEnhancedResume`). Everything else — Twin, roadmap, interview evaluation,
placement readiness, salary — flows AI-out-→-persist-in with silent static fallbacks.
No call site records *whether* a response was live or fallback, so neither UI nor
benchmark can distinguish them (the benchmark infers liveness only by re-deriving it).

---

## 8. Static / Demo / Fallback Data Audit

Classification: **REAL** / **FALLBACK** (documented substitute) / **DEMO** (labeled) /
**SIMULATED** (presents as real but isn't) / **POTENTIALLY MISLEADING**.

| # | Location | What | Class | Mistakable for real? |
|---|---|---|---|---|
| 1 | `career-twin.ts:73–162` `simulatedPayload` | Full static twin: readiness 68, roles 86/82/78, ₹12–18L | SIMULATED → **POTENTIALLY MISLEADING** | **Yes** — returned with no flag |
| 2 | `api/career-twin/build:51–69` `simulatedTwinPayload` | Static skills/predictions/₹12–18L | SIMULATED → **POTENTIALLY MISLEADING** | **Yes** — persisted as the user's Twin |
| 3 | `scores.ts:84–101` | Frontend 78 / backend 80 / sysDesign 82 / aiReadiness 85 from binary skill checks | SIMULATED (arbitrary constants) | Yes |
| 4 | `scores.ts:76` | Portfolio 75/50 | SIMULATED | Yes |
| 5 | `scores.ts:114–118`, `db.ts:724–728`, twin-build route | Static April/May/June history | SIMULATED | **Yes — rendered as the user's progress chart** |
| 6 | `scores.ts:135` + `db.ts` defaults | Hardcoded baseline 58 for growth % | SIMULATED | Yes |
| 7 | `db.ts:716–729` | Default starter scores (72/65/70/60/75/68) before any data | FALLBACK | Partially — shown to new users as real scores |
| 8 | `db.ts:678–700` | When Prisma errors *with DB configured*, scores silently fall back to the same defaults | FALLBACK (silent) | Yes |
| 9 | `resume.ts:162`, `resumeAnalyzer.ts:96`, `db.ts:603` | `grammarScore: 90` constant | SIMULATED | Yes — no grammar analysis exists |
| 10 | `resumeAnalyzer.ts:90–95` | `technicalScore = afterScore`, `impactScore = screeningPercent` — field mis-mapping | POTENTIALLY MISLEADING | Yes |
| 11 | `resume.ts:208–215` | `crossAnalysis` fields always `[]` stubs | POTENTIALLY MISLEADING | Yes — implies cross-checks ran |
| 12 | `github.ts:457–460` | Persisted `branchStrategy: "GitFlow Standard"`, `deploymentStatus: "Active Integrations"`, `codeOwnership: "100% Owner"` — never measured | SIMULATED | **Yes** — stored as analysis results |
| 13 | `github.ts:449` | `commitHistory.totalCommits = streak` (conflates streak with commit count) | POTENTIALLY MISLEADING | Yes |
| 14 | `interview.ts:198–208` | Fallback scorecard 82/78/85/81 + generic suggestions | SIMULATED | Yes — persisted like a real evaluation |
| 15 | `interview.ts:73–79, 165–168` | Fallback question/turn templates | FALLBACK (reasonable) | Low |
| 16 | `roadmap.ts:72+` | 12-task template fallback | FALLBACK (reasonable) | Low |
| 17 | `roadmap.ts:34, 222` | `missingSkills` hardcoded `["Advanced TypeScript","Next.js","Testing","Performance"]` | SIMULATED | Yes |
| 18 | `lib/candidateData.ts` | 250 seeded synthetic candidates for the shortlisting demo | **DEMO** (labeled in file) | Low — UI should say "Demo" |
| 19 | `public/dummy.pdf` | Sample resume for demo | DEMO | Low |
| 20 | `ai.ts` RESPONSES knowledge base (~1000 lines) | Static career-coach content when chat AI fails | FALLBACK | Low — honest content |
| 21 | `next.config.ts:44–54`, `firebase.ts` | Firebase config fallbacks (incl. a hardcoded web API key) for build-time compilation | FALLBACK | See Security S1/S2 |
| 22 | `data/benchmark_results.json` | Real output of `scripts/benchmark/run_benchmark.ts` (2026-09-09): 8 resumes avg 62.6→70.6 (+8.0), 6/6 roadmaps live, 4/4 twins live | REAL (small n) | No — genuinely executed; n is tiny |
| 23 | `README.md` benchmark table | Restates the JSON honestly with methodology disclosure | REAL | No |
| 24 | `db.ts:1105,1143` roadmap responses | `targetCompany: "Google"` hardcoded | SIMULATED (minor) | Partially |



## 9. Security Audit

Classification: **P0 (critical)** / **P1 (high)** / **P2 (medium)**. Nothing was fixed; documentation only.

| ID | Sev | Finding | Location | Detail |
|---|---|---|---|---|
| S1 | **P0** | Forgeable session cookie — unsigned, no server-side verification | `auth.ts:93–103, 137–147, 158–181` | `session_user_id` is base64 JSON `{id,email,role}` with no signature. Anyone can set it to any user's ID and `getSessionUser()` will impersonate that user — all data in the app is keyed by `user.id`. If the DB is down, the cookie value is trusted outright and a synthetic user object is constructed (auth.ts:193–201). |
| S2 | **P0** | OAuth token encryption key has a publicly derivable fallback | `encryption.ts:7–21` | GitHub access tokens are AES-256-GCM encrypted (good), but if `ENCRYPTION_KEY` is unset the key is derived from the *public* Firebase project ID — ciphertext becomes decryptable by anyone. |
| S3 | **P1** | Unauthenticated debug endpoints shipped for production | `api/debug/db/route.ts`, `api/debug/github/route.ts` | `/api/debug/db` leaks the DB host, row counts, profile field names and raw Prisma error metadata to anyone. `/api/debug/github` leaks env-var presence and derived callback URLs. No auth check on either. |
| S4 | **P1** | Hardcoded infrastructure identifiers as config fallbacks | `firebase.ts:6–12` (API key, project ID, app ID baked in); `prisma.ts:15–18` (hardcoded Supabase project ref + pooler-host rewrite) | Masks missing env configuration; failure surfaces late and unpredictably. |
| S5 | **P1** | AI key handling weaknesses | `ai.ts:1833` (Gemini API key passed in the URL query string — can leak via proxies/access logs); `ai.ts:1817–1821` (`NEXT_PUBLIC_FIREBASE_API_KEY` used as a Gemini key fallback — not a valid Gemini key, guarantees silent provider failure); structured path `ai.ts:1832–1847` has **no timeout/AbortController** (only the chat path has the 8 s controller) → a hung request stalls the action indefinitely. |
| S6 | **P2** | Prompt injection surfaces | resume text (resume.ts:119), GitHub README content (github.ts per-repo fetch), interview transcripts (interview.ts:155, 186), portfolio URL (portfolio.ts:41) | Untrusted text is interpolated into prompts without delimiting or sanitization. GitHub READMEs are third-party-controlled and can steer analysis/Twin output. Impact is currently bounded (output is JSON-scored) but becomes serious once AI output feeds the planned evidence store. |
| S7 | **P2** | Unvalidated user URL persisted | `portfolio.ts:39` | Any string is accepted as `portfolioUrl` (defaults to a fake URL). No SSRF today (nothing server-side fetches the URL), but an unsafe pattern if a crawler is ever added. |
| S8 | **P2** | Sensitive logs | `auth.ts:31–32, 35, 105, 148` (user IDs / emails); `prisma.ts:27` (query logging in dev) | PII in logs; acceptable for a hackathon, should be reduced before evaluation demos on shared infrastructure. |
| S9 | **P2** | `isSecureOrigin()` private-range check overly broad | `auth.ts:17–22` | `172.` matches all of 172.0.0.0/8, not just the 172.16.0.0/12 private block. Minor correctness issue in the secure-cookie decision. |
| S10 | **P2** | Uploaded resume bytes are never stored | `resume.ts:150–155` | `saveResumeFile` persists a fabricated `fileUrl` (`/uploads/<uid>/...`) pointing to a path that does not exist — no disk/S3 write occurs anywhere. A data-integrity issue rather than an exposure (it actually reduces leak surface). |
| S11 | **P2** | RLS hardening drafted but uncommitted | `supabase/migrations/00002_enable_rls_policies.sql`, `00003_enable_rls_prisma_migrations.sql` (untracked) | Sensible default-deny RLS + revocation of anon/authenticated grants (authored 2026-08-26) exist only in the working tree; production posture depends on whether they were ever applied to the live instance (see §17). |

**Positive security posture observed:** every server action guards with `getSessionUser()`; all data access is Prisma-only (parameterized, no raw SQL); GitHub tokens encrypted at rest and never logged; upload validation (12 MB cap + extension allowlist, resume.ts:115–119); server-side free-tier enforcement (interview.ts:22–39); `httpOnly` / `sameSite=lax` cookies; no secrets returned to clients (the github debug route reports presence only); precise GitHub rate-limit handling instead of silent fallbacks (github.ts:61–65).

## 10. Performance Audit

| ID | Severity | Finding | Location |
|---|---|---|---|
| P1 | High | Dashboard read performs a write on every load — `getSkillSprintScores` always calls `db.updateScores` + `track()` | `scores.ts:120–133`; triggered from `getDashboardData` on every dashboard render |
| P2 | Medium | Over-fetching on secondary pages — the GitHub page calls `getDashboardData()` (11 queries) + `/api/onboard` + `getConnectedGitHubAccount()` in parallel, using only a fraction | `dashboard/github/page.tsx:43–47` |
| P3 | Medium | Sequential per-job matching — `computeJobMatch` is awaited in a for-loop over every active job | `jobs.ts:123–138` (deterministic → safely parallelizable) |
| P4 | Medium | Cold-start external sync inline — an empty jobs table triggers `syncAllJobs()` (multiple external HTTP providers) before the first render | `jobs.ts:106–112` |
| P5 | Medium | AI call during dashboard load — missing recommendations trigger `getPersonalizedRecommendations()` (an AI generation) while the user waits | `scores.ts:289–298` |
| P6 | Low | Artificial latency — the AI fallback path sleeps 500 ms before returning the simulated payload | `ai.ts:1899` |
| P7 | High | No timeout on the structured AI fetch — overlaps S5; a hung provider request blocks the server action indefinitely | `ai.ts:1832–1847` |

**Positives:** pervasive `Promise.all` parallelization (`getDashboardData` 11 queries, `fetchRepoDetails` 4 requests/repo, `getVerifiedJobs` 5 queries); deterministic quick-match mode for list views with AI explanation opt-in only (jobs.ts:137); Next.js fetch revalidation on external job providers (`providers.ts:197`); Prisma client cached across hot reloads (`prisma.ts:5–7`).

## 11. Testing Audit

- **No test runner.** `package.json` scripts are `dev` / `build` / `start` / `lint` only; no jest, vitest, or playwright in dependencies. Zero unit or integration tests exist.
- **Type checking:** `strict: true` but `noImplicitAny: false` (`tsconfig.json:7–8`); checking runs during `next build` (no standalone `typecheck` script). Linting is `eslint-config-next`.
- **Benchmark harness (the only evaluation):** `scripts/benchmark/run_benchmark.ts` evaluates (1) the deterministic ATS engine + local enhancement on 8 held-out synthetic resumes (before → after), (2) 6 roadmap generations (live vs fallback), (3) 4 career-twin builds (live vs fallback). Executed 2026-09-09; results in `data/benchmark_results.json`: resumes avg 62.6 → 70.6 (+8.0), roadmaps 6/6 live, twins 4/4 live.
- **No CI.** No `.github/workflows`; build and benchmark run manually.
- **Completely untested:** auth/session logic (`auth.ts`), the AI gateway (`ai.ts` timeout/retry/fallback chain), the dual-mode `db.ts` fallback layer, every server action, all score formulas, and `jobMatcher.ts`.
- **Benchmark blind spot:** its liveness check infers fallback usage by re-deriving it externally, because the app itself never reports whether a response was live (see §7.2) — a fallback that changes shape would go undetected.

## 12. Current Strengths

Do not replace these during the upgrade — they are the foundations to build on:

1. **Deterministic, explainable ATS engine** (`src/lib/resume/`): category-level before/after scoring, keyword-gap analysis, and screening estimate computed locally — no AI, fully reproducible, exactly the pattern the whole product should follow.
2. **Anti-hallucination validator on resume enhancement**: the old AI-fabricated "improved resume" path was deliberately replaced by a local engine that rejects fabricated companies/metrics (documented in resume.ts:72–75). A working precedent for AI claim validation.
3. **Honest engineering culture**: `docs/REAL_VS_SIMULATED.md`, a benchmark harness that genuinely executes with real (if small) results, and a README that discloses methodology rather than inflating numbers.
4. **Deterministic weighted job matcher** (`src/lib/matching/jobMatcher.ts`): transparent weights, confidence output, honest disclaimers, optional (opt-in) AI explanation. The correct blueprint for Target-Role gap analysis.
5. **Resilient data layer** (`src/lib/db.ts`): dual-mode Prisma/JSON abstraction with graceful degradation — every feature still works when the database is down.
6. **Real GitHub ingestion with production discipline**: rate-limit-aware fetch, encrypted tokens at rest, explicit AUTH_RETRY signaling, parallel per-repo requests, and genuine signals (languages, README size, workflows, commits, streaks).
7. **Discipline in server actions**: consistent `getSessionUser()` guards, parallelized reads, free-tier caps enforced server-side, analytics instrumentation via a single `track` funnel.
8. **Modern, coherent stack**: Next.js 16 App Router + React 19 + Tailwind 4 + shadcn/ui, server actions over ad-hoc APIs, voice interviews over the Web Speech API with no external dependency.

## 13. Current Weaknesses

Prioritized by impact on the 9.5 goal:

| Pri | Weakness | Evidence |
|---|---|---|
| **P0** | Sessions are forgeable (unsigned cookie) — every user-data guarantee rests on it | §9 S1 |
| **P0** | OAuth token encryption degrades to a publicly derivable key when `ENCRYPTION_KEY` is unset | §9 S2 |
| **P1** | No evidence model: GitHub/interview/roadmap signals dead-end in JSON blobs and never update skill scores — the core Evidence → Twin loop does not exist | §1.4, §3 key observation, §6 |
| **P1** | Career scores are opaque constants (55/78, 50/80, 60/82, 45/85; portfolio 75/50) presented with confident-sounding explanations that are templated strings, not derivations | §5, §8 rows 3–6 |
| **P1** | Silent AI fallbacks: `generateStructuredAIResponse` returns a static payload indistinguishable from a live response; static twins are even persisted as the user's Twin | §7, §8 rows 1–2 |
| **P1** | Progress history is fabricated (April 58 / May 67 templated in three places); growth % measured against hardcoded 58 | §8 rows 5–6 |
| **P2** | No schema validation of AI output (raw `JSON.parse`, no zod), no timeout on the structured AI path, no liveness flag anywhere | §7.2, §9 S5, §10 P7 |
| **P2** | Zero automated tests; the benchmark is small (n=8/6/4) and infers liveness externally | §11 |
| **P2** | Dashboard write-on-read, sequential job matching, AI call during dashboard render | §10 P1, P3, P5 |
| **P3** | UX honesty: users see a fabricated progress chart and default starter scores (72/65/70/60/75/68) as their real scores | §8 rows 5–7 |
| **P4** | Polish: hardcoded `targetCompany: "Google"`, `grammarScore: 90` constant, hardcoded interview `leadershipScore: 80` | §8 rows 9, 24; interview.ts:225 |

## 14. Recommended Architecture

Introduced with minimal disruption, reusing existing patterns (no implementation in this phase):

1. **Evidence Engine** — a normalized store of `claim → source → timestamp → confidence` rows. Every artifact already persisted today (ResumeAnalysis categories, GitHubAnalysis signals, MentorSession evaluations, Roadmap task completions, PortfolioAudit) becomes an evidence item via writers in the existing `db.ts` accessors. No new feature surface; purely a read-model over data already collected.
2. **Target Role Engine** — extend `jobMatcher.ts`'s weighted-overlap approach with a role→skill-weight matrix seeded from the synced `jobs` table (required/preferred skills per role are already ingested). Target role comes from the existing `profile.targetRole`.
3. **Explainable Readiness** — replace the §5 constants with formulas over Evidence Engine rows: each score becomes `f(evidence items)`, each item contributing a visible delta. The ATS engine's category breakdown is the in-repo pattern to replicate.
4. **AI Claim Validation** — (a) schema-validate every AI response at the `ai.ts` boundary (one choke point, ai.ts:1808); (b) extend the resume anti-hallucination validator to Twin output: every AI-asserted claim (skills, predictions, salary band) must match an evidence row or be dropped/flagged; (c) return `{ data, live: boolean }` from every AI call and persist the flag.
5. **Confidence** — per-score confidence derived from evidence count, recency, and source diversity; rendered beside scores. Falls out naturally from the Evidence Engine.
6. **Adaptive Career Twin** — the Twin becomes a projection computed from (evidence + target role) rather than a one-shot AI synthesis; regenerated on evidence events (resume upload, GitHub sync, interview completion, roadmap task completion). The existing CareerTwin model and build route remain, but their inputs become validated evidence.
7. **Highest-Impact Action Engine** — rank gaps by `weight × feasibility` reusing the existing `expectedImprovement` field and jobMatcher skill gaps; surface a single next-best-action on the dashboard (the recommendation slot already exists, scores.ts:289–298).
8. **Progress measurement** — replace the templated history (§8 row 5) with dated snapshots written only when scores change (the `CareerScore.details.history` persistence already exists — it just needs real snapshots).

## 15. Recommended Upgrade Order

Each step is independently shippable and demo-safe:

1. **P0 security hardening** (§9 S1–S3, S5): sign the session cookie (HMAC with a server secret) or verify the Firebase ID token per request; require `ENCRYPTION_KEY` (fail closed) and rotate tokens encrypted with the fallback key; remove or auth-gate `/api/debug/*`; add a timeout to the structured AI fetch and stop using the Firebase key as a Gemini key.
2. **Liveness transparency** (§7): `generateStructuredAIResponse` returns `{ data, live }`; UI badges and DB persistence reflect it. This is the single highest-leverage honesty fix and unlocks reliable benchmarking.
3. **Schema validation at the AI boundary** (§7.2): zod-style validation per call site in `ai.ts`; invalid AI output becomes a retry/fallback, never persisted garbage.
4. **Real progress history** (§8 rows 5–6): dated snapshots, remove the templated April/May/June arrays and the hardcoded 58 baseline.
5. **Evidence Engine + evidence-based score formulas** (§14.1, §14.3): wire GitHub/interview/roadmap evidence into skill scores; delete the binary skill constants.
6. **Target Role Engine** (§14.2): reuse `jobMatcher.ts` to produce target-role gap analysis for the Twin.
7. **Highest-Impact Action + Adaptive Twin** (§14.6, §14.7): event-driven Twin regeneration and one next-best-action.
8. **Testing maturity** (§11): add a test runner covering `ai.ts`, `jobMatcher.ts`, score formulas, and auth; expand the benchmark n and make liveness app-reported (after step 2) instead of inferred.

## 16. Risks

- **Auth migration risk (step 1):** signing/verifying sessions can log out existing users and break flows that rely on the DB-down cookie fallback; the emergency-cookie path (auth.ts:133–152) must be removed carefully, not just gated.
- **Honesty shock at demo time:** once fallbacks are visibly flagged (step 2), a large share of AI features may show as "simulated" during a judge demo if API keys/quota fail — product messaging must be prepared for that.
- **Score regression perception:** replacing hardcoded constants with evidence formulas (step 5) will lower most existing users' numbers; expect "my score dropped" reactions and communicate the reason.
- **Dual-mode data layer divergence:** behavior differs between `DATABASE_URL` set/unset; every change in steps 1–7 must be verified in both modes or the JSON fallback will silently drift.
- **Framework drift:** Next.js 16 / React 19 conventions may differ from training-data assumptions (per `AGENTS.md`); consult `node_modules/next/dist/docs/` before implementation.
- **Benchmark overfitting:** n=8/6/4 synthetic cases is too small to lock formulas against; expanding the set should precede tuning.
- **RLS migration blast radius:** applying the drafted revocations breaks any consumer of the PostgREST API; nothing in the app uses it today, but confirm before applying (§9 S11, §17).
- **Cost/quota exposure:** every dashboard load can trigger AI calls (§10 P5) and twin builds are unthrottled; adding evidence events without caching could multiply AI spend.

## 17. Unknowns

Not determinable from the repository alone:

1. Whether Firebase ID tokens sent as Bearer headers by onboarding pages are verified anywhere — they appear unused by `getSessionUser`, but a verification layer could exist in deployment middleware. **Not determined from repository.**
2. Whether the drafted RLS migrations (00002/00003) have been applied to the live Supabase instance. **Not determined from repository.**
3. Whether `ENCRYPTION_KEY` is set in production (`.env.vercel.prod` exists locally but its deployment state cannot be confirmed). **Not determined from repository.**
4. Which Gemini/OpenRouter model identities are actually live in production (alias constants in `MODELS` vs. provider availability). **Not determined from repository.**
5. Whether resume uploads are stored in any external store — no storage write exists in code, so the persisted `fileUrl` appears fabricated, but a deployment-side hook cannot be ruled out. **Not determined from repository.**
6. Depth of LinkedIn integration end-to-end (OAuth routes and analysis tables exist; whether the analysis is ever produced with real data in practice). **Not determined from repository.**
7. Production AI failure rates — the benchmark reports liveness on a single run date; real-world fallback frequency is unknown. **Not determined from repository.**
