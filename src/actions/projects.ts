"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

export type RecommendedProject = {
  projectName: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  timeRequired: string;
  technologies: string[];
  resumeValue: number;
  portfolioValue: number;
  githubValue: number;
  hiringImpact: number;
  companiesWhereUseful: string[];
  skillsGained: string[];
  expectedInterviewQuestions: { question: string; answerKey: string }[];
  learningOutcome: string;
  businessValue: string;
  estimatedCompletionTime: string;
};

export type ProjectRoadmap = {
  projectName: string;
  architecture: {
    pattern: string;
    description: string;
    diagramDescription: string;
  };
  folderStructure: Record<string, any>;
  databaseDesign: {
    provider: string;
    schemas: { table: string; columns: string[]; relations?: string[] }[];
  };
  apiDesign: {
    endpoints: { method: string; path: string; request?: string; response: string; description: string }[];
  };
  authStrategy: {
    provider: string;
    flowDescription: string;
    scopes: string[];
  };
  weeklyRoadmap: {
    week: number;
    goal: string;
    deliverable: string;
    days: { day: number; task: string; resources: { name: string; url: string }[] }[];
  }[];
  commonMistakes: string[];
  expectedDeliverables: string[];
  readmeTemplate: string;
  resumeBulletPoints: string[];
  linkedinPostDraft: string;
  demoVideoChecklist: string[];
  interviewPrep: {
    behavioralQuestions: string[];
    technicalDeepDives: string[];
  };
};

/**
 * Audit current user profile and codebases to detect missing engineering domains
 */
export async function detectProjectGaps(userId: string): Promise<string[]> {
  const profile = await db.getProfileByUserId(userId);
  const githubAccount = await db.getGitHubAccountByUserId(userId);
  const resume = await db.getLatestResumeAnalysis(userId);

  const skills = new Set<string>((profile?.skills as string[] || []).map((s: string) => s.toLowerCase()));
  if (githubAccount?.email) {
    // Add languages used on github
    const githubAnalysis = await db.getLatestGitHubAnalysis(userId);
    const languages = (githubAnalysis?.languagesUsed as { name: string }[]) || [];
    languages.forEach(l => skills.add(l.name.toLowerCase()));
  }

  const allPossibleGaps = [
    { name: "Authentication", triggerSkills: ["auth", "jwt", "oauth", "clerk", "passport"] },
    { name: "Payments Integration", triggerSkills: ["stripe", "payment", "razorpay", "paypal"] },
    { name: "Containerization & Docker", triggerSkills: ["docker", "container", "kubernetes", "k8s"] },
    { name: "CI/CD Automations", triggerSkills: ["cicd", "github actions", "circleci", "jenkins", "pipelines"] },
    { name: "In-Memory Databases & Caching (Redis)", triggerSkills: ["redis", "cache", "memcached"] },
    { name: "GraphQL APIs", triggerSkills: ["graphql", "apollo", "query language"] },
    { name: "Realtime Systems & WebSockets", triggerSkills: ["websocket", "socket.io", "websockets", "realtime"] },
    { name: "Cloud Architectures (AWS/GCP)", triggerSkills: ["aws", "gcp", "azure", "cloud", "lambda", "s3"] },
    { name: "Microservices Architectures", triggerSkills: ["microservices", "grpc", "message queue", "rabbitmq", "kafka"] },
    { name: "Unit & Integration Testing", triggerSkills: ["testing", "jest", "cypress", "mocha", "playwright", "tdd"] },
    { name: "Generative AI & LLMs (RAG)", triggerSkills: ["ai", "llm", "rag", "openai", "gemini", "langchain", "vector"] },
    { name: "Voice AI & Audio Streams", triggerSkills: ["voice", "audio", "speech", "whisper"] },
    { name: "Computer Vision", triggerSkills: ["opencv", "yolo", "vision", "image processing"] },
    { name: "Data Visualization & Dashboards", triggerSkills: ["d3", "recharts", "chart.js", "charts"] },
    { name: "Performance Optimization", triggerSkills: ["lighthouse", "performance", "caching", "optimization", "lazy load"] },
    { name: "Security Auditing", triggerSkills: ["security", "owasp", "encryption", "helmet", "cors"] }
  ];

  const detectedGaps: string[] = [];

  allPossibleGaps.forEach(gap => {
    const hasSkill = gap.triggerSkills.some(ts => {
      // Check skills array
      if (skills.has(ts)) return true;
      // Check resume weak bullet points or suggestions
      if (resume) {
        const resumeText = JSON.stringify(resume).toLowerCase();
        if (resumeText.includes(ts)) return false; // candidate is already aware / has it
      }
      return false;
    });

    if (!hasSkill) {
      detectedGaps.push(gap.name);
    }
  });

  return detectedGaps.slice(0, 5); // Return top 5 missing gaps
}

