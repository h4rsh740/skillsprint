import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "dummy-key-for-builds",
});

export const MODELS = {
  RESUME_ANALYSIS: 'anthropic/claude-3.5-sonnet',
  MOCK_INTERVIEW: 'openai/gpt-4o',
  CAREER_TWIN: 'anthropic/claude-3-opus',
  EMBEDDINGS: 'openai/text-embedding-3-small'
};

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Gemini models to try in order (most capable first) ────────────────────
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

// ─── Try Gemini API ─────────────────────────────────────────────────────────
async function tryGeminiAPI(
  prompt: string,
  systemInstruction?: string,
  responseJson = false
): Promise<string | null> {
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY;

  if (!geminiApiKey) return null;

  for (const model of GEMINI_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 2048,
          ...(responseJson ? { responseMimeType: "application/json" } : {}),
        },
      };

      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(body),
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 10) return text;
      } else {
        const err = await response.text();
        console.warn(`[AI] Gemini model ${model} error ${response.status}:`, err.slice(0, 200));
      }
    } catch (err) {
      console.warn(`[AI] Gemini model ${model} threw:`, err);
    }
  }

  return null;
}

// ─── Extract only the user's latest message ──────────────────────────────────
function extractUserQuery(prompt: string): string {
  if (prompt.includes("Student:")) {
    const parts = prompt.split("Student:");
    const lastPart = parts[parts.length - 1];
    const beforeCoach = lastPart.split(/\nCoach:/i)[0];
    return beforeCoach
      .replace(/Answer the last question with concrete steps\./gi, "")
      .trim();
  }
  return prompt.trim();
}

// ─── Normalise query text for matching ───────────────────────────────────────
function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function has(lower: string, ...terms: string[]): boolean {
  return terms.some(t => lower.includes(t));
}

// ─── Intent classifier ───────────────────────────────────────────────────────
type Intent =
  | "docker_devops"
  | "project_portfolio"
  | "3d_web"
  | "resume_ats"
  | "api_architecture"
  | "state_management"
  | "css_layout"
  | "system_design"
  | "database"
  | "testing"
  | "interview_prep"
  | "learning_roadmap"
  | "placement_job"
  | "salary_negotiation"
  | "networking_linkedin"
  | "git_version_control"
  | "typescript"
  | "nextjs"
  | "react"
  | "nodejs_backend"
  | "cloud_aws"
  | "performance_optimization"
  | "data_structures"
  | "open_source"
  | "freelancing"
  | "machine_learning"
  | "mobile_dev"
  | "security"
  | "agile_methodology"
  | "general";

function classifyIntent(q: string): Intent {
  const l = norm(q);

  if (has(l, "docker", "kubernetes", "k8s", "container", "devops", "ci cd", "cicd", "pipeline", "deploy", "deployment", "aws ecs", "helm")) return "docker_devops";
  if (has(l, "project idea", "portfolio", "build something", "side project", "mini project", "personal project", "what to build", "project to build")) return "project_portfolio";
  if (has(l, "3d", "three js", "threejs", "webgl", "glsl", "shader", "r3f", "react three fiber", "blender", "spline", "3d web")) return "3d_web";
  if (has(l, "resume", "ats", "curriculum vitae", "cv", "bullet point", "resume score", "ats score", "resume tip")) return "resume_ats";
  if (has(l, "graphql", "rest api", "rest vs", "api design", "trpc", "grpc", "websocket", "webhook", "api architecture", "fetch api")) return "api_architecture";
  if (has(l, "state management", "redux", "zustand", "jotai", "recoil", "context api", "global state", "useState", "useReducer")) return "state_management";
  if (has(l, "css grid", "flexbox", "tailwind", "css layout", "responsive design", "media query", "css framework", "styled components")) return "css_layout";
  if (has(l, "system design", "scale", "scalability", "load balancer", "cdn", "caching", "microservice", "distributed", "high availability", "architecture")) return "system_design";
  if (has(l, "database", "sql", "nosql", "postgres", "mongodb", "mysql", "prisma", "orm", "redis", "supabase", "firebase db", "schema")) return "database";
  if (has(l, "testing", "test", "jest", "vitest", "cypress", "playwright", "unit test", "integration test", "tdd", "bdd", "e2e")) return "testing";
  if (has(l, "interview", "mock interview", "technical round", "coding interview", "hr round", "dsa round", "leet", "system design round")) return "interview_prep";
  if (has(l, "roadmap", "learning path", "study plan", "what should i learn", "where to start", "how to become", "skill gap", "plan")) return "learning_roadmap";
  if (has(l, "placement", "job", "hired", "apply", "offer", "company", "placement ready", "job search", "campus placement", "internship")) return "placement_job";
  if (has(l, "salary", "negotiate", "ctc", "hike", "appraisal", "compensation", "package", "lpa")) return "salary_negotiation";
  if (has(l, "linkedin", "networking", "connection", "cold email", "reach out", "personal brand", "twitter", "x.com", "blog")) return "networking_linkedin";
  if (has(l, "git", "github", "version control", "commit", "branch", "merge", "pull request", "pr", "rebase", "conflict")) return "git_version_control";
  if (has(l, "typescript", "ts", "type safety", "generics", "interface", "type alias", "ts config")) return "typescript";
  if (has(l, "next js", "nextjs", "next.js", "app router", "pages router", "server action", "server component", "rsc")) return "nextjs";
  if (has(l, "react", "jsx", "component", "hook", "useeffect", "usecallback", "usememo", "react 19", "suspense")) return "react";
  if (has(l, "node", "node.js", "nodejs", "express", "fastify", "backend", "server side", "rest server")) return "nodejs_backend";
  if (has(l, "aws", "gcp", "azure", "cloud", "vercel", "netlify", "cloudflare", "lambda", "s3", "ec2")) return "cloud_aws";
  if (has(l, "performance", "optimize", "lighthouse", "core web vitals", "lazy load", "bundle size", "web vitals", "speed")) return "performance_optimization";
  if (has(l, "data structure", "algorithm", "dsa", "leetcode", "binary tree", "dynamic programming", "dp", "sorting", "complexity", "big o")) return "data_structures";
  if (has(l, "open source", "contribute", "pull request to", "hacktoberfest", "oss")) return "open_source";
  if (has(l, "freelance", "freelancing", "upwork", "toptal", "client", "fiverr", "self employed")) return "freelancing";
  if (has(l, "machine learning", "ml", "ai model", "deep learning", "neural network", "tensorflow", "pytorch", "llm", "ai engineer")) return "machine_learning";
  if (has(l, "react native", "flutter", "mobile", "android", "ios", "expo", "swift", "kotlin")) return "mobile_dev";
  if (has(l, "security", "auth", "jwt", "oauth", "xss", "csrf", "injection", "encryption", "https")) return "security";
  if (has(l, "agile", "scrum", "kanban", "sprint", "jira", "standup", "retrospective", "product owner")) return "agile_methodology";

  return "general";
}

const T = '\`'; // backtick helper for template literals inside template literals

