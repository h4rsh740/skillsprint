<div align="center">
  <img src="https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2232&auto=format&fit=crop" width="120" height="120" style="border-radius: 50%; object-fit: cover; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);" alt="SkillSprint AI Logo" />
  
  # 🚀 SkillSprint AI
  
  **Predict. Prepare. Place.** — A premium, state-of-the-art AI-powered Career Twin & Talent Intelligence Platform.
  
  [![Vercel Status](https://img.shields.io/badge/Vercel-Configured-success?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
  [![Next.js 16](https://img.shields.io/badge/Next.js-16.2.9-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%204.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
  [![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
  [![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
</div>

---

## 🌟 Overview

SkillSprint AI is an advanced, student-to-corporate acceleration platform. It creates a digital clone of your professional persona (your **Career Twin**) to project career trajectories, while giving you the AI-powered prep tools (mock interviews, resume intelligence, and dynamic roadmaps) needed to achieve your placement goals.

---

## 🔮 Core Features

### 🧠 1. AI Career Twin
A predictive clone of your professional self projecting your trajectory 3, 6, and 12 months out. It calculates placement probabilities, projects salaries, and flags growth opportunities or career risk factors.

### 🎙️ 2. Voice-Enabled Mock Interviews
Real-time AI interviewer evaluating HR, Technical, and System Design competence. It transcripts responses, assesses communication, confidence, leadership, and technical capability, and outputs concrete suggestions.

### 📄 3. Resume Intelligence
Upload your resume for instant ATS scores, deep parsing, skills-gap analysis, and actionable advice targeted at your specific dream roles.

### 🗺️ 4. Dynamic Learning Roadmaps
Automatically generates customized daily, weekly, and monthly tasks to bridge the skill gaps required by your target companies and roles.

---

## 🏗️ System Architecture

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

## 🛠️ Tech Stack & Integrations

| Layer | Technologies Used |
|---|---|
| **Frontend** | Next.js 16.2.9 (App Router), React 19, Framer Motion, Shaders (react), TailwindCSS 4.0 |
| **Authentication** | Firebase Auth (Google, GitHub, Email/Password) & LinkedIn OAuth API |
| **Database & ORM**| Prisma, PostgreSQL (hosted on Supabase) & Firebase Firestore |
| **AI Processing** | OpenAI API & Google Generative AI (Gemini) |
| **Hosting** | Vercel (Production Web App) & Firebase Hosting (CI/CD Pipeline) |

---

## 🚀 Local Setup & Installation

Follow these steps to run the application on your local machine:

### 1. Prerequisites
- **Node.js** (v20 or higher recommended)
- **Git**
- **npm** or **yarn**

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/h4rsh740/skillsprint.git
cd skillsprint
npm install
```

### 3. Setup Environment Variables
Create a `.env` or `.env.local` file in the root directory and add the following:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=skillsprint-ai-d8c4e.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=skillsprint-ai-d8c4e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=skillsprint-ai-d8c4e.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Supabase & Prisma Configuration
DATABASE_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres?schema=public"
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Generative AI APIs
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```

### 4. Run Development Server
```bash
# Generate Prisma Client
npx prisma generate

# Run local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔧 Vercel Deployment & Build Diagnostics

### 💡 Fixing the Vercel 404/Build Error
A common issue during Next.js deployments on Vercel is the build crashing due to **missing environment variables during build-time page pre-rendering**:
- **The Issue**: Next.js App Router instantiates routes (like `/api/auth/session`) during compilation. If Firebase is initialized with undefined variables (`apiKey: undefined`), the Firebase client library immediately throws a fatal `auth/invalid-api-key` exception, causing the Vercel build to fail.
- **The Fix**: We updated `src/lib/firebase.ts` to include safe fallback dummy values for the initialization phase. When Next.js compiles the routes, Firebase configures successfully with dummy credentials, preventing compile-time crashes. At runtime, the actual keys provided in Vercel's Environment Variables panel are used.