/**
 * Generate 3 personalized project recommendations designed to fill user gaps
 */
export async function getPersonalizedRecommendations(): Promise<RecommendedProject[]> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await db.getProfileByUserId(user.id);
  const targetRole = profile?.targetRole || "Software Developer";
  const gaps = await detectProjectGaps(user.id);

  const prompt = `Candidate Profile:
  Target Role: ${targetRole}
  Current Skills: ${profile?.skills?.join(", ")}
  Detected Gap Areas: ${gaps.join(", ")}
  
  Generate exactly 3 project recommendations to fill these gaps. Do NOT suggest generic projects like Todo App, Netflix clone, or Weather App. Recommend engineering-heavy, unique project concepts (e.g. Distributed Log aggregator, Secure WebSocket Chat Server, RAG Document Engine).`;

  const systemPrompt = `You are a Principal AI Architect and recruiter. Generate 3 unique project recommendations. Return a JSON object with:
  {
    "projects": [
      {
        "projectName": "string",
        "difficulty": "Beginner" | "Intermediate" | "Advanced",
        "timeRequired": "string (e.g., 3 weeks)",
        "technologies": ["string"],
        "resumeValue": number (80-99),
        "portfolioValue": number (80-99),
        "githubValue": number (80-99),
        "hiringImpact": number (80-99),
        "companiesWhereUseful": ["string"],
        "skillsGained": ["string"],
        "expectedInterviewQuestions": [
          { "question": "string", "answerKey": "string" }
        ],
        "learningOutcome": "string",
        "businessValue": "string",
        "estimatedCompletionTime": "string"
      }
    ]
  }`;

  const simulatedPayload: { projects: RecommendedProject[] } = {
    projects: [
      {
        projectName: `Distributed Realtime Analytics Dashboard`,
        difficulty: "Advanced",
        timeRequired: "4 weeks",
        technologies: ["Node.js", "Redis", "Docker", "Apache Kafka", "Recharts", "WebSockets"],
        resumeValue: 95,
        portfolioValue: 92,
        githubValue: 96,
        hiringImpact: 94,
        companiesWhereUseful: ["Uber", "Confluent", "Netflix", "Fintech companies"],
        skillsGained: ["Realtime streams", "Pub/Sub message queues", "Docker orchestration", "Memory caching optimization"],
        expectedInterviewQuestions: [
          { question: "How does Redis handle WebSocket connection load balancing?", answerKey: "Using Redis Pub/Sub backplane to broadcast messages across isolated WebSocket instances." },
          { question: "What is backpressure and how do you handle it in event streaming?", answerKey: "Backpressure occurs when consumer speeds fall below producer feeds. Handled via queue buffers and throttle limits." }
        ],
        learningOutcome: "Build a realtime dashboard consuming and containerizing large streaming logs.",
        businessValue: "Empowers companies to analyze clickstream actions and database updates instantly under 50ms latency.",
        estimatedCompletionTime: "35 hours"
      },
      {
        projectName: `Gemini AI-Powered RAG Knowledge Base`,
        difficulty: "Intermediate",
        timeRequired: "3 weeks",
        technologies: ["Next.js", "TypeScript", "Python", "Vector Databases", "Gemini API", "LangChain"],
        resumeValue: 92,
        portfolioValue: 90,
        githubValue: 94,
        hiringImpact: 91,
        companiesWhereUseful: ["OpenAI", "Cohere", "SaaS platforms", "Enterprise software firms"],
        skillsGained: ["Vector embeddings", "Semantic Search", "LLM Prompt engineering", "RAG architectures"],
        expectedInterviewQuestions: [
          { question: "What is the difference between keyword searches and semantic vector searches?", answerKey: "Semantic search uses high-dimensional embeddings to capture conceptual intent, whereas keyword matching relies on text spelling." }
        ],
        learningOutcome: "Deliver an AI chatbot query tool that scans context from private PDF uploads.",
        businessValue: "Reduces customer success overhead by answering questions from corporate documents with 90% accuracy.",
        estimatedCompletionTime: "24 hours"
      },
      {
        projectName: `Secure Microservice Gateway & Auth Server`,
        difficulty: "Advanced",
        timeRequired: "3 weeks",
        technologies: ["Go", "Docker", "JWT", "OAuth 2.0", "Jest", "CI/CD (GitHub Actions)"],
        resumeValue: 93,
        portfolioValue: 88,
        githubValue: 95,
        hiringImpact: 92,
        companiesWhereUseful: ["Stripe", "Auth0", "Paypal", "Enterprise Cloud providers"],
        skillsGained: ["Reverse proxies", "OAuth flows", "AES-256 token encryption", "GitHub actions CI/CD"],
        expectedInterviewQuestions: [
          { question: "Explain the difference between OAuth authorization code flow and client credentials flow.", answerKey: "Authorization code flow involves user interaction to log in, whereas client credentials flow is for machine-to-machine sync." }
        ],
        learningOutcome: "Architect a secure proxy routing client calls to back-end endpoints with JWT controls.",
        businessValue: "Secures internal API structures from OWASP Top 10 exploits, preventing injection and credential breaches.",
        estimatedCompletionTime: "28 hours"
      }
    ]
  };

  try {
    const aiResult = await generateStructuredAIResponse(
      prompt,
      systemPrompt,
      MODELS.RESUME_ANALYSIS,
      simulatedPayload
    );
    const projects = aiResult.projects || simulatedPayload.projects;

    // Save recommendations to database
    await db.saveRecommendedProjects(user.id, projects);

    return projects;
  } catch (error) {
    console.error("Personalized recommendations generation failed:", error);
    return simulatedPayload.projects;
  }
}