// ─── Response library ────────────────────────────────────────────────────────
const RESPONSES: Record<Intent, (q: string) => string> = {

  docker_devops: () => `## Docker & DevOps — A Complete Breakdown

**Docker** is a containerization platform that packages your application, its runtime, and all dependencies into a portable, self-contained unit called a *container*. This guarantees identical behavior across every environment — from your MacBook to a production AWS server.

### Why Developers Use Docker

| Without Docker | With Docker |
|---|---|
| "It works on my machine" | Runs identically everywhere |
| Manual dependency installs | One ${T}docker-compose up${T} command |
| Environment drift across servers | Immutable, reproducible builds |

### Core Concepts to Learn

1. **Dockerfile** — Blueprint for building your image. Start with a slim base (${T}node:20-alpine${T}), copy your code, install dependencies, and set an ${T}ENTRYPOINT${T}.
2. **Docker Compose** — Orchestrate multiple services (Next.js app + PostgreSQL + Redis) with a single ${T}docker-compose.yml${T}.
3. **Docker Hub / GitHub Container Registry** — Push your images for deployment.

### Sample ${T}Dockerfile${T} for Next.js
${T}${T}${T}dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
EXPOSE 3000
CMD ["npm", "start"]
${T}${T}${T}

### CI/CD Pipeline (GitHub Actions)
${T}${T}${T}yaml
name: Deploy
on: [push]
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build & Push Docker Image
        run: |
          docker build -t myapp:latest .
          docker push myapp:latest
${T}${T}${T}

### Learning Resources
- [Docker Official Get Started Guide](https://docs.docker.com/get-started/)
- [TechWorld with Nana — Docker Full Course](https://www.youtube.com/watch?v=3c-iBn73dDE)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

> **Career tip:** Add a containerised project to your GitHub with a working ${T}docker-compose.yml${T}. This signals production maturity to recruiters and is a strong differentiator at the junior–mid level.`,

  project_portfolio: () => `## Portfolio Project Ideas — Ranked by Recruiter Impact

Here are three production-grade projects that demonstrate real depth, not just CRUD apps:

---

### 🥇 Project 1 — AI-Powered Resume Optimizer
**Why it impresses:** Shows full-stack architecture + AI API integration + real-world utility.

**Stack:** Next.js 15 (App Router), TypeScript, Prisma + PostgreSQL, Vercel AI SDK, PDF.js

**Core Features:**
- PDF upload → server-side text extraction
- Send extracted text to Gemini / OpenAI for ATS scoring
- Highlight missing keywords and suggest rewrites
- User authentication and history dashboard

**What recruiters see:** You understand AI integration, file handling, and building end-to-end products.

---

### 🥈 Project 2 — Real-Time Collaborative Code Editor
**Why it impresses:** Demonstrates WebSockets, operational transforms, and low-latency UI.

**Stack:** React, Socket.io, Monaco Editor (VS Code's engine), Node.js, Redis pub/sub

**Core Features:**
- Live multi-user cursors with distinct colours
- Syntax-highlighted code editing in 15+ languages
- Room-based sessions with shareable URLs
- Auto-save to localStorage / server

---

### 🥉 Project 3 — Developer Analytics Dashboard
**Why it impresses:** Shows data viz skills, API integration, and product thinking.

**Stack:** Next.js, Recharts, GitHub API, Tailwind CSS, SWR for data fetching

**Core Features:**
- Connect GitHub profile → visualise commit heatmap, top languages, streak
- Compare with peers on a leaderboard
- Export personalised developer report as PDF

---

### How to Present These Projects
1. Write a detailed ${T}README.md${T} with screenshots, architecture diagram, and live demo link.
2. Record a 90-second Loom walkthrough and embed it in the README.
3. Deploy to Vercel (free tier) and keep it live — recruiters *will* click the link.`,

  "3d_web": () => `## 3D Web Developer Roadmap

3D web development is a highly specialised niche that commands premium salaries (₹20L–₹45L+ at agencies and product companies). Here is a structured path from zero to production-ready:

### Phase 1 — Foundations (Weeks 1–4)
**Goal:** Understand how browsers render 3D graphics.

- Learn **WebGL concepts**: scene, camera, renderer, meshes, materials, lights.
- Start with **Three.js** directly — it abstracts WebGL into a sensible API.
- Resource: [Three.js Journey by Bruno Simon](https://threejs-journey.com/) — the industry-standard course (paid, but worth every rupee).

### Phase 2 — React Integration (Weeks 5–8)
**Goal:** Build 3D scenes inside React applications.

- Learn **React Three Fiber (R3F)** — Three.js as React components.
- Learn **Drei** — a helper library with pre-built controls, loaders, shaders.
- Practice: Build an interactive 3D product card that responds to mouse movement.

${T}${T}${T}tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Box } from '@react-three/drei'

export default function Scene() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <Box args={[1, 1, 1]}>
        <meshStandardMaterial color="hotpink" />
      </Box>
      <OrbitControls />
    </Canvas>
  )
}
${T}${T}${T}

### Phase 3 — Shaders & Visual FX (Weeks 9–16)
**Goal:** Write custom GPU programs for unique visual effects.

- Learn **GLSL** (OpenGL Shading Language) — vertex and fragment shaders.
- Study **ShaderMaterial** and **RawShaderMaterial** in Three.js.
- Build: Animated particle systems, liquid surfaces, glowing edge effects.

### Phase 4 — Assets & Performance (Weeks 17–20)
**Goal:** Load real 3D models efficiently.

- Learn **Blender** basics: modelling, UV unwrapping, GLTF export.
- Use **gltfjsx** to convert GLTF models into React components.
- Optimise with **Draco compression** and **KTX2 textures**.

### Free Resources
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [The Book of Shaders](https://thebookofshaders.com/) — GLSL fundamentals
- [Yuri Artiukh (YouTube)](https://www.youtube.com/@akella) — advanced WebGL techniques

### Portfolio Milestone
Deploy a **3D hero section** for your portfolio — animated floating shapes, scroll-driven camera movement, or a 3D product model. Post on LinkedIn with a screen recording. This alone can get you unsolicited DMs from agencies.`,

  resume_ats: () => `## Resume & ATS Optimisation — Comprehensive Guide

Applicant Tracking Systems scan your resume before any human sees it. Here is how to beat them *and* impress the humans who read it next.

### Why Resumes Fail ATS

1. **Weak, non-quantified bullets** — "worked on React components" tells ATS nothing about impact.
2. **Missing keywords** — ATS matches your resume against the job description. No keyword = instant reject.
3. **Poor formatting** — Tables, columns, and fancy designs break ATS parsers.

---

### The STAR Formula for Bullets

Every bullet should answer: **Situation → Task → Action → Result**

**❌ Weak:** *Built a React dashboard for internal team.*
**✅ Strong:** *Engineered a React 18 + TypeScript analytics dashboard used by 3 internal teams, reducing manual reporting time by 40% and eliminating 3 weekly Slack threads.*

---

### ATS Keyword Strategy

1. Copy the job description into a text editor.
2. Identify technical skills, tools, and role-specific verbs.
3. Mirror those exact terms in your resume (e.g., if they say "TypeScript", don't write "TS").

**High-value keywords for frontend/fullstack roles:**
${T}TypeScript${T}, ${T}React 18${T}, ${T}Next.js${T}, ${T}Node.js${T}, ${T}REST APIs${T}, ${T}GraphQL${T}, ${T}PostgreSQL${T}, ${T}Prisma${T}, ${T}Docker${T}, ${T}CI/CD${T}, ${T}Agile${T}, ${T}Git${T}, ${T}Jest${T}, ${T}Figma${T}

---

### One-Page Resume Structure (2025 Standard)

| Section | Notes |
|---|---|
| **Header** | Name, GitHub, LinkedIn, portfolio URL, email |
| **Summary** (optional) | 2–3 lines, keyword-rich, role-specific |
| **Skills** | Grouped: Languages → Frameworks → Tools → Cloud |
| **Experience** | Reverse chronological, STAR bullets, quantified |
| **Projects** | 2–3 projects with live links and tech stack |
| **Education** | Institution, degree, CGPA (if ≥ 7.5) |

---

### Free ATS Check Tools
- [Jobscan](https://www.jobscan.co/) — Compare resume vs. JD
- [Resume Worded](https://resumeworded.com/) — AI-powered feedback
- [LinkedIn Resume Builder](https://www.linkedin.com/resume-builder/) — Syncs with your profile`,

  api_architecture: () => `## REST vs GraphQL vs tRPC — Choosing the Right API Architecture

The API layer is often where junior devs make costly architectural mistakes. Here is a clear breakdown:

---

### REST (Representational State Transfer)

**How it works:** Multiple endpoints, each representing a resource.
${T}${T}${T}
GET    /api/users/123
POST   /api/posts
DELETE /api/posts/456
${T}${T}${T}

**Pros:** Simple, cacheable, widely understood, great tooling (Postman, Swagger).
**Cons:** Over-fetching (too much data), under-fetching (multiple round-trips), no schema contract.

**Best for:** Public APIs, file uploads, simple CRUD applications, webhooks.

---

### GraphQL

**How it works:** Single endpoint, client specifies exactly what data it needs.
${T}${T}${T}graphql
query {
  user(id: "123") {
    name
    posts {
      title
      publishedAt
    }
  }
}
${T}${T}${T}

**Pros:** Precise data fetching, strongly typed schema, auto-generates TypeScript types, excellent for complex nested data.
**Cons:** Caching is more complex, N+1 query problem, overkill for simple apps.

**Best for:** Complex mobile/web apps with deeply nested relational data (social feeds, e-commerce, dashboards).

---

### tRPC (TypeScript Remote Procedure Call)

**How it works:** Define procedures on the server; call them from the client with full TypeScript inference — no schema files, no code generation.

${T}${T}${T}ts
// Server
const appRouter = t.router({
  getUserById: t.procedure
    .input(z.string())
    .query(({ input }) => db.users.find(input)),
});

// Client — fully typed, no fetch boilerplate
const user = await trpc.getUserById.query("123");
${T}${T}${T}

**Best for:** Full-stack TypeScript monorepos (Next.js + Node.js). Extremely productive for solo developers and small teams.

---

### Decision Matrix

| Use Case | Recommended |
|---|---|
| Public API consumed by third parties | REST |
| Complex data with many relationships | GraphQL |
| Full-stack Next.js app (solo/small team) | tRPC |
| Real-time bidirectional data | WebSockets + Socket.io |`,

  state_management: () => `## React State Management — The Right Tool for Each Job

State management is one of the most debated topics in React. Here is a clear mental model:

### The State Hierarchy

Think of state in four tiers:

**Tier 1 — Local Component State**
Use ${T}useState${T} or ${T}useReducer${T}. Keep state as close to where it's used as possible.
${T}${T}${T}tsx
const [count, setCount] = useState(0);
${T}${T}${T}

**Tier 2 — Shared UI State (Zustand)**
For client-side global state: auth, theme, modal visibility, cart, notifications.
${T}${T}${T}ts
import { create } from 'zustand';

const useStore = create<{ count: number; increment: () => void }>(set => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
}));
${T}${T}${T}
**Why Zustand over Redux?** Zero boilerplate, no providers, works outside React components, tiny bundle (1KB).

**Tier 3 — Server State (TanStack Query / SWR)**
For anything fetched from an API. Handles caching, background refetching, loading/error states.
${T}${T}${T}ts
const { data, isLoading } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
  staleTime: 5 * 60 * 1000, // cache for 5 minutes
});
${T}${T}${T}

**Tier 4 — Server State in Next.js (React Server Components)**
In Next.js 13+, fetch directly in Server Components — no useEffect, no loading spinners.
${T}${T}${T}tsx
// This runs on the server — no client-side fetch needed
export default async function Page() {
  const data = await db.getPosts();
  return <PostList posts={data} />;
}
${T}${T}${T}

### When to Use Each

| Scenario | Solution |
|---|---|
| Component-local toggle | ${T}useState${T} |
| Auth session across pages | Zustand |
| User's posts feed | TanStack Query |
| Dashboard data in Next.js | RSC + Server Action |
| Complex form state | React Hook Form |`,

  css_layout: () => `## CSS Layout Mastery — Flexbox, Grid & Modern Techniques

### The Core Mental Model

| | Flexbox | CSS Grid |
|---|---|---|
| Dimension | 1D (row or column) | 2D (rows AND columns) |
| Control | Content drives layout | Container drives layout |
| Best for | Navigation bars, card rows, centring items | Page layouts, dashboards, image galleries |

**Rule of thumb:** Use Grid for the macro layout, Flexbox for micro alignment within components.

---

### Flexbox Essentials
${T}${T}${T}css
.container {
  display: flex;
  justify-content: space-between; /* main axis */
  align-items: center;            /* cross axis */
  gap: 16px;
  flex-wrap: wrap;
}
${T}${T}${T}

**Most useful properties:** ${T}flex: 1${T} (grow to fill space), ${T}flex-shrink: 0${T} (don't compress), ${T}order${T} (reorder visually).

---

### CSS Grid Essentials
${T}${T}${T}css
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;          /* sidebar + main */
  grid-template-rows: 60px 1fr;              /* header + content */
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  height: 100vh;
}

.sidebar { grid-area: sidebar; }
.header  { grid-area: header; }
.main    { grid-area: main; }
${T}${T}${T}

---

### Responsive Design with Container Queries (2024+)
${T}${T}${T}css
/* Style based on parent container width, not viewport */
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { display: grid; grid-template-columns: auto 1fr; }
}
${T}${T}${T}

---

### Tailwind CSS Tips
- Use ${T}grid grid-cols-[240px_1fr]${T} for fixed + fluid columns.
- Use ${T}@apply${T} sparingly — prefer component classes.
- Enable **JIT mode** (default in v3+) for arbitrary values like ${T}w-[37px]${T}.

### Resources
- [CSS Tricks — A Complete Guide to Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Flexbox Froggy (interactive game)](https://flexboxfroggy.com/)
- [Grid Garden (interactive game)](https://cssgridgarden.com/)`,

  system_design: () => `## System Design for Frontend & Fullstack Engineers

Most junior devs ignore system design until their first mid-level interview — don't make that mistake. Here is a practical framework:

### The 4 Pillars of Scalable Web Architecture

**1. CDN & Edge Caching**
Static assets (images, JS bundles, fonts) should be served from a CDN node closest to the user — reducing latency from ~200ms to ~5ms.
- Vercel / Cloudflare Pages do this automatically.
- Use ${T}Cache-Control: public, max-age=31536000, immutable${T} for hashed static files.

**2. Database Scaling**
${T}${T}${T}
Vertical Scaling → Bigger machine (limited)
Horizontal Scaling → Read replicas for SELECT queries
Connection Pooling → PgBouncer / Prisma Accelerate (prevents DB exhaustion)
Indexing → Add indexes on frequently queried columns
${T}${T}${T}

**3. Caching Layers**
- **Browser cache:** HTTP headers (${T}ETag${T}, ${T}Last-Modified${T})
- **Application cache:** Redis (sub-millisecond key-value lookups)
- **CDN cache:** Stale-while-revalidate (SWR) for HTML pages

**4. Background Job Queues**
Never process heavy tasks synchronously in an API route. Delegate to a queue:
${T}${T}${T}
User uploads PDF → API route adds job to queue → Worker processes PDF
              ↓                                          ↓
         Returns 202 Accepted                  Sends result via WebSocket
${T}${T}${T}
Tools: **BullMQ** (Redis-backed), **Inngest** (serverless), **Trigger.dev**

---

### Interview Framework (45-minute system design)
1. **Clarify requirements** (5 min) — functional vs non-functional, scale numbers
2. **API design** (5 min) — endpoints, data contracts
3. **High-level architecture** (15 min) — draw the boxes
4. **Deep dive** (15 min) — focus on the interviewer's area of interest
5. **Bottlenecks & trade-offs** (5 min) — what breaks first, how to fix it

### Resources
- [System Design Primer (GitHub)](https://github.com/donnemartin/system-design-primer)
- [ByteByteGo Newsletter](https://bytebytego.com/) — visual system design
- [Arpit Bhayani (YouTube)](https://www.youtube.com/@AsliEngineering)`,

  database: () => `## Database Architecture for Modern Web Applications

Choosing the right database and ORM is an architectural decision that's hard to change later. Here is a clear framework:

### Relational (SQL) vs Document (NoSQL)

| | PostgreSQL / MySQL | MongoDB / DynamoDB |
|---|---|---|
| **Data shape** | Structured, relational | Flexible / semi-structured |
| **Queries** | Complex JOINs, aggregations | Simple document lookups |
| **Consistency** | ACID transactions | Eventual consistency (configurable) |
| **Best for** | E-commerce, SaaS, fintech | Content, logs, IoT, rapid prototyping |

**For most Next.js applications in 2025: PostgreSQL + Prisma ORM** is the gold standard.

---

### Prisma ORM — Type-Safe Queries

${T}${T}${T}ts
// schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  posts     Post[]
  createdAt DateTime @default(now())
}

// Fully typed query — TypeScript knows the return shape
const user = await prisma.user.findUnique({
  where: { email: 'harsh@example.com' },
  include: { posts: { take: 5, orderBy: { createdAt: 'desc' } } },
});
${T}${T}${T}

---

### Redis — When to Add a Cache Layer

Use Redis when:
- A query takes > 200ms and the data changes infrequently (add Redis cache with a TTL).
- You need session storage, rate limiting, or pub/sub for WebSockets.
- You're building leaderboards (sorted sets are perfect for this).

---

### Database Indexing — The Most Underrated Performance Tool
${T}${T}${T}sql
-- If you query users by email often, add this:
CREATE INDEX idx_users_email ON users(email);

-- Composite index for filtered + sorted queries
CREATE INDEX idx_posts_author_date ON posts(author_id, created_at DESC);
${T}${T}${T}

Without indexes, a query on 1M rows does a full table scan. With the right index, it's O(log n).

### Resources
- [Prisma Official Docs](https://www.prisma.io/docs)
- [PlanetScale MySQL + Prisma](https://planetscale.com/docs/tutorials/prisma-quickstart)
- [Neon — Serverless PostgreSQL](https://neon.tech/)`,

  testing: () => `## Software Testing Strategy — The Testing Pyramid

Testing is the difference between code you're confident deploying and code you're hoping works. Here is a practical strategy:

### The Testing Pyramid

${T}${T}${T}
          ┌──────────────┐
          │   E2E Tests  │  ← Playwright / Cypress (few, slow, expensive)
          │   (5–10%)    │
     ┌────┴──────────────┴────┐
     │  Integration Tests     │  ← React Testing Library (moderate)
     │  (20–30%)              │
┌────┴────────────────────────┴────┐
│        Unit Tests                │  ← Jest / Vitest (many, fast, cheap)
│        (60–70%)                  │
└──────────────────────────────────┘
${T}${T}${T}

---

### Unit Tests with Jest / Vitest
${T}${T}${T}ts
// utils/formatSalary.test.ts
import { formatSalary } from './formatSalary';

describe('formatSalary', () => {
  it('formats lakhs correctly', () => {
    expect(formatSalary(1200000)).toBe('₹12L');
  });

  it('handles zero', () => {
    expect(formatSalary(0)).toBe('₹0');
  });
});
${T}${T}${T}

### Integration Tests with React Testing Library
${T}${T}${T}tsx
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from './LoginForm';

test('shows error on empty submission', async () => {
  render(<LoginForm />);
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
});
${T}${T}${T}

### E2E Tests with Playwright
${T}${T}${T}ts
test('user can log in and view dashboard', async ({ page }) => {
  await page.goto('/auth/signin');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password123');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Overview');
});
${T}${T}${T}

---

### What to Test First (Priority Order)
1. **Pure utility functions** — highest ROI, easiest to write.
2. **Form validation and user interactions** — catches real bugs.
3. **Critical user journeys** — login, checkout, key flows.

### Resources
- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Playwright Docs](https://playwright.dev/)`,

  interview_prep: () => `## Technical Interview Preparation — Structured 4-Week Plan

Cracking technical interviews is a skill — and like any skill, it improves with deliberate practice.

### Week 1 — JavaScript & TypeScript Fundamentals
**What interviewers actually test:**
- Closures, hoisting, scope, ${T}this${T} binding
- Promises, async/await, event loop
- Array/object methods (${T}map${T}, ${T}reduce${T}, ${T}filter${T}, ${T}flatMap${T})
- TypeScript generics and utility types (${T}Partial<T>${T}, ${T}Pick<T,K>${T}, ${T}Record<K,V>${T})

**Practice question:** *"Implement a ${T}debounce${T} function from scratch."*

### Week 2 — React & State Management
**Key concepts:**
- Virtual DOM reconciliation and the diffing algorithm
- Why ${T}key${T} props matter in lists (and what happens without them)
- When to use ${T}useMemo${T} vs ${T}useCallback${T} vs neither
- React 18 concurrent features: Suspense, transitions, streaming SSR

**Practice question:** *"Build a search input that fetches results after the user stops typing for 500ms."*

### Week 3 — System Design (Frontend Focus)
**For senior/mid-level roles, expect design questions:**
- Design a real-time notification system
- How would you build a collaborative document editor?
- Describe the architecture of an infinite-scroll social feed

### Week 4 — DSA Essentials
You don't need LeetCode hard. Focus on:
- **Arrays & Strings:** Two pointers, sliding window
- **Hash Maps:** Frequency counting, grouping
- **Trees:** BFS, DFS, recursive traversal
- **Sorting:** Know merge sort and quicksort conceptually

---

### Day-of Interview Tips
1. **Think out loud** — interviewers care about your process, not just the answer.
2. **Clarify before coding** — ask about edge cases, constraints, expected input.
3. **Start with brute force** — then optimise with interviewer's buy-in.
4. **Test your code** — walk through your solution with a simple example.

### Resources
- [NeetCode 150 Problem Set](https://neetcode.io/practice)
- [Frontend Interview Handbook](https://frontendinterviewhandbook.com/)
- [Greatfrontend (Frontend DSA)](https://www.greatfrontend.com/)`,

  learning_roadmap: () => `## Your Personalised Learning Roadmap — 2025

Here is a structured 6-month plan to go from junior to job-ready:

### Month 1–2 — Core Foundations

**JavaScript Mastery**
- Closures, prototypes, the event loop, ${T}this${T} binding
- Async patterns: Promises → async/await → AbortController
- Resource: [javascript.info](https://javascript.info/) — the best free JS reference

**TypeScript Fundamentals**
- Types, interfaces, generics, utility types, ${T}tsconfig.json${T}
- Resource: [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### Month 3–4 — React & Next.js Ecosystem

**React 18/19 Deep Dive**
- Hooks (useState, useEffect, useMemo, useCallback, useContext, custom hooks)
- Performance: memoisation, code splitting, lazy loading

**Next.js App Router**
- Server Components vs Client Components
- Server Actions, Route Handlers, Middleware
- Data fetching patterns: fetch + cache, revalidation

### Month 5 — Database, Auth & APIs

- **PostgreSQL + Prisma:** Schema design, relations, migrations, raw queries
- **Authentication:** NextAuth.js v5 / Clerk / Supabase Auth
- **REST API design:** Route naming, status codes, error handling, versioning

### Month 6 — Portfolio & Job Readiness

- Ship 2–3 production projects with live deployments
- Get your resume ATS score to 80+
- Apply to 10 companies per week — optimise based on response rates
- Start with warm outreach: LinkedIn DMs to engineers at target companies

### Key Milestones to Track
- [ ] Build and deploy a full-stack app (Next.js + PostgreSQL)
- [ ] Contribute to 1 open-source project
- [ ] Get resume reviewed by a senior dev
- [ ] Complete 50 LeetCode easy/medium problems
- [ ] Land at least 1 technical phone screen`,

  placement_job: () => `## Job Search & Placement Strategy — What Actually Works in 2025

### The Hard Truth About Job Searching

Mass-applying to 200 companies with the same resume gets a ~1% response rate. A targeted, warm-outreach approach with a strong profile gets 15–25%.

### 4-Step Placement Framework

**Step 1 — Profile Optimisation**
Before applying anywhere:
- Resume ATS score: **aim for 80+** (use Jobscan vs the JD)
- GitHub: At least 2–3 pinned repos with proper READMEs and live demos
- LinkedIn: Summary, skills endorsed, and a post showing your work

**Step 2 — Target Company Research**
Build a spreadsheet with 50 target companies:
- Role fit (stack alignment), company stage (startup vs MNC), growth trajectory
- Set job alerts on LinkedIn, Naukri, and AngelList for those companies

**Step 3 — Warm Outreach > Cold Applications**
1. Find a developer at the target company on LinkedIn.
2. Connect with a personalised note: *"Hi [Name], I noticed you work on [product]. I've been building a [similar project] and would love 15 minutes to hear about your team's approach to [specific problem]."*
3. Have a 15-minute conversation. Ask about the team and the hiring process.
4. Ask if they'd be comfortable referring you internally.

An internal referral increases your chance of reaching HR by 6–10x.

**Step 4 — Interview Execution**
- STAR method for behavioural questions
- Think out loud during technical rounds
- Always send a follow-up thank-you email within 24 hours

### Immediate Actions
1. Update your resume today using the STAR method for every bullet.
2. Deploy your best project to a live URL (Vercel free tier).
3. Write one LinkedIn post about something you built this week.
4. Send 3 personalised connection requests to developers at your target companies.`,

  salary_negotiation: () => `## Salary Negotiation — How to Get the Best Offer

Most candidates leave 10–20% of their potential salary on the table simply by not negotiating. Here is how to negotiate confidently.

### Know Your Market Value

**Research sources for India:**
- [Glassdoor India](https://www.glassdoor.co.in/)
- [Levels.fyi India](https://www.levels.fyi/t/software-engineer/india)
- [AmbitionBox](https://www.ambitionbox.com/)
- LinkedIn Salary Insights

**For frontend/fullstack roles (2025):**
- 0–1 year: ₹6L–₹12L
- 1–3 years: ₹12L–₹22L
- 3–6 years: ₹20L–₹45L
- Product companies pay 1.5–2x compared to service companies at the same experience level.

### The Negotiation Script

When you receive an offer, **never accept on the spot**. Say:
> *"Thank you for the offer — I'm genuinely excited about this opportunity. Could I have 48 hours to review the full details?"*

When responding:
> *"Based on my research into market rates and the skills I bring — specifically [X, Y, Z] — I was expecting something closer to [target CTC]. Is there any flexibility on the base?"*

### What to Negotiate Beyond Salary
- **Joining bonus** (often easier to get than a base bump)
- **Remote work flexibility**
- **Learning & development budget**
- **ESOPs / equity** (at startups)
- **Sign-on stock refreshers** (at large companies)

### Key Rule: The First Person to Name a Number Loses
If asked "What are your salary expectations?", say:
> *"I'm flexible — I'd love to understand the full package and scope first. What is the budgeted range for this role?"*`,

  networking_linkedin: () => `## LinkedIn & Professional Networking — Building Career Leverage

Most developers underestimate networking because they think it means "bothering strangers". In reality, it's about being findable and building genuine relationships.

### LinkedIn Profile Optimisation

**Headline (most important field):**
❌ *"Student at AKTU"*
✅ *"Frontend Developer | React, Next.js, TypeScript | Building production-grade web apps"*

**About Section:** Tell your story in 3 sentences. What you build, what you're looking for, what makes you interesting.

**Featured Section:** Link your top project with a screenshot. This is the first thing recruiters see after your headline.

---

### The Content Strategy That Gets Recruiters DMing You

Post 1–2 times per week using this formula:
1. **Show your work:** *"I built X this weekend. Here's what I learned."* + screenshot or video.
2. **Share a tip:** *"One TypeScript trick that saved me 2 hours debugging..."*
3. **Document your journey:** *"Week 4 of learning Three.js — here's my progress."*

You don't need thousands of followers. 3–5 good posts with genuine engagement are enough for recruiters at target companies to notice you.

---

### Cold Outreach Template That Gets Responses
${T}${T}${T}
Subject: Quick question about [Company]'s [Team] team

Hi [Name],

I came across your work on [specific project/article/talk] — the approach you took with [X] was really interesting.

I'm a frontend developer exploring opportunities at [Company]. Would you be open to a 15-minute chat about your experience on the team?

No pressure at all if you're busy — I appreciate your time either way.

[Your Name]
${T}${T}${T}

**Keys to success:** Specific, brief, low ask, genuine interest.`,

  git_version_control: () => `## Git Mastery — Beyond the Basics

Most developers know ${T}git add${T}, ${T}git commit${T}, ${T}git push${T}. Here is what separates seniors from juniors:

### Essential Git Workflows

**Feature Branch Workflow (industry standard):**
${T}${T}${T}bash
git checkout -b feature/add-user-auth   # create feature branch
# ... make changes ...
git add -p                              # stage interactively (review each chunk)
git commit -m "feat(auth): add JWT refresh token logic"
git push origin feature/add-user-auth
# → open Pull Request on GitHub
${T}${T}${T}

**Conventional Commits Format:**
${T}${T}${T}
feat: add dark mode toggle
fix: resolve login redirect loop
docs: update API documentation
refactor: extract auth logic to custom hook
perf: lazy load dashboard charts
test: add unit tests for formatSalary utility
${T}${T}${T}

---

### Power Commands

${T}${T}${T}bash
git log --oneline --graph --all      # visual branch history
git diff --staged                    # review staged changes before committing
git stash push -m "wip: trying new approach"  # save work without committing
git stash pop                        # restore stashed work
git rebase -i HEAD~3                 # squash last 3 commits into one
git bisect start                     # binary search to find the buggy commit
${T}${T}${T}

---

### Undoing Mistakes

${T}${T}${T}bash
git restore <file>          # discard unstaged changes
git restore --staged <file> # unstage a file (keep changes)
git commit --amend          # fix the last commit message/content
git revert <commit-hash>    # safely undo a commit (creates new commit)
git reset --hard HEAD~1     # ⚠️ Danger: discard last commit AND changes
${T}${T}${T}

### GitHub Best Practices
- Write descriptive PR descriptions (what, why, how to test)
- Request specific reviewers with areas to focus on
- Respond to all review comments — even "agreed, fixed"
- Squash merge feature branches to keep main history clean`,

  typescript: () => `## TypeScript Mastery — Advanced Patterns

### Generic Types (The Key to Reusable Code)
${T}${T}${T}ts
// Generic function
function getFirst<T>(arr: T[]): T | undefined {
  return arr[0];
}
const num = getFirst([1, 2, 3]);    // type: number
const str = getFirst(["a", "b"]);   // type: string

// Generic API response wrapper
type ApiResponse<T> = {
  data: T;
  status: number;
  error: string | null;
};

type UserResponse = ApiResponse<{ id: string; name: string }>;
${T}${T}${T}

### Utility Types (Use These Daily)
${T}${T}${T}ts
type User = { id: string; name: string; email: string; age: number };

type CreateUser = Omit<User, 'id'>;          // Remove id from type
type UpdateUser = Partial<User>;              // All fields optional
type PublicUser = Pick<User, 'id' | 'name'>; // Only id and name
type UserRecord = Record<string, User>;       // Dictionary of users
type ReadonlyUser = Readonly<User>;           // All fields readonly
${T}${T}${T}

### Discriminated Unions (Safer than Booleans)
${T}${T}${T}ts
type LoadingState = { status: 'loading' };
type SuccessState = { status: 'success'; data: string[] };
type ErrorState   = { status: 'error'; message: string };

type AsyncState = LoadingState | SuccessState | ErrorState;

function render(state: AsyncState) {
  switch (state.status) {
    case 'loading': return <Spinner />;
    case 'success': return <List items={state.data} />;  // data is typed
    case 'error':   return <Error msg={state.message} />; // message is typed
  }
}
${T}${T}${T}

### Template Literal Types
${T}${T}${T}ts
type EventName = 'click' | 'hover' | 'focus';
type Handler = ${T}on\${Capitalize<EventName>}${T}; // 'onClick' | 'onHover' | 'onFocus'
${T}${T}${T}

### tsconfig Best Practices
${T}${T}${T}json
{
  "compilerOptions": {
    "strict": true,           // Enable all strict checks
    "noUncheckedIndexedAccess": true, // arr[0] returns T | undefined
    "exactOptionalPropertyTypes": true,
    "paths": { "@/*": ["./src/*"] }   // Path aliases
  }
}
${T}${T}${T}`,

  nextjs: () => `## Next.js App Router — Production Patterns

### Server Components vs Client Components
${T}${T}${T}tsx
// Server Component (default) — runs on server, no JS sent to client
// ✅ Can: fetch data, access env vars, read filesystem, use async/await
// ❌ Cannot: use useState, useEffect, event handlers, browser APIs
export default async function DashboardPage() {
  const data = await db.getDashboardData(); // Direct DB call, no API layer needed
  return <Dashboard data={data} />;
}

// Client Component — add 'use client' at the top
// ✅ Can: useState, useEffect, event handlers, browser APIs
// ❌ Cannot: async at component level, direct DB access
'use client';
export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
${T}${T}${T}

### Server Actions — Fullstack Without APIs
${T}${T}${T}ts
// src/actions/user.ts
'use server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const name = formData.get('name') as string;
  await db.updateUser({ name });
  revalidatePath('/dashboard/settings'); // Refresh cached page
}

// Use directly in a form — no fetch(), no API route needed
<form action={updateProfile}>
  <input name="name" />
  <button type="submit">Save</button>
</form>
${T}${T}${T}

### Data Fetching & Caching
${T}${T}${T}tsx
// Cache for 1 hour, revalidate in background
const data = await fetch('/api/data', {
  next: { revalidate: 3600 }
});

// Never cache (always fresh)
const data = await fetch('/api/user', {
  cache: 'no-store'
});

// Tag-based revalidation
const data = await fetch('/api/posts', {
  next: { tags: ['posts'] }
});
// Later: revalidateTag('posts') to clear this cache
${T}${T}${T}

### File Structure Best Practices
${T}${T}${T}
src/
├── app/                    # Routes (App Router)
│   ├── (auth)/             # Route group (no URL segment)
│   ├── dashboard/
│   │   ├── page.tsx        # /dashboard
│   │   └── layout.tsx      # Shared layout
│   └── api/                # API routes
├── actions/                # Server Actions
├── components/             # React components
│   ├── ui/                 # Generic UI components
│   └── features/           # Feature-specific components
└── lib/                    # Utilities, DB client, AI client
${T}${T}${T}`,

  react: () => `## React 18/19 — Concepts That Senior Devs Actually Know

### Why Keys Matter (Beyond "React needs them for lists")
When you render a list without keys (or use index as key), React can't tell which item moved vs which is new. It remounts the wrong component, which:
- Resets internal state (text in an input disappears)
- Triggers unnecessary re-renders (performance hit)
- Causes animation glitches

**Rule:** Always use a stable, unique ID as key. Never use array index if items can be reordered or deleted.

---

### useMemo vs useCallback vs neither

| Hook | Memoises | Use when |
|---|---|---|
| ${T}useMemo${T} | The computed value | Expensive calculation that's repeated on every render |
| ${T}useCallback${T} | The function reference | Passing a callback to a memoised child component |
| Neither | — | 90% of cases — premature optimisation is real |

${T}${T}${T}tsx
// ✅ useMemo — avoid re-computing on every render
const expensiveResult = useMemo(() =>
  processLargeDataset(rawData), [rawData]
);

// ✅ useCallback — stable reference for memoised child
const handleSubmit = useCallback((data: FormData) => {
  submitForm(data);
}, [submitForm]);

// ❌ Unnecessary — simple calculations don't need memoisation
const doubled = useMemo(() => count * 2, [count]); // Just write: count * 2
${T}${T}${T}

---

### React 18 Concurrent Features

**Transitions** — Mark state updates as non-urgent:
${T}${T}${T}tsx
const [isPending, startTransition] = useTransition();

const handleSearch = (query: string) => {
  setSearchQuery(query);          // Urgent: update input immediately
  startTransition(() => {
    setFilteredResults(filter(query)); // Non-urgent: can be interrupted
  });
};
${T}${T}${T}

**Suspense + lazy loading:**
${T}${T}${T}tsx
const HeavyChart = lazy(() => import('./HeavyChart'));

<Suspense fallback={<ChartSkeleton />}>
  <HeavyChart data={data} />
</Suspense>
${T}${T}${T}`,

  nodejs_backend: () => `## Node.js Backend Development — Production Patterns

### Express vs Fastify vs Hono

| Framework | Best for | Speed |
|---|---|---|
| Express | Legacy projects, maximum ecosystem | Moderate |
| Fastify | Type-safe, high-performance APIs | ~2x Express |
| Hono | Edge runtime (Cloudflare Workers, Vercel) | Fastest |

### Structuring a Production Node.js API
${T}${T}${T}
src/
├── routes/           # Route definitions
├── controllers/      # Request handling logic
├── services/         # Business logic (no HTTP concerns here)
├── repositories/     # Database access layer
├── middleware/       # Auth, validation, error handling
├── lib/              # DB client, logger, external SDKs
└── types/            # Shared TypeScript types
${T}${T}${T}

### Error Handling (Don't Do This Wrong)
${T}${T}${T}ts
// ❌ Bad — unhandled promise rejections crash the server
app.get('/users', async (req, res) => {
  const users = await db.getUsers(); // Can throw
  res.json(users);
});

// ✅ Good — wrap async routes
const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/users', asyncHandler(async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
}));

// Global error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message });
});
${T}${T}${T}

### Security Essentials
- ${T}helmet${T} — Sets secure HTTP headers
- ${T}express-rate-limit${T} — Prevents brute-force attacks
- ${T}zod${T} — Validate ALL incoming data before touching the database
- Never log sensitive data (passwords, tokens, PII)
- Use environment variables for all secrets (never hardcode)`,

  cloud_aws: () => `## Cloud & Deployment — Practical Guide for Frontend/Fullstack Devs

### Deployment Options (Ranked by Simplicity)

**1. Vercel (Best for Next.js — start here)**
- Zero config — connects to GitHub, deploys on every push
- Free tier: generous for personal projects
- Edge runtime support, CDN built-in, preview deployments per PR

**2. Railway / Render (Best for full-stack apps with databases)**
- Deploy Node.js, Python, Docker containers easily
- Managed PostgreSQL / Redis included
- Cheaper than AWS for small apps

**3. AWS (When you need production-grade scale)**
Key services to learn:
- **EC2** — Virtual servers (start with t3.micro free tier)
- **S3 + CloudFront** — Static files + CDN
- **RDS** — Managed PostgreSQL / MySQL
- **Lambda** — Serverless functions
- **ECS/Fargate** — Run Docker containers

---

### CI/CD Pipeline with GitHub Actions
${T}${T}${T}yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: Deploy to Vercel
        run: npx vercel --prod --token=VERCEL_TOKEN_HERE
${T}${T}${T}

### Environment Variables Best Practice
- Local: ${T}.env.local${T} (never commit this)
- Staging: Separate env config in deployment platform
- Production: Use platform secret manager (Vercel env vars, AWS Secrets Manager)
- Prefix browser-accessible vars with ${T}NEXT_PUBLIC_${T} in Next.js`,

  performance_optimization: () => `## Web Performance Optimisation — Core Web Vitals & Beyond

Google uses Core Web Vitals as a ranking signal. Optimising these improves both SEO and user experience.

### The Three Core Web Vitals

| Metric | What it measures | Good | Poor |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | Loading performance | < 2.5s | > 4.0s |
| **INP** (Interaction to Next Paint) | Responsiveness | < 200ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | Visual stability | < 0.1 | > 0.25 |

### Immediate Wins (Can do today)

**Images — The biggest LCP killer:**
${T}${T}${T}tsx
// ✅ Next.js Image component handles WebP conversion, lazy loading, and size hints
import Image from 'next/image';
<Image src="/hero.jpg" width={1200} height={600} priority alt="Hero" />

// Add size hints to above-fold images to prevent LCP delays
${T}${T}${T}

**Bundle Size:**
${T}${T}${T}bash
npx @next/bundle-analyzer  # Visualise what's in your JS bundle
${T}${T}${T}

Common culprits: ${T}moment.js${T} (use ${T}date-fns${T} instead, 80% smaller), unused ${T}lodash${T} imports, large icon libraries imported entirely.

**Font Loading:**
${T}${T}${T}tsx
// Next.js font optimisation — zero layout shift, preloaded
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], display: 'swap' });
${T}${T}${T}

### Code Splitting
${T}${T}${T}tsx
// Split routes automatically (Next.js does this)
// Split heavy components manually:
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  loading: () => <p>Loading PDF viewer...</p>,
  ssr: false,
});
${T}${T}${T}

### Monitoring
- [PageSpeed Insights](https://pagespeed.web.dev/) — Free Google tool
- [Lighthouse](https://developer.chrome.com/docs/lighthouse) — Chrome DevTools
- [Web Vitals Chrome Extension](https://chrome.google.com/webstore/detail/web-vitals/)`,

  data_structures: () => `## DSA for Frontend Interviews — What You Actually Need

Frontend roles don't require Competitive Programming expertise, but you need to be solid on fundamentals.

### What Companies Actually Ask

**Easy (must solve in < 10 min):**
- Two Sum, Valid Parentheses, Reverse String, FizzBuzz
- Array manipulation, string operations

**Medium (must solve in < 25 min):**
- Sliding Window (max subarray, longest substring without repeating characters)
- Two Pointers (container with most water, 3Sum)
- Hash Map (group anagrams, top K frequent elements)
- Binary Search (search in rotated array)

**Hard (only for FAANG+ senior roles):**
- Dynamic Programming, Graph traversal, Segment Trees

---

### Essential Patterns to Master

**Sliding Window:**
${T}${T}${T}ts
function longestUniqueSubstring(s: string): number {
  const seen = new Map<string, number>();
  let left = 0, max = 0;

  for (let right = 0; right < s.length; right++) {
    if (seen.has(s[right]) && seen.get(s[right])! >= left) {
      left = seen.get(s[right])! + 1;
    }
    seen.set(s[right], right);
    max = Math.max(max, right - left + 1);
  }
  return max;
}
${T}${T}${T}

**HashMap — Frequency Counter:**
${T}${T}${T}ts
function groupAnagrams(strs: string[]): string[][] {
  const map = new Map<string, string[]>();
  for (const s of strs) {
    const key = s.split('').sort().join('');
    map.set(key, [...(map.get(key) ?? []), s]);
  }
  return Array.from(map.values());
}
${T}${T}${T}

### Study Plan
- [NeetCode 150](https://neetcode.io/practice) — best curated problem set
- [LeetCode Blind 75](https://neetcode.io/practice) — minimum required set
- Solve 1 problem daily for 3 months`,

  open_source: () => `## Contributing to Open Source — A Practical Guide

Open source contributions are the single best way to build credibility before you have years of experience.

### Why It Matters for Your Career
- Verifiable proof of your code quality, reviewed by senior engineers
- Real codebase experience (not tutorial-style code)
- Networking with maintainers who can refer you to companies
- GitHub green squares that recruiters see

### How to Find Good First Issues

1. **GitHub search:** ${T}label:"good first issue" language:TypeScript stars:>500${T}
2. **[goodfirstissue.dev](https://goodfirstissue.dev/)** — curated beginner-friendly issues
3. **[up-for-grabs.net](https://up-for-grabs.net/)** — projects seeking contributors
4. **Tools you already use** — Check the issues tab of Next.js, shadcn/ui, Prisma, React Query

### Your First Contribution — Step by Step

${T}${T}${T}bash
# 1. Fork the repo on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/PROJECT.git

# 3. Create a feature branch
git checkout -b fix/correct-typo-in-readme

# 4. Make your change, then commit with conventional commit format
git commit -m "docs: fix typo in installation guide"

# 5. Push and open a PR
git push origin fix/correct-typo-in-readme
${T}${T}${T}

### PR Description Template
${T}${T}${T}markdown
## What does this PR do?
Fixes a typo in the README installation guide.

## Why?
"dependancies" → "dependencies"

## Testing
No code changes — documentation only.
${T}${T}${T}

### Progression Path
1. Start with docs and typos (just to learn the workflow)
2. Fix small bugs (ones you've personally encountered)
3. Implement small features from the roadmap
4. Eventually become a regular contributor and get invited as a maintainer`,

  freelancing: () => `## Freelancing — How to Start and Succeed

Freelancing is a viable income path while you build your product career — or a full-time career in itself.

### Platforms to Start On

| Platform | Best for | Competition |
|---|---|---|
| [Toptal](https://www.toptal.com/) | Senior developers, high rates | Very low (rigorous screening) |
| [Upwork](https://www.upwork.com/) | All levels, wide variety | High |
| [Contra](https://contra.com/) | Independent professionals | Low |
| [LinkedIn + Cold DMs] | Direct clients, no fees | Medium |

### Rate Calculation

${T}${T}${T}
Target monthly income: ₹1,00,000
Billable hours per month: ~80 (20 hours/week × 4 weeks)
Minimum hourly rate: ₹1250/hour (~$15/hour)

But freelancers need a 30–40% buffer for:
- Unpaid administrative time
- Client acquisition time
- Tax (GST, income tax)
- Sick days / vacation

Realistic rate: ₹1800–₹2500/hour (₹15,000–₹25,000/day)
${T}${T}${T}

### Landing Your First Client

1. **Define your niche:** "I build Next.js web apps for SaaS startups" is better than "I do web development."
2. **Create a micro-portfolio:** 1 polished project with a case study (problem → solution → results).
3. **Outreach:** DM 5 startup founders per week on LinkedIn / Twitter with a specific value proposition.
4. **Start with a smaller project:** Propose a paid discovery/audit before a big engagement.

### Freelancer Mistakes to Avoid
- No contract (use [Bonsai Free Contract Templates](https://www.hellobonsai.com/free-freelance-contracts))
- No upfront payment (50% upfront, 50% on delivery)
- Scope creep without a change order
- Building on platforms where clients own all rights to your profile`,

  machine_learning: () => `## AI/ML for Frontend & Web Developers

You don't need a PhD to integrate AI into your web apps. Here is the practical path:

### Tier 1 — AI API Integration (Start Here)
Use existing AI models through APIs — no training needed.

**OpenAI / Gemini / Anthropic APIs:**
${T}${T}${T}ts
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const { text } = await generateText({
  model: google('gemini-2.0-flash'),
  prompt: 'Summarise this resume for ATS optimisation: ' + resumeText,
});
${T}${T}${T}

**Vercel AI SDK** — Best abstraction for streaming AI responses in Next.js.

### Tier 2 — Prompt Engineering
The skill that separates average from great AI integrations:
- **System prompts:** Define the AI's persona, constraints, and output format
- **Few-shot examples:** Show the model 2–3 example inputs and outputs
- **Chain of thought:** Tell the model to "think step by step" for complex reasoning
- **Output format:** Specify JSON schema for structured outputs

### Tier 3 — RAG (Retrieval-Augmented Generation)
When you need AI to answer questions about your own data:
${T}${T}${T}
User question → Embed query → Search vector DB → Fetch relevant chunks
→ Inject into prompt → AI generates answer grounded in your data
${T}${T}${T}

Tools: **Pinecone** (vector DB), **LangChain.js** / **LlamaIndex**, **pgvector** (PostgreSQL extension)

### AI Engineer Roles (2025 Demand)
- **AI Product Engineer:** Build AI-powered features in existing products
- **Prompt Engineer:** Design and optimise prompts for specific use cases
- **ML Ops Engineer:** Deploy, monitor, and maintain ML models in production

### Resources
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [DeepLearning.AI Short Courses](https://www.deeplearning.ai/short-courses/) — Free, practical
- [Hugging Face (open-source models)](https://huggingface.co/)`,

  mobile_dev: () => `## Mobile Development for Web Developers

### React Native — The Natural Choice for React Devs

If you know React, React Native lets you build iOS and Android apps with mostly the same mental model.

**Key differences from web:**
- No ${T}div${T}, ${T}p${T}, ${T}img${T} — use ${T}View${T}, ${T}Text${T}, ${T}Image${T}
- Styles via ${T}StyleSheet.create()${T} or NativeWind (Tailwind for RN)
- Navigation via ${T}React Navigation${T} or ${T}Expo Router${T}

**Expo — The Recommended Starting Point:**
${T}${T}${T}bash
npx create-expo-app MyApp --template
cd MyApp && npx expo start
${T}${T}${T}

Expo handles the native build toolchain so you can focus on JavaScript.

---

### Flutter — Worth Learning?

Flutter uses Dart (not JavaScript) and renders its own UI components — no native widgets. Pros: pixel-perfect UI, single codebase for iOS/Android/web/desktop. Cons: Dart learning curve, larger binary size.

**Verdict:** If you're already a React developer, React Native + Expo is faster to ship. Learn Flutter if you want to diversify.

---

### Cross-Platform in 2025

| Framework | Language | Web Support |
|---|---|---|
| React Native + Expo | JavaScript/TypeScript | Yes (limited) |
| Flutter | Dart | Yes |
| Capacitor + Ionic | HTML/CSS/JS | Yes (best web parity) |

**Capacitor** is worth knowing — it wraps your existing web app in a native shell. Great for teams with an existing React web app that needs an iOS/Android version quickly.`,

  security: () => `## Web Security Essentials Every Developer Must Know

Security vulnerabilities have ended careers and crashed companies. Here is what to know:

### The OWASP Top 10 (Most Common Web Vulnerabilities)

**1. Cross-Site Scripting (XSS)**
Attacker injects malicious scripts that run in other users' browsers.

${T}${T}${T}tsx
// ❌ NEVER do this — direct HTML injection
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ React escapes by default — this is safe
<div>{userInput}</div>
${T}${T}${T}

**2. SQL Injection**
Attacker manipulates your database query through user input.
${T}${T}${T}ts
// ❌ Vulnerable
const query = ${T}SELECT * FROM users WHERE email = '\${email}'${T};

// ✅ Safe — Prisma uses parameterised queries automatically
const user = await prisma.user.findUnique({ where: { email } });
${T}${T}${T}

**3. Broken Authentication**
- Always hash passwords with **bcrypt** (never MD5, SHA-1, or plain text)
- Use short-lived JWTs (15min) + refresh tokens (7 days)
- Implement rate limiting on auth endpoints

**4. CSRF (Cross-Site Request Forgery)**
Use CSRF tokens for state-changing operations (Next.js Server Actions handle this automatically).

---

### Security Checklist for Every Project
- [ ] ${T}HTTPS${T} everywhere — no exceptions
- [ ] Set security headers (use ${T}next/headers${T} or the ${T}helmet${T} package)
- [ ] Validate and sanitise ALL user input before touching the database
- [ ] Store secrets in environment variables, never in code
- [ ] Enable 2FA on GitHub, Vercel, and cloud provider accounts
- [ ] Use ${T}npm audit${T} regularly — ${T}npm audit fix${T} for auto-fixes

### Resources
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) (Free, hands-on labs)`,

  agile_methodology: () => `## Agile & Scrum — What You'll Encounter at Any Tech Company

### The Scrum Framework

Most tech companies use Scrum or a variant. Here is the structure:

**Ceremonies (meetings):**
| Ceremony | Frequency | Purpose |
|---|---|---|
| Sprint Planning | Start of each sprint | Decide what to build in the next 2 weeks |
| Daily Standup | Every morning | 3 questions: what I did, what I'll do, any blockers |
| Sprint Review | End of sprint | Demo what was built to stakeholders |
| Retrospective | End of sprint | What went well, what to improve |

**Artifacts:**
- **Product Backlog** — Prioritised list of everything to build (owned by Product Manager)
- **Sprint Backlog** — What the team commits to building this sprint
- **Increment** — The working software delivered at the end of each sprint

---

### Jira Workflow (Most Common Tool)
${T}${T}${T}
Backlog → To Do → In Progress → In Review → Done
${T}${T}${T}

- Write clear ticket descriptions: acceptance criteria, linked designs, edge cases
- Break large tasks into sub-tasks of < 1 day each
- Update your ticket status daily — this is what standup is based on

---

### Agile Best Practices as a Developer
1. **Estimate honestly** — if you're unsure, say it's risky and needs a spike (investigation task)
2. **Raise blockers early** — don't wait until the sprint review to mention you're stuck
3. **Work in vertical slices** — ship an end-to-end thin slice, not all the backend then all the frontend
4. **Definition of Done** — code reviewed, tests written, deployed to staging, acceptance criteria met

### What Not to Do
- Don't mark a ticket Done if it's not tested
- Don't take on new work mid-sprint without removing something else
- Don't skip retrospectives — they're how teams actually improve`,

  general: (q) => `## Career Coach Response

You asked: *"${q}"*

Here is my analysis and recommendations:

### Understanding Your Question

${q.trim().length > 10
  ? `Your question touches on an important area of your tech career development. Let me provide structured guidance.`
  : `Let me provide some general guidance on advancing your tech career.`}

### Recommended Approach

**1. Research & Foundation**
Start by understanding the core concepts behind your question. Break it down into:
- What specific outcome are you trying to achieve?
- What do you already know, and where is the gap?
- What resources (documentation, courses, mentors) can fill that gap?

**2. Practical Application**
The best way to learn anything in tech is to build something with it:
- Create a small proof-of-concept project
- Deploy it publicly and document what you learned
- Add it to your portfolio with a write-up

**3. Leverage Your Network**
- Search for developers on LinkedIn who have experience in this area
- Join relevant Discord communities (Reactiflux, Next.js Discord, freeCodeCamp)
- Ask specific, detailed questions — vague questions get vague answers

### Immediate Next Step
Share more context about your specific situation — what you're trying to build, your current skill level, and your target role — and I can give you a much more targeted, actionable response.

> 💡 **Pro tip:** The clearer your question, the more specific my answer can be. Try asking about a specific technology, problem, or career stage.`,
};

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateAIResponse(prompt: string, _model: string = MODELS.CAREER_TWIN): Promise<string> {
  // 1. Extract the user's actual message
  const userQuery = extractUserQuery(prompt);

  // 2. Try Gemini API first — if it responds, use that
  const geminiResponse = await tryGeminiAPI(prompt);
  if (geminiResponse) return geminiResponse;

  // 3. Classify intent and return high-quality local response
  const intent = classifyIntent(userQuery);
  const responseFn = RESPONSES[intent];
  return responseFn ? responseFn(userQuery) : RESPONSES.general(userQuery);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateStructuredAIResponse(
  prompt: string,
  systemPrompt: string,
  model: string,
  simulatedPayload?: any,
  fileBase64?: string,
  fileMimeType?: string
): Promise<any> {
  // Try Gemini API with structured JSON output
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY;

  if (geminiApiKey) {
    for (const m of GEMINI_MODELS) {
      try {
        const bodyParts: Record<string, unknown>[] = [];
        if (fileBase64 && fileMimeType) {
          bodyParts.push({ inlineData: { mimeType: fileMimeType, data: fileBase64 } });
        }
        bodyParts.push({ text: prompt });

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: bodyParts }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
                maxOutputTokens: 4096,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            try {
              return JSON.parse(text);
            } catch {
              console.warn(`[AI] Structured response from ${m} was not valid JSON`);
            }
          }
        } else {
          const errorText = await response.text();
          console.warn(`[AI] Structured Gemini model ${m} returned ${response.status}:`, errorText.slice(0, 200));
        }
      } catch (error) {
        console.warn(`[AI] Structured Gemini model ${m} threw:`, error);
      }
    }

    if (simulatedPayload) return simulatedPayload;
  }

  if (!process.env.OPENROUTER_API_KEY && simulatedPayload) {
    await delay(2000);
    return simulatedPayload;
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
    });
    return JSON.parse(completion.choices[0].message.content || "{}");
  } catch (error) {
    console.error("[AI] Structured AI Generation Error:", error);
    throw new Error("Failed to generate structured AI response.");
  }
}
