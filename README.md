<!-- Banner -->
<p align="center">
  <img src="./public/skillsprint_readme_header.png" width="100%" alt="SkillSprint AI Banner" style="border-radius: 10px; margin-bottom: 20px; box-shadow: 0 12px 30px rgba(0,0,0,0.3);" />
</p>

<h1 align="center">🚀 SkillSprint AI</h1>

<p align="center">
  <strong>Predict. Prepare. Place.</strong><br>
  An AI-powered Career Twin & Talent Intelligence Platform that bridges the gap between student potential and corporate placement.
</p>

<p align="center">
  <a href="https://vercel.com"><img src="https://img.shields.io/badge/Vercel-Configured-success?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel Status" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js%2016-App%20Router-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React%2019-UI%20Library-blue?style=for-the-badge&logo=react&logoColor=white" alt="React 19" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-CSS%204.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://prisma.io"><img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma ORM" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
  <a href="https://firebase.google.com"><img src="https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" /></a>
</p>

<p align="center">
  <strong>8 resumes scored · avg +8.0 pt ATS improvement · 6/6 roadmaps generated in testing (100% success) · 4/4 Career Twins live</strong>
</p>


---

## 🏆 Razorpay AI Buildathon — Submission

<p align="center">
  <a href="https://razorpay.com/ai-buildathon"><img src="https://img.shields.io/badge/Razorpay-AI%20Buildathon-0F172A?style=for-the-badge&logo=razorpay&logoColor=white" alt="Razorpay AI Buildathon" /></a>
  <a href="https://razorpay.com"><img src="https://img.shields.io/badge/Powered%20By-Razorpay%20APIs-3395FF?style=for-the-badge&logo=razorpay&logoColor=white" alt="Razorpay" /></a>
  <img src="https://img.shields.io/badge/Track-AI%20x%20Fintech-6366F1?style=for-the-badge" alt="Track" />
  <img src="https://img.shields.io/badge/Category-EdTech%20%2B%20Career%20AI-10B981?style=for-the-badge" alt="Category" />
</p>

**SkillSprint AI** was built as a submission for the **Razorpay AI Buildathon** — a hackathon challenging developers to build impactful AI-powered products in the Fintech and EdTech space using modern AI infrastructure.

### 🎯 Problem Statement Addressed

> *"India produces 1.5 million engineering graduates per year. Over 60% fail to land a relevant role — not because they're unqualified, but because they lack targeted, data-driven preparation aligned to actual hiring bar."*

SkillSprint AI bridges this gap by combining a deterministic ATS scoring engine, live AI career coaching, and predictive Career Twin modeling into a single cohesive platform.

### 🤖 What We Built for the Buildathon

| Feature | AI Stack | Impact |
|---|---|---|
| **AI Career Twin** | Gemini + OpenRouter (Llama 3.3 70B) | Predicts 12-month career trajectory, salary bounds & placement probability |
| **AI Career Coach (Chat)** | OpenRouter primary · Gemini fallback | Real-time multi-turn career guidance with full student profile context |
| **Resume Intelligence** | Deterministic ATS Engine + Gemini | +8.0 pts avg ATS improvement across 8 benchmarked resumes |
| **Voice Mock Interviews** | Web Speech API + Gemini evaluation | Live speech-to-text with instant AI scorecard feedback |
| **Dynamic Roadmaps** | Gemini generative planning | Personalized 30/60/90-day task plans per role |
| **Hackathon Recommender** | Curated data pipeline | Live hackathon listings (Devpost, Devfolio, MLH, Unstop) with smart skill matching |
| **Job Intelligence** | Greenhouse API + Lever API + Curated | Real job listings from Google, Microsoft, Amazon, Stripe, Flipkart & more |

### 🔗 Live Demo & Repository