/**
 * When the user clicks "Build Project", generate a complete implementation roadmap and AI Mentor progression
 */
export async function buildRecommendedProject(projectName: string): Promise<ProjectRoadmap> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const prompt = `Project Name: ${projectName}
  Generate a complete technical implementation plan and learning roadmap for this project. 
  Include folder structures, DB schema layout, API endpoints, weekly roadmaps (4 weeks, daily tasks), common mistakes, readme template, STAR resume bullet points, and social media announcements.`;

  const systemPrompt = `You are a Principal Architect. Generate a complete build roadmap. Return a JSON object with:
  {
    "projectName": "string",
    "architecture": { "pattern": "string (e.g. Microservices / MVC)", "description": "string", "diagramDescription": "string" },
    "folderStructure": {},
    "databaseDesign": { "provider": "string (e.g. PostgreSQL)", "schemas": [ { "table": "string", "columns": ["string"] } ] },
    "apiDesign": { "endpoints": [ { "method": "string", "path": "string", "response": "string", "description": "string" } ] },
    "authStrategy": { "provider": "string", "flowDescription": "string", "scopes": ["string"] },
    "weeklyRoadmap": [
      {
        "week": number,
        "goal": "string",
        "deliverable": "string",
        "days": [
          { "day": number, "task": "string", "resources": [ { "name": "string", "url": "string" } ] }
        ]
      }
    ],
    "commonMistakes": ["string"],
    "expectedDeliverables": ["string"],
    "readmeTemplate": "string (markdown content)",
    "resumeBulletPoints": ["string"],
    "linkedinPostDraft": "string",
    "demoVideoChecklist": ["string"],
    "interviewPrep": { "behavioralQuestions": ["string"], "technicalDeepDives": ["string"] }
  }`;

  const simulatedPayload = {
    projectName,
    architecture: {
      pattern: "Event-Driven Gateway Architecture",
      description: "A secure API gateway routing client WebSocket connections to isolated analytical nodes, backed by a Kafka log stream.",
      diagramDescription: "Client -> API Gateway (Go) -> Apache Kafka -> Worker node consumers -> Redis Cache -> Recharts frontend dashboard."
    },
    folderStructure: {
      "root": {
        "src": {
          "gateway": ["main.go", "router.go", "auth_middleware.go"],
          "workers": ["analytics_consumer.py", "db_pusher.py"],
          "dashboard": {
            "components": ["Charts.tsx", "RealtimeTable.tsx"],
            "pages": ["index.tsx", "settings.tsx"]
          }
        },
        "docker-compose.yml": "Compose configuration",
        "README.md": "Project documentation",
        "package.json": "Dependencies list"
      }
    },
    databaseDesign: {
      provider: "PostgreSQL & Redis Caching",
      schemas: [
        { table: "users", columns: ["id UUID Primary Key", "email VARCHAR Unique", "created_at TIMESTAMP"] },
        { table: "analytics_logs", columns: ["id UUID Primary Key", "user_id UUID REFERENCES users", "event_type VARCHAR", "metric_value FLOAT", "timestamp TIMESTAMP"] }
      ]
    },
    apiDesign: {
      endpoints: [
        { method: "POST", path: "/api/auth/token", response: "{ token: 'eyJ...' }", description: "Exchange client credentials for a signed JWT" },
        { method: "GET", path: "/api/analytics/realtime", response: "WebSocket connection upgrade", description: "Continuous stream of aggregate metrics" },
        { method: "GET", path: "/api/analytics/history", response: "Array of historical telemetry logs", description: "Paginated database retrieval of event histories" }
      ]
    },
    authStrategy: {
      provider: "JWT Token Handshakes",
      flowDescription: "Clients authenticate via endpoint to retrieve JWTs, passed in Authorization headers or query strings during WebSocket connections.",
      scopes: ["read:analytics", "write:events"]
    },
    weeklyRoadmap: [
      {
        week: 1,
        goal: "Orchestration & Gateway Auth setup",
        deliverable: "Working HTTP reverse proxy with JWT validation",
        days: [
          { day: 1, task: "Initialize repository structure and Docker Compose cluster for Kafka and Redis.", resources: [{ name: "Docker Compose Tutorial", url: "https://docs.docker.com/compose/" }] },
          { day: 2, task: "Build Go HTTP router with request rate limiter.", resources: [{ name: "Go HTTP Routing", url: "https://go.dev/doc/" }] },
          { day: 3, task: "Write custom JWT auth middleware validating signatures.", resources: [{ name: "JWT Auth Go Guide", url: "https://jwt.io/introduction" }] },
          { day: 4, task: "Create mock client scripts generating HTTP telemetry calls.", resources: [{ name: "Testing API Requests", url: "https://github.com/h4rsh740" }] }
        ]
      },
      {
        week: 2,
        goal: "Apache Kafka Streaming & Redis Pipelines",
        deliverable: "Working Pub/Sub log pipeline storing events in Redis memory",
        days: [
          { day: 5, task: "Configure Kafka producer inside API gateway to stream logs.", resources: [{ name: "Kafka Go Client", url: "https://github.com/confluentinc/confluent-kafka-go" }] },
          { day: 6, task: "Write python worker consumers processing events from Kafka topic.", resources: [{ name: "Kafka Python Consumers", url: "https://kafka.apache.org/quickstart" }] },
          { day: 7, task: "Optimize consumer commits using batch transaction pipelines.", resources: [{ name: "Redis Caching Pipelines", url: "https://redis.io/docs/" }] }
        ]
      }
    ],
    commonMistakes: [
      "Failing to implement connection heartbeats, causing WebSocket timeouts on firewalls.",
      "Synchronous database commits in hot loops, causing network bottlenecks.",
      "Exposing Kafka brokers to public subnets rather than VPC isolated containers."
    ],
    expectedDeliverables: [
      "GitHub repository containing complete codebase, README and Docker compose configurations.",
      "Hosted staging deployment of dashboard displaying dynamic chart updates.",
      "1-minute video demonstration showcasing load simulation."
    ],
    readmeTemplate: `# Distributed Realtime Analytics Dashboard\n\nScale analytical log streams under 50ms latency.\n\n## Setup\n\`\`\`bash\ndocker-compose up -d\n\`\`\``,
    resumeBulletPoints: [
      "Architected a scalable Event-driven Analytics gateway routing client WebSocket connections to isolated Kafka log streams, reducing latency by 42%.",
      "Containerized microservices using Docker Compose, optimizing consumer throughput to process 10k+ requests per minute."
    ],
    linkedinPostDraft: "🚀 Thrilled to share my latest project: A Distributed Realtime Analytics Gateway! Built using Go, Docker, Kafka and Redis. Enabled 50ms streaming. Check it out!",
    demoVideoChecklist: [
      "Demonstrate live browser graphs shifting.",
      "Show terminal logs displaying Kafka message streams.",
      "Trigger rate limiting to verify security gateway actions."
    ],
    interviewPrep: {
      behavioralQuestions: ["Tell me about the biggest technical bottleneck you hit during build, and how you diagnosed it."],
      technicalDeepDives: ["How do event streams like Kafka differ from message queues like RabbitMQ?"]
    }
  };

  try {
    const aiResult = await generateStructuredAIResponse(
      prompt,
      systemPrompt,
      MODELS.RESUME_ANALYSIS,
      simulatedPayload
    );
    const result = aiResult.projectName ? aiResult : simulatedPayload;

    // Create Postgres Roadmap & Learning Progress entries
    const rm = await db.createRoadmap({
      userId: user.id,
      projectName: result.projectName,
      dailyTasks: (result.weeklyRoadmap || []).flatMap((w: any) => (w.days || []).map((d: any) => ({ text: `Week ${w.week} Day ${d.day}: ${d.task}`, completed: false }))),
      weeklyTasks: (result.weeklyRoadmap || []).map((w: any) => ({ text: `Week ${w.week}: ${w.goal}`, completed: false })),
      monthlyTasks: (result.expectedDeliverables || []).map((d: any) => ({ text: d, completed: false })),
      completionPercentage: 0,
      architecture: result.architecture,
      folderStructure: result.folderStructure,
      databaseDesign: result.databaseDesign,
      apiDesign: result.apiDesign,
      authStrategy: result.authStrategy,
      weeklyRoadmap: result.weeklyRoadmap,
      resources: (result.weeklyRoadmap || []).flatMap((w: any) => (w.days || []).flatMap((d: any) => d.resources || [])),
      commonMistakes: result.commonMistakes,
      expectedDeliverables: result.expectedDeliverables,
      templates: { readme: result.readmeTemplate },
      interviewPrep: result.interviewPrep
    });

    // Notify user
    await db.createNotification(user.id, {
      title: "New Roadmap Generated",
      message: `Roadmap for "${result.projectName}" generated successfully! AI Mentor active.`
    });

    // Create sync history entry
    await db.createSyncHistory(user.id, {
      provider: "resume", // roadmap sync
      status: "success",
      details: { message: `Roadmap built: ${result.projectName}` }
    });

    return result;
  } catch (error) {
    console.error("Roadmap generation failed:", error);
    return simulatedPayload;
  }
}
