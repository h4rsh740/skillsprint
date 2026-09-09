# Pipeline Transparency: Real vs. Simulated Components

This document audits every core pipeline in SkillSprint AI to distinguish between live AI model calls, deterministic computations, and fallback or simulated mechanisms.

---

## 1. Career Twin Pipeline

* **Entry Points:** `src/actions/career-twin.ts` (`generateCareerTwin`), `src/app/api/career-twin/build/route.ts` (POST)
* **Rendering UI:** `src/app/dashboard/career-twin/page.tsx`, `src/app/dashboard/page.tsx`

| Pipeline Stage | Classification | One-Sentence Reason |
|---|---|---|
| **Profile Feature Aggregation** | **Partially simulated** | Reads authentic user profile attributes (CGPA, target role, skills) but injects static defaults for sparse accounts (e.g. unlinked GitHub falls back to 0 or 75, LinkedIn to 82, interview readiness to 60). |
| **12-Month Trajectory & SWOT Projection** | **Partially simulated** | Queries live Gemini/OpenRouter models with structured JSON schemas, but falls back to a deterministic static payload (`simulatedPayload` with fixed milestones, salaries, and SWOT items) when APIs fail or are throttled. |
| **Career Score Historical Trend** | **Simulated** | Monthly progress curves (`history: [April: 58, May: 65, June: overallScore]`) are currently statically templated mock points rather than longitudinal database snapshots. |

---

## 2. ATS Resume Scoring & Optimization Pipeline

* **Entry Points:** `src/actions/resume.ts` (`analyzeResume`), `src/app/api/resume/enhance/route.ts` (POST), `src/lib/resume/index.ts` (`analyzeResumeComplete`)
* **Scoring Engines:** `src/lib/resume/atsScoringEngine.ts`, `src/lib/resumeiq/analyze.ts`

| Pipeline Stage | Classification | One-Sentence Reason |
|---|---|---|
| **Raw Resume Text Extraction** | **Real** | Deterministically parses uploaded PDF, DOCX, and TXT documents locally using `unpdf`/`pdf-parse` without third-party API dependencies. |
| **Baseline ATS Scoring (`beforeScore`)** | **Real** | 100% deterministic rule-based calculation scoring keyword frequency, quantified metric presence, section headers, and formatting layout with zero LLM guesswork. |
| **AI Bullet Enhancement** | **Real (with rule fallback)** | Sends weak bullets and missing keywords to Gemini/OpenRouter with schema validation and an anti-hallucination sanitization filter (`validateEnhancedResume`), falling back to offline rule-based regex rewrites (`enhanceLocally`) if API keys are absent. |
| **Post-Enhancement Rescoring (`afterScore`)** | **Real** | Enhanced resume text is passed through the identical deterministic ATS scoring engine to compute actual numerical point gains, without fabricated multipliers or hardcoded point boosts. |

---

## 3. Voice Mock Interview Flow

* **Entry Points:** `src/app/dashboard/mock-interview/page.tsx`
* **Server Actions:** `src/actions/interview.ts` (`generateInterviewQuestions`, `getConversationTurn`, `evaluateConversation`)

| Pipeline Stage | Classification | One-Sentence Reason |
|---|---|---|
| **Audio Speech-to-Text Transcription** | **Real (with manual fallback)** | Captures user audio directly through browser-native Web Speech API (`webkitSpeechRecognition`) for live voice recognition, falling back to manual keyboard input upon permission denial or browser incompatibility—never using stubbed audio transcripts. |
| **Dynamic Interview Question Generation** | **Real (with template fallback)** | Prompts Gemini/OpenRouter to tailor technical, behavioral, and system design questions to the candidate's target role, falling back to a curated 3-question default set if the model call fails. |
| **Turn-by-Turn Conversational Agent** | **Real (with template fallback)** | Generates conversational interviewer responses and follow-up prompts based on the running transcript via structured AI generation, falling back to a default transition prompt if AI fails. |
| **Final Scorecard & Rubric Evaluation** | **Real (with template fallback)** | Grades candidate responses across Technical, Communication, and Confidence dimensions using an LLM rubric, falling back to a fixed scorecard (`82/78/85`) if API generation fails. |

---

## 4. Learning Roadmap Pipeline

* **Entry Points:** `src/actions/roadmap.ts` (`generateRoadmap`)
* **Rendering UI:** `src/app/dashboard/roadmap/page.tsx`, `src/app/dashboard/page.tsx`

| Pipeline Stage | Classification | One-Sentence Reason |
|---|---|---|
| **Target Role Milestone Generation** | **Real (with template fallback)** | Dynamically generates modular daily habits, weekly targets, and monthly milestones tailored to the candidate's target company and role via Gemini/OpenRouter, falling back to a 12-task default template if AI is unavailable. |
| **Task Completion Tracking** | **Real** | Persists checkbox toggles and completion percentages directly to the database via Prisma and client state. |