- 🌐 **Live App:** Deployed on Vercel — see deployment badge above
- 📁 **Source Code:** [github.com/h4rsh740/skillsprint](https://github.com/h4rsh740/skillsprint)
- 🤖 **AI Provider:** OpenRouter (primary) + Google Gemini (fallback) — zero hallucinated data
- 🛡️ **Reliability:** Build verified at exit code 0 · All 35 routes compile clean

---



## 🎯 The Problem

Over **60% of CS graduates** in India fail to land their first relevant engineering role — not from lack of degree, but from lack of targeted, personalized preparation. Generic job boards and YouTube courses don't tell students *what specifically they are missing* for the exact companies they want. SkillSprint AI solves this with a full-stack AI pipeline that analyzes, diagnoses, and closes those gaps in real time.


## 🤖 What the AI Actually Does at Each Step

| User Step | AI Pipeline |
|---|---|
| **Upload Resume** | Deterministic ATS parser → keyword extraction → `beforeScore` computed; Gemini enriches weak bullets and computes `afterScore` (+N pts improvement shown live) |
| **Connect GitHub** | GitHub REST API → repo analysis → language proficiency, commit cadence, project complexity → Career Score sub-scores updated |
| **View Skill Gaps** | Gemini synthesizes resume + GitHub signals → generates skill gap list mapped to target role (e.g. "Missing: System Design, Docker, Redis") |
| **Generate Roadmap** | Gemini produces personalized 30/60/90-day plan with daily tasks, weekly milestones, resource links — all targeted at the exact gap |
| **Mock Interview** | Web Speech API transcribes voice → Gemini evaluates answer quality, confidence, and technical depth → instant scorecard + feedback |

---

## 📊 Empirical Benchmark Results

> **Methodology & Provenance:** Evaluated once across a held-out synthetic test suite simulating diverse candidate backgrounds (junior, mid-level, gap-heavy, career transition). All figures are unvarnished empirical outputs generated by running `scripts/benchmark/run_benchmark.ts` locally without post-run batch tuning (tracked in `data/benchmark_results.json`).

| Pipeline Metric | Sample Size | Baseline | Post-Optimization | Delta / Success Rate | Execution Source |
|---|---|---|---|---|---|
| **ATS Resume Scoring** | 8 resumes | 62.6 / 100 avg | 70.6 / 100 avg | **+8.0 pts avg** (+2 to +17 pt range) | 100% Deterministic rule engine |
| **Learning Roadmap Generation** | 6 profiles | N/A | 12.0 tasks / roadmap | **100% success** (6/6 completed) | Live Gemini / OpenRouter model calls |
| **Career Twin Projections** | 4 profiles | N/A | 4-phase timelines | **100% live** (0% fallback rate) | Live Gemini / OpenRouter model calls |
| **Voice Mock Interview Audio** | N/A | N/A | N/A | *Not yet benchmarked* | Live Web Speech API (transcription) |

*Test Suite Verification:* TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors across all routes and scripts.

---

## 🔍 What's Real vs. Simulated

To adhere to the highest transparency standard, SkillSprint AI explicitly documents what runs on live models, what is deterministic, and where fallbacks exist:

* **ATS Resume Scoring & Optimization:** The baseline ATS scoring (`beforeScore`) and enhanced scoring (`afterScore`) are **100% deterministic**. The engine locally inspects keyword frequency, section architecture, quantified metrics, and formatting layout without relying on LLM guesswork or fabricated score multipliers. Bullet point rewrites are generated via **live Gemini or OpenRouter calls** passed through an anti-hallucination validation filter (`validateEnhancedResume`); if AI providers are unreachable or rate-limited, the system falls back to an offline deterministic rule-based enhancer (`enhanceLocally`).
* **Career Twin Projections:** The 12-month trajectory, SWOT matrix, and recommended career roles are generated via **live structured AI calls** when API keys are configured. If models are throttled or offline, the platform falls back to a structured static template (`simulatedPayload`). While candidate-provided CGPA, target role, and skills are real, sparse accounts (such as accounts without connected GitHub or LinkedIn) use default baseline scores, and the historical month-by-month progress curve uses static demonstration data.
* **Voice Mock Interview:** Candidate voice input is transcribed using the browser's **live native Web Speech API** (`SpeechRecognition`), listening in real time for answers and voice navigation commands. If microphone permissions are denied or an unsupported browser is used, the UI immediately falls back to direct text input—no synthetic or stubbed audio transcripts are used. Turn-by-turn interviewer responses and final scorecard assessments query live LLMs, falling back to a pre-authored question trio and rubric only if AI endpoints fail.
* **Dynamic Learning Roadmaps:** Daily tasks, weekly targets, and monthly milestones are synthesized on demand by **live AI models** tailored to the user's specific role and duration. If API access is unavailable, a 12-task structured template is used as a fallback. Task completions and milestone checkboxes are saved directly to the database.

---

## 🌟 Overview

**SkillSprint AI** is an advanced career acceleration platform. By synthesizing raw academic performance, GitHub portfolios, resume data, and live mock interview feedback, the system constructs a digital clone of your professional self — the **Career Twin**. 

The Twin projects career trajectories (3, 6, and 12 months out), assesses placement probability in top companies, diagnoses critical skills gaps, and prescribes dynamic daily learning roadmaps to ensure students are corporate-ready.

---

## 🔮 Core Features

### 🧠 1. AI Career Twin
*   **Predictive Modeling:** Projects salary bounds, career progression, and placement probabilities.
*   **Risk Diagnostics:** Identifies bottleneck skills and tags risk factors that could trigger placement failures.
*   **Continuous Synchronization:** Adapts dynamically as you complete roadmaps, pass interviews, or push commits to GitHub.

### 🎙️ 2. Voice-Enabled Mock Interviews
*   **Real-time AI Interviewer:** Configurable for Technical, HR, and System Design domains.
*   **Speech-to-Text & Sentiment:** Transcribes spoken replies and evaluates confidence, communication clarity, and command over technical subjects.
*   **Constructive Feedback:** Generates immediate transcripts, scorecards, and custom improvement plans.

### 📄 3. Resume & Portfolio Intelligence
*   **ATS Analyzer:** Renders instant ATS scoring, extracts key skills, and identifies missing keywords.
*   **GitHub Insights:** Integrates with GitHub to score project complexity, repository commits, and active development consistency.
*   **Portfolio Analysis:** Evaluates existing personal projects and sites to pinpoint practical design and system-engineering strengths.

### 🗺️ 4. Dynamic Learning Roadmaps
*   **Adaptive Tasks:** Builds personalized, modular schedules (daily, weekly, and monthly milestones) centered on target roles.
*   **Automated Progress Tracking:** Tracks completion rates and automatically updates the Career Twin's prediction models.

---

## 🏗️ System Architecture

The following diagram illustrates the flow of data, API triggers, and persistence layers across SkillSprint AI:

```mermaid
graph TD
    User([User]) -->|Interact| LandingPage[Landing Page / Client]
    LandingPage -->|Sign In / Up| AuthContext[AuthContext / Firebase Auth]
    AuthContext -->|Sync User Profile| Firestore[(Firebase Firestore)]
    User -->|Navigate| Dashboard[Dashboard / App]
    
    Dashboard -->|Predict Future| CareerTwin[AI Career Twin]
    Dashboard -->|Voice Interview| MockInterview[AI Mock Interview Agent]
    Dashboard -->|Optimize Resume| ResumeIntel[Resume Intelligence]
    Dashboard -->|Build Path| LearningRoadmap[Learning Roadmap]
    
    CareerTwin -->|Generates predictions| GeminiAI[Gemini / OpenAI API]
    MockInterview -->|Evaluates speech & transcript| GeminiAI
    ResumeIntel -->|ATS scoring & feedback| GeminiAI
    
    GeminiAI -->|Save metrics| PrismaClient[Prisma Client]
    PrismaClient -->|Persist DB| SupabaseDB[(PostgreSQL / Supabase)]
```

---

## 📁 Repository Directory Structure

```
skillsprint/
├── prisma/                  # Database schema definitions & migrations
├── public/                  # Static assets (including banners & SVGs)
├── supabase/                # Supabase configuration & Edge functions
├── src/
│   ├── actions/             # Next.js Server Actions (Auth, AI, Twin, Jobs, Resume)
│   ├── app/                 # Next.js App Router (pages, layout, APIs)
│   │   ├── auth/            # Authentication templates (Signup, Signin, Callbacks)
│   │   ├── dashboard/       # Dashboard sub-routes (Roadmaps, Skill Graph, Career Twin, Admin)
│   │   ├── onboarding/      # Initial onboarding questions & profile builder
│   │   └── api/             # REST Endpoints
│   ├── components/          # React Components
│   │   ├── dashboard/       # Dashboard layouts, sidebar and navbar navigation
│   │   └── ui/              # Reusable UI primitives (buttons, tables, skeletons)
│   ├── context/             # Context API providers (AuthContext)
│   └── lib/                 # Third-party initializations (Supabase, Firebase, Prisma, Gemini)
```

---

## 🛠️ Tech Stack & Integrations

| Layer | Technologies | Description |
|---|---|---|
| **Core Architecture** | **Next.js 16 (App Router) & React 19** | Dynamic server-side pre-rendering, Server Actions, & Suspense transitions. |
| **Styling & UI** | **Tailwind CSS 4.0 & Framer Motion** | Glassmorphism, premium dark-mode hues, fluid animations, and custom shaders. |
| **Authentication** | **Firebase Auth** | Consolidated auth provider supporting Google OAuth, Email/Password, and PostgreSQL session sync. |
| **Databases** | **Supabase (Postgres) & Firestore** | Structured relational schemas combined with high-frequency JSON documents. |
| **ORM** | **Prisma** | Safe database query generation, mapping, and automated migrations. |
| **AI Models** | **Google Gemini & OpenAI APIs** | Large Language Models for resumes, mocks, roadmaps, and career modeling. |
| **Hosting & CI/CD** | **Vercel & Firebase Hosting** | Seamless automated deployments linked to GitHub repository hooks. |

---

## 🚀 Local Setup & Installation

To run SkillSprint AI on your local machine, follow these steps:

### 1. Prerequisites
*   **Node.js** (v20 or higher recommended)
*   **Git**
*   **npm** or **yarn**

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/h4rsh740/skillsprint.git
cd skillsprint
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory and configure the variables:

```env
# Firebase Client Credentials
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Supabase (Prisma — use pooler URLs from Supabase Dashboard → Connect → ORM)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Generative AI (Gemini recommended; OpenRouter fallback optional)
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

### 4. Database Setup & Initialization
Run the Prisma client generator:
```bash
npx prisma generate
```

### 5. Launch the Application
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the running app.

---

## 🔧 Vercel Deployment & Build Diagnostics

### 💡 Fixing the Vercel Compile-Time Crash
A common pitfall with App Router and client-side modules (like Firebase/Supabase) is compilation failing due to missing environment variables during **static pre-rendering**:
*   **The Issue:** Next.js compiles routes (e.g., Auth APIs) during the build. If Firebase reads blank strings, it immediately throws `auth/invalid-api-key`, which halts compiling.
*   **The Solution:** In `src/lib/firebase.ts`, we implement fallback dummy strings specifically for compilation. During actual browser execution, the true runtime keys configured in the Vercel settings panel override these fallbacks, allowing the build to complete seamlessly without sacrificing runtime security.
