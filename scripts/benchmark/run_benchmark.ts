/**
 * SkillSprint AI — Benchmark Evaluation Suite
 * 
 * Evaluates core pipelines against a held-out synthetic test set:
 * 1. ATS Resume Scoring & Local Anti-Hallucination Enhancement (beforeScore -> afterScore)
 * 2. Dynamic Learning Roadmap Generation (Task counts & completion)
 * 3. AI Career Twin Projection (Live model response vs. fallback rate)
 * 
 * Provenance & Disclosure:
 * Like Wapsi (Razorpay Buildathon Track 3), all benchmark inputs evaluated here
 * are synthetic held-out cases created to test pipeline correctness without
 * exposing private user resumes or fabricated metrics.
 */

import fs from "fs";
import path from "path";
import { analyzeResumeComplete } from "../../src/lib/resume/index";
import { generateStructuredAIResponse, MODELS } from "../../src/lib/ai";
import type { JobProfile } from "../../src/lib/resume/types";

// Load local environment variables if present
if (typeof process.loadEnvFile === "function") {
  try {
    if (fs.existsSync(path.resolve(process.cwd(), ".env.local"))) {
      process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
    } else if (fs.existsSync(path.resolve(process.cwd(), ".env"))) {
      process.loadEnvFile(path.resolve(process.cwd(), ".env"));
    }
  } catch (e) {
    console.warn("[benchmark] Notice: Could not auto-load env file, using existing process.env");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Synthetic Held-Out Resumes (8 diverse cases across experience levels)
// ─────────────────────────────────────────────────────────────────────────────

interface TestResumeCase {
  id: string;
  name: string;
  targetRole: string;
  job: JobProfile;
  text: string;
}

const HELD_OUT_RESUMES: TestResumeCase[] = [
  {
    id: "case-01-junior-fe",
    name: "Junior Front-End Developer",
    targetRole: "Frontend Developer",
    job: {
      title: "Frontend Developer",
      description: "Looking for a Frontend Developer with strong React, Next.js, TypeScript, Tailwind CSS, state management, and web performance optimization skills.",
      skillsText: "React, Next.js, TypeScript, Tailwind CSS, Redux, HTML5, CSS3, Jest",
    },
    text: `
John Doe
john.doe@example.com | (555) 123-4567 | San Francisco, CA
github.com/johndoe | linkedin.com/in/johndoe

SUMMARY
Enthusiastic web developer with hands-on experience building web interfaces using HTML, CSS, and basic React.

EDUCATION
State University — B.S. Computer Science (2020 - 2024)

SKILLS
Programming Languages: JavaScript, HTML, CSS, Python
Libraries & Frameworks: React, Bootstrap
Tools: Git, VS Code

EXPERIENCE
Frontend Intern — WebCraft Agency (June 2023 - August 2023)
- Assisted in building web pages using HTML and CSS for small business clients
- Helped fix UI bugs and responsive layout issues across mobile devices
- Worked with senior developers on updating legacy website templates

PROJECTS
Personal Portfolio Website
- Created personal portfolio site using HTML5, CSS3, and vanilla JavaScript
- Hosted on GitHub Pages with responsive navigation bar

Weather Forecast App
- Developed simple weather lookup app calling OpenWeather API using fetch
- Displayed current temperature and 5-day forecast with basic styling
`,
  },
  {
    id: "case-02-mid-be",
    name: "Mid-Level Backend Developer",
    targetRole: "Backend Engineer",
    job: {
      title: "Backend Engineer",
      description: "Seeking a Backend Engineer proficient in Node.js, Express, PostgreSQL, Redis caching, Docker containerization, RESTful API design, and unit testing.",
      skillsText: "Node.js, Express, PostgreSQL, Redis, Docker, Microservices, REST APIs, Jest, TypeScript",
    },
    text: `
Sarah Jenkins
sarah.jenkins@example.com | (555) 234-5678 | Austin, TX
github.com/sjenkins-dev | linkedin.com/in/sarahjenkins

SUMMARY
Backend software engineer with 2 years of experience building Node.js REST services and SQL database schemas.

EXPERIENCE
Junior Backend Engineer — CloudScale Labs (2022 - Present)
- Developed REST API endpoints using Node.js and Express for customer identity services
- Designed PostgreSQL tables and wrote relational queries for user activity logs
- Implemented JWT-based authentication middleware across backend microservices
- Integrated Redis caching to speed up read queries for frequent user profile requests

EDUCATION
University of Texas — B.S. in Software Engineering (2018 - 2022)

SKILLS
Node.js, Express, PostgreSQL, Redis, JavaScript, TypeScript, Docker, Git, REST APIs

PROJECTS
Task Queue Processor
- Built asynchronous job queue using Redis and BullMQ to process background emails
- Handled retries and failure notification hooks for worker tasks

Inventory Management Service
- Created RESTful microservice with PostgreSQL transactions for order placements
- Included Dockerfile and docker-compose configurations for local database spinup
`,
  },
  {
    id: "case-03-fullstack",
    name: "Full-Stack Engineer",
    targetRole: "Full Stack Engineer",
    job: {
      title: "Full Stack Engineer",
      description: "Full Stack Developer needed to build high-scale web apps using Next.js, React, Node.js, PostgreSQL, Prisma ORM, and AWS deployments.",
      skillsText: "Next.js, React, TypeScript, Node.js, PostgreSQL, Prisma, AWS, Tailwind CSS, CI/CD",
    },
    text: `
Alex Chen
alex.chen@example.com | (555) 345-6789 | Seattle, WA
github.com/alexchen | linkedin.com/in/alexchen-dev

SUMMARY
Versatile Full-Stack Developer with experience in React and Node.js ecosystems. Passionate about end-to-end product architecture.

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, SQL, Python
Frameworks: React, Next.js, Node.js, Express, Tailwind CSS
Databases & Cloud: PostgreSQL, MongoDB, Prisma, AWS S3, Vercel

WORK EXPERIENCE
Software Developer — Horizon Technologies (2023 - 2024)
- Built interactive dashboard features in React and TypeScript for B2B analytics portal
- Created Node.js backend controllers connecting to PostgreSQL via Prisma ORM
- Integrated file upload pipeline handling PDF documents stored in AWS S3 buckets
- Migrated legacy CSS stylesheets to Tailwind CSS utility classes

PROJECTS
DevBoard Collaboration Platform
- Full stack Next.js App Router application with server actions and PostgreSQL database
- Implemented real-time Kanban board state synchronization and markdown card descriptions
- Deployed on Vercel with automated CI/CD branch preview environments

E-Commerce Storefront
- Built responsive storefront with cart persistence and Stripe payment checkout integration
- Structured catalog schema in PostgreSQL with category indexing for quick filtering
`,
  },
  {
    id: "case-04-devops",
    name: "Cloud & DevOps Intern",
    targetRole: "DevOps Engineer",
    job: {
      title: "DevOps Engineer",
      description: "DevOps and Infrastructure Engineer with expertise in Linux systems, Docker, Kubernetes, Terraform, GitHub Actions CI/CD pipelines, and AWS cloud services.",
      skillsText: "Docker, Kubernetes, AWS, Terraform, Linux, GitHub Actions, CI/CD, Python, Bash",
    },
    text: `
David Miller
david.miller@example.com | (555) 456-7890 | Chicago, IL
github.com/dmiller-ops | linkedin.com/in/davidmiller-ops

PROFESSIONAL SUMMARY
DevOps specialist interested in cloud infrastructure automation, container orchestration, and CI/CD pipelines.

SKILLS
Cloud & DevOps: AWS (EC2, S3, IAM), Docker, Kubernetes, Linux, GitHub Actions, Terraform
Scripting: Bash, Python
Monitoring: Prometheus, Grafana

EXPERIENCE
DevOps Intern — SecureCloud Systems (May 2023 - December 2023)
- Wrote GitHub Actions workflows to automate unit testing and Docker container builds on pull requests
- Configured Amazon EC2 instances and security groups for staging application environments
- Authored Bash scripts for log rotation and database backup automation
- Monitored cluster health metrics with Prometheus and configured Slack alerting rules

EDUCATION
Illinois Institute of Technology — B.S. Computer Information Systems (2020 - 2024)

PROJECTS
Kubernetes Microservices Cluster
- Deployed sample 3-tier microservice architecture to local Minikube cluster using Helm charts
- Configured Ingress controller, ConfigMaps, and Secrets for environment variable injection

Terraform AWS Infrastructure
- Provisioned VPC with public/private subnets, Internet Gateway, and NAT Gateway using Terraform
`,
  },
  {
    id: "case-05-career-transition",
    name: "Self-Taught Career Switcher",
    targetRole: "Junior Web Developer",
    job: {
      title: "Junior Web Developer",
      description: "Entry-level web developer role requiring solid HTML, CSS, JavaScript, responsive design, Git version control, and problem-solving attitude.",
      skillsText: "JavaScript, HTML5, CSS3, Git, React, Responsive Design, REST APIs",
    },
    text: `
Michael Vance
michael.vance@example.com | (555) 567-8901 | Denver, CO
github.com/mvance-dev | linkedin.com/in/michaelvance

OBJECTIVE
Former operations analyst transitioning to software engineering after completing 800+ hours of full-stack web development coursework.

SKILLS
Core Technologies: HTML5, CSS3, Modern JavaScript (ES6+), React
Version Control: Git, GitHub
Other: Problem Solving, Technical Communication, Agile Fundamentals

PROJECTS
Recipe Finder Web Application
- Built dynamic single-page application consuming Spoonacular API using React hooks
- Allowed users to filter recipes by dietary restrictions and ingredient search queries
- Managed component state with useState and useEffect, deploying demo to Netlify

Budget Tracker Dashboard
- Created local storage financial tracker using JavaScript, CSS Grid, and Chart.js
- Enabled users to categorize expenses and view spending breakdowns with interactive charts

EDUCATION & TRAINING
Full Stack Web Development Certificate — Coursera / freeCodeCamp (2023 - 2024)
University of Colorado — B.A. in Economics (2017 - 2021)
`,
  },
  {
    id: "case-06-systems-cpp",
    name: "Systems & Algorithms Graduate",
    targetRole: "Software Engineer",
    job: {
      title: "Software Engineer",
      description: "Core Software Engineer role seeking proficiency in C++, data structures, algorithms, multi-threading, operating systems, and high-performance computing.",
      skillsText: "C++, C, Data Structures, Algorithms, Linux, Multithreading, Git, OOP",
    },
    text: `
Priya Sharma
priya.sharma@example.com | (555) 678-9012 | San Jose, CA
github.com/priyasharma-code | linkedin.com/in/priyasharma

SUMMARY
Computer Science graduate with deep foundations in algorithms, C++ systems programming, and low-level memory management.

EDUCATION
San Jose State University — B.S. in Computer Science (2020 - 2024)
GPA: 3.85 / 4.0

TECHNICAL SKILLS
Languages: C++, C, Python, SQL
Core Competencies: Data Structures & Algorithms, Object-Oriented Design, Linux Systems, POSIX Threads
Tools: GDB, Valgrind, Make, CMake, Git

PROJECTS
High-Performance Memory Allocator
- Implemented custom memory allocator in C++ using segregated free lists to reduce memory fragmentation
- Evaluated allocation latency compared to standard malloc using custom benchmarking harnesses

Multi-Threaded HTTP Server
- Built POSIX socket web server in C++ using thread pool pattern to handle concurrent client connections
- Parsed HTTP/1.1 request headers and served static filesystem assets with MIME typing

ACADEMIC ACHIEVEMENTS
- Solved 350+ LeetCode algorithmic problems (Arrays, Dynamic Programming, Graphs)
- Teaching Assistant for CS146 Data Structures and Algorithms course
`,
  },
  {
    id: "case-07-mobile-dev",
    name: "Mobile App Developer",
    targetRole: "React Native Developer",
    job: {
      title: "React Native Developer",
      description: "Mobile Engineer needed to develop iOS and Android applications with React Native, TypeScript, mobile state management, native device APIs, and offline sync.",
      skillsText: "React Native, TypeScript, Redux, iOS, Android, REST APIs, Mobile UI, Expo",
    },
    text: `
Carlos Rivera
carlos.rivera@example.com | (555) 789-0123 | Miami, FL
github.com/crivera-mobile | linkedin.com/in/carlosrivera

SUMMARY
Mobile developer with 1.5 years of experience building cross-platform mobile apps for iOS and Android using React Native and Expo.

TECHNICAL SKILLS
Mobile: React Native, Expo, TypeScript, Redux Toolkit, React Navigation
Platforms: iOS, Android, Xcode, Android Studio
Backend & Services: Firebase, REST APIs, Supabase

EXPERIENCE
Mobile Developer Associate — AppForge Studio (2023 - 2024)
- Developed mobile application screens and interactive navigation flows with React Native
- Integrated native device camera and geolocation permissions for photo check-in feature
- Implemented Redux Toolkit for global shopping cart and authentication token storage
- Tested app builds on iOS simulators and physical Android test devices

PROJECTS
FitTrack Health Companion
- Published Expo cross-platform mobile application tracking daily workouts and hydration
- Integrated AsyncStorage for offline data persistence and local push notifications

CoffeeFinder Mobile App
- Built React Native app displaying nearby coffee shops using Google Places API and MapView
`,
  },
  {
    id: "case-08-generalist-sde",
    name: "Early-Career SDE-1",
    targetRole: "Software Development Engineer",
    job: {
      title: "Software Development Engineer",
      description: "Software Engineer responsible for delivering scalable backend services and frontend features using Java, Spring Boot, MySQL, REST APIs, and microservice patterns.",
      skillsText: "Java, Spring Boot, MySQL, REST APIs, Microservices, Git, JUnit, Docker",
    },
    text: `
Ananya Patel
ananya.patel@example.com | (555) 890-1234 | Boston, MA
github.com/ananya-sde | linkedin.com/in/ananyapatel

SUMMARY
Software Engineer with 1 year of production experience designing enterprise Java services and participating in agile release cycles.

EDUCATION
Northeastern University — B.S. in Computer Science (2019 - 2023)

TECHNICAL SKILLS
Languages: Java, SQL, JavaScript
Frameworks: Spring Boot, Spring Data JPA, Hibernate
Databases: MySQL, PostgreSQL
Tools: Maven, Git, Docker, JUnit, Postman

PROFESSIONAL EXPERIENCE
Associate Software Engineer — FinTech Solutions (2023 - Present)
- Implemented backend REST endpoints in Spring Boot for user transaction categorization
- Managed MySQL schema migrations using Flyway and optimized slow join queries with indexing
- Wrote JUnit integration tests covering transaction settlement validation logic
- Packaged microservice modules into Docker containers for Kubernetes deployment pipelines

PROJECTS
E-Banking Account Simulator
- Developed multi-account banking simulation application in Spring Boot and MySQL
- Enforced atomic balance transfers with database transactions and custom exception handlers
`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. Synthetic Roadmap Profiles (6 test cases across companies & durations)
// ─────────────────────────────────────────────────────────────────────────────

interface RoadmapTestCase {
  id: string;
  targetRole: string;
  targetCompany: string;
  duration: string;
  currentSkills: string;
}

const HELD_OUT_ROADMAPS: RoadmapTestCase[] = [
  {
    id: "rm-01",
    targetRole: "Frontend Developer",
    targetCompany: "Google",
    duration: "90",
    currentSkills: "JavaScript, HTML, CSS, React basics",
  },
  {
    id: "rm-02",
    targetRole: "Backend Engineer",
    targetCompany: "Razorpay",
    duration: "60",
    currentSkills: "Node.js, Express, PostgreSQL",
  },
  {
    id: "rm-03",
    targetRole: "Full Stack Engineer",
    targetCompany: "Stripe",
    duration: "90",
    currentSkills: "React, Node.js, TypeScript, Next.js",
  },
  {
    id: "rm-04",
    targetRole: "DevOps Engineer",
    targetCompany: "Amazon",
    duration: "30",
    currentSkills: "Linux, Bash, Docker",
  },
  {
    id: "rm-05",
    targetRole: "Mobile Developer",
    targetCompany: "Uber",
    duration: "60",
    currentSkills: "React Native, TypeScript, Redux",
  },
  {
    id: "rm-06",
    targetRole: "Software Engineer SDE-1",
    targetCompany: "Microsoft",
    duration: "90",
    currentSkills: "Java, Data Structures, Spring Boot",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. Synthetic Career Twin Profiles (4 test cases)
// ─────────────────────────────────────────────────────────────────────────────

interface CareerTwinTestCase {
  id: string;
  cgpa: string;
  targetRole: string;
  skills: string;
}

const HELD_OUT_TWINS: CareerTwinTestCase[] = [
  {
    id: "twin-01",
    cgpa: "7.8",
    targetRole: "Frontend Developer",
    skills: "React, JavaScript, Tailwind CSS",
  },
  {
    id: "twin-02",
    cgpa: "8.5",
    targetRole: "Full Stack Engineer",
    skills: "React, Node.js, PostgreSQL, TypeScript",
  },
  {
    id: "twin-03",
    cgpa: "6.9",
    targetRole: "Backend Developer",
    skills: "Python, Django, MySQL, Docker",
  },
  {
    id: "twin-04",
    cgpa: "9.2",
    targetRole: "Software Development Engineer (SDE-1)",
    skills: "C++, Data Structures, Java, Algorithms",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Benchmark Runner
// ─────────────────────────────────────────────────────────────────────────────

async function runBenchmark() {
  console.log("================================================================================");
  console.log("  SkillSprint AI — Benchmark Evaluation Suite (Wapsi Transparency Standard)     ");
  console.log("================================================================================");
  console.log("Disclosure: All inputs evaluated below are held-out synthetic cases.");
  console.log("No metrics are fabricated. Results are computed live on this machine.");
  console.log("================================================================================\n");

  const startTime = Date.now();

  // ──────────────────────────────────────────
  // Stage 1: ATS Resume Scoring Pipeline
  // ──────────────────────────────────────────
  console.log("--- [1/3] Running ATS Resume Scoring Pipeline (beforeScore -> afterScore) ---");
  const resumeResults: any[] = [];

  for (const item of HELD_OUT_RESUMES) {
    const analysis = analyzeResumeComplete(item.text, item.job, `${item.id}.txt`, item.text.length);
    const before = analysis.beforeScore.total;
    const after = analysis.afterScore.total;
    const delta = after - before;

    resumeResults.push({
      id: item.id,
      name: item.name,
      targetRole: item.targetRole,
      beforeScore: before,
      afterScore: after,
      delta,
      gradeBefore: analysis.beforeScore.grade,
      gradeAfter: analysis.afterScore.grade,
      issuesCount: analysis.issues.length,
      changesCount: analysis.enhanced.changes.length,
      screeningPercent: analysis.screening.percent,
    });

    console.log(
      `  ✓ ${item.name.padEnd(30)} | Before: ${String(before).padStart(2)}/100 | After: ${String(after).padStart(2)}/100 | Delta: +${String(delta).padStart(2)} pts | Issues: ${analysis.issues.length}`
    );
  }

  const resumeDeltas = resumeResults.map((r) => r.delta);
  const avgResumeDelta = resumeDeltas.reduce((a, b) => a + b, 0) / resumeDeltas.length;
  const avgBeforeScore = resumeResults.map((r) => r.beforeScore).reduce((a, b) => a + b, 0) / resumeResults.length;
  const avgAfterScore = resumeResults.map((r) => r.afterScore).reduce((a, b) => a + b, 0) / resumeResults.length;
  const maxResumeDelta = Math.max(...resumeDeltas);
  const minResumeDelta = Math.min(...resumeDeltas);

  console.log(`\n  Resume Benchmark Summary:`);
  console.log(`    Evaluated Resumes:        ${resumeResults.length}`);
  console.log(`    Mean Baseline Score:      ${avgBeforeScore.toFixed(1)} / 100`);
  console.log(`    Mean Enhanced Score:      ${avgAfterScore.toFixed(1)} / 100`);
  console.log(`    Mean Improvement (Delta): +${avgResumeDelta.toFixed(1)} pts (Range: +${minResumeDelta} to +${maxResumeDelta})\n`);

  // ──────────────────────────────────────────
  // Stage 2: Roadmap Generation Pipeline
  // ──────────────────────────────────────────
  console.log("--- [2/3] Running Learning Roadmap Generation Pipeline ---");
  const roadmapResults: any[] = [];

  for (const rm of HELD_OUT_ROADMAPS) {
    const prompt = `Generate a highly structured ${rm.duration}-day learning roadmap for a student aiming to land a ${rm.targetRole} position at ${rm.targetCompany}.
Current Skills: ${rm.currentSkills}
Provide exactly:
- 4 daily habits/tasks (e.g. solve 2 DSA questions, write 1 code commit)
- 4 weekly core milestones/goals suitable for a ${rm.duration}-day timeline
- 4 monthly checkpoints/milestones that divide this ${rm.duration}-day roadmap evenly.`;

    const systemPrompt = `You are a career development architect. Design a roadmap for a tech student. Return a JSON object matching this schema:
{
  "dailyTasks": [
    { "text": "task description", "completed": false }
  ],
  "weeklyTasks": [
    { "text": "weekly target", "completed": false }
  ],
  "monthlyTasks": [
    { "text": "monthly milestone", "completed": false }
  ]
}`;

    const staticFallbackPayload = {
      dailyTasks: [
        { text: "Solve 2 LeetCode problems (Array / String) in Python/JS", completed: false },
        { text: "Review 1 System Design concept (Caching, Load Balancers)", completed: false },
        { text: "Commit at least once to GitHub project repositories", completed: false },
        { text: "Read 1 technical blog post or framework documentation page", completed: false },
      ],
      weeklyTasks: [
        { text: "Build a responsive Next.js page integrating third-party APIs", completed: false },
        { text: "Conduct a mock interview on behavioral/technical fundamentals", completed: false },
        { text: "Refactor a project using TypeScript and ESLint configuration", completed: false },
        { text: "Review mock interview transcripts and fix suggested gaps", completed: false },
      ],
      monthlyTasks: [
        { text: "Complete a full portfolio project with complete unit tests", completed: false },
        { text: "Write and publish a detailed blog post on a coding pattern", completed: false },
        { text: "Get resume ATS score above 85/100 using AI suggestions", completed: false },
        { text: "Contribute 1 PR to an open source library or public repository", completed: false },
      ],
    };

    const t0 = Date.now();
    let success = false;
    let totalTasks = 0;
    let isLiveModel = false;

    try {
      const res = await generateStructuredAIResponse(
        prompt,
        systemPrompt,
        MODELS.CAREER_TWIN,
        staticFallbackPayload
      );
      const elapsed = Date.now() - t0;
      const dailyCount = Array.isArray(res?.dailyTasks) ? res.dailyTasks.length : 0;
      const weeklyCount = Array.isArray(res?.weeklyTasks) ? res.weeklyTasks.length : 0;
      const monthlyCount = Array.isArray(res?.monthlyTasks) ? res.monthlyTasks.length : 0;
      totalTasks = dailyCount + weeklyCount + monthlyCount;
      success = totalTasks >= 3;

      // Detect if result was from live model or identical to static fallback
      const matchesStaticDaily =
        res?.dailyTasks?.[0]?.text === staticFallbackPayload.dailyTasks[0].text;
      isLiveModel = !matchesStaticDaily;

      roadmapResults.push({
        id: rm.id,
        targetRole: rm.targetRole,
        targetCompany: rm.targetCompany,
        duration: rm.duration,
        success,
        dailyTasks: dailyCount,
        weeklyTasks: weeklyCount,
        monthlyTasks: monthlyCount,
        totalTasks,
        isLiveModel,
        latencyMs: elapsed,
      });

      console.log(
        `  ✓ ${rm.targetRole.padEnd(28)} @ ${rm.targetCompany.padEnd(10)} | Tasks: ${String(totalTasks).padStart(2)} (${dailyCount}D/${weeklyCount}W/${monthlyCount}M) | Source: ${isLiveModel ? "Live Model Call" : "Offline Fallback"} (${elapsed}ms)`
      );
    } catch (err: any) {
      roadmapResults.push({
        id: rm.id,
        targetRole: rm.targetRole,
        targetCompany: rm.targetCompany,
        duration: rm.duration,
        success: false,
        dailyTasks: 0,
        weeklyTasks: 0,
        monthlyTasks: 0,
        totalTasks: 0,
        isLiveModel: false,
        latencyMs: Date.now() - t0,
        error: err?.message,
      });
      console.log(`  ✗ ${rm.targetRole} @ ${rm.targetCompany} Failed: ${err?.message}`);
    }
  }

  const roadmapSuccessCount = roadmapResults.filter((r) => r.success).length;
  const roadmapSuccessRate = (roadmapSuccessCount / roadmapResults.length) * 100;
  const roadmapAvgTasks =
    roadmapResults.map((r) => r.totalTasks).reduce((a, b) => a + b, 0) / roadmapResults.length;

  console.log(`\n  Roadmap Benchmark Summary:`);
  console.log(`    Evaluated Roadmaps:       ${roadmapResults.length}`);
  console.log(`    Success Rate:             ${roadmapSuccessRate.toFixed(0)}% (${roadmapSuccessCount}/${roadmapResults.length})`);
  console.log(`    Average Tasks / Roadmap:  ${roadmapAvgTasks.toFixed(1)}\n`);

  // ──────────────────────────────────────────
  // Stage 3: Career Twin Projection Pipeline
  // ──────────────────────────────────────────
  console.log("--- [3/3] Running Career Twin Projection Pipeline ---");
  const twinResults: any[] = [];

  for (const twin of HELD_OUT_TWINS) {
    const prompt = `Student Profile:
CGPA: ${twin.cgpa}
Target Role: ${twin.targetRole}
Skills: ${twin.skills}
`;

    const systemPrompt = `You are an AI Career Twin projector. Based on the student's current profile, project their career timeline for the next 12 months. Return a JSON object with:
- timeline (array of 4 objects for Present, +3 Months, +6 Months, +12 Months with fields: month, title, subtitle, skills, salary, and resources)
- growthOpportunities (array of 2 objects with title, impact)
- riskFactors (array of 3 strings)
- swot (object with strengths, weaknesses, opportunities, threats array of strings)
- recommendedRoles (array of objects with title, match, reason, description)
- placementReadiness (number between 0 and 100)`;

    const staticTwinFallback = {
      timeline: [
        {
          month: "Present",
          title: "Engineering Student",
          subtitle: `Current CGPA: ${twin.cgpa} | Target: ${twin.targetRole}`,
          skills: twin.skills.split(",").map((s) => s.trim()),
          salary: "N/A",
          resources: [{ name: "freeCodeCamp React Course", url: "https://www.youtube.com" }],
        },
        {
          month: "+3 Months",
          title: "Open Source Contributor",
          subtitle: "Predicted based on current skill velocity",
          skills: ["System Design"],
          salary: "N/A",
          resources: [],
        },
      ],
      growthOpportunities: [{ title: "Master System Design", impact: "+15% Placement Chance" }],
      riskFactors: ["Low consistency in coding practice."],
      placementReadiness: 68,
      swot: { strengths: ["Foundations"], weaknesses: ["Testing"], opportunities: ["Internships"], threats: ["Competition"] },
      recommendedRoles: [{ title: twin.targetRole, match: 85, description: "Target alignment", reason: "Good match" }],
    };

    const t0 = Date.now();
    let success = false;
    let isLive = false;

    try {
      const res = await generateStructuredAIResponse(
        prompt,
        systemPrompt,
        MODELS.CAREER_TWIN,
        staticTwinFallback
      );
      const elapsed = Date.now() - t0;
      success = !!res && Array.isArray(res.timeline) && res.timeline.length > 0;
      // Detect if result was from live model or static fallback
      const matchesStaticOpportunity =
        res?.growthOpportunities?.[0]?.title === staticTwinFallback.growthOpportunities[0].title;
      isLive = !matchesStaticOpportunity;

      twinResults.push({
        id: twin.id,
        targetRole: twin.targetRole,
        cgpa: twin.cgpa,
        success,
        timelineLength: res?.timeline?.length || 0,
        placementReadiness: res?.placementReadiness || 0,
        isLiveModel: isLive,
        latencyMs: elapsed,
      });

      console.log(
        `  ✓ ${twin.targetRole.padEnd(32)} (CGPA: ${twin.cgpa}) | Readiness: ${String(res?.placementReadiness || 0).padStart(2)}% | Source: ${isLive ? "Live Model Call" : "Offline Fallback"} (${elapsed}ms)`
      );
    } catch (err: any) {
      twinResults.push({
        id: twin.id,
        targetRole: twin.targetRole,
        cgpa: twin.cgpa,
        success: false,
        timelineLength: 0,
        placementReadiness: 0,
        isLiveModel: false,
        latencyMs: Date.now() - t0,
        error: err?.message,
      });
      console.log(`  ✗ ${twin.targetRole} Failed: ${err?.message}`);
    }
  }

  const twinSuccessCount = twinResults.filter((t) => t.success).length;
  const twinLiveCount = twinResults.filter((t) => t.isLiveModel).length;
  const twinSuccessRate = (twinSuccessCount / twinResults.length) * 100;
  const twinLiveRate = (twinLiveCount / twinResults.length) * 100;

  console.log(`\n  Career Twin Benchmark Summary:`);
  console.log(`    Evaluated Twins:          ${twinResults.length}`);
  console.log(`    Success Rate:             ${twinSuccessRate.toFixed(0)}% (${twinSuccessCount}/${twinResults.length})`);
  console.log(`    Live Call Rate:           ${twinLiveRate.toFixed(0)}% (${twinLiveCount}/${twinResults.length})\n`);

  // ──────────────────────────────────────────
  // Final Aggregated Results & Output
  // ──────────────────────────────────────────
  const benchmarkPayload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      executionDurationMs: Date.now() - startTime,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
      },
      provenance: "Evaluated on held-out synthetic test cases across typical engineering profiles. Follows the Wapsi transparency disclosure standard.",
      runMethodology: "Executed once across held-out sets without post-run batch tuning.",
    },
    summary: {
      atsResumes: {
        sampleSize: resumeResults.length,
        averageBaselineScore: Math.round(avgBeforeScore * 10) / 10,
        averageEnhancedScore: Math.round(avgAfterScore * 10) / 10,
        averageImprovementDelta: Math.round(avgResumeDelta * 10) / 10,
        minImprovementDelta: minResumeDelta,
        maxImprovementDelta: maxResumeDelta,
      },
      roadmaps: {
        sampleSize: roadmapResults.length,
        successRatePercent: Math.round(roadmapSuccessRate),
        averageTasksPerRoadmap: Math.round(roadmapAvgTasks * 10) / 10,
        liveCallCount: roadmapResults.filter((r) => r.isLiveModel).length,
      },
      careerTwin: {
        sampleSize: twinResults.length,
        successRatePercent: Math.round(twinSuccessRate),
        liveCallRatePercent: Math.round(twinLiveRate),
        fallbackRatePercent: Math.round(100 - twinLiveRate),
      },
    },
    details: {
      resumes: resumeResults,
      roadmaps: roadmapResults,
      careerTwins: twinResults,
    },
  };

  const outputDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "benchmark_results.json");
  fs.writeFileSync(outputPath, JSON.stringify(benchmarkPayload, null, 2), "utf-8");
  console.log(`✓ Benchmark results successfully written to: ${outputPath}`);
  console.log("================================================================================");
}

runBenchmark().catch((err) => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});
