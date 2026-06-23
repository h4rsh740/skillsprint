<!-- Banner -->
<p align="center">
  <img src="./public/skillsprint_readme_header.png" width="100%" alt="SkillSprint AI Banner" style="border-radius: 10px; margin-bottom: 20px; box-shadow: 0 12px 30px rgba(0,0,0,0.3);" />
</p>

<h1 align="center">🚀 SkillSprint AI</h1>

<p align="center">
  <strong>Predict. Prepare. Place.</strong><br>
  A premium, state-of-the-art AI-powered Career Twin & Talent Intelligence Platform designed to bridge the gap between student competence and corporate placement.
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
    LandingPage -->|Sign In / Up| AuthContext[AuthContext / Firebase Auth / LinkedIn API]
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
| **Authentication** | **Firebase Auth & LinkedIn OAuth** | Secured Google, GitHub, Email/Password, and Professional Auth profiles. |
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
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=skillsprint-ai-d8c4e.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=skillsprint-ai-d8c4e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=skillsprint-ai-d8c4e.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Supabase & Relational Database Connection (Prisma)
DATABASE_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres?schema=public"
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Generative AI Models (API Keys)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
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
