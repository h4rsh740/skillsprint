"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

// ───────────────────────── TYPES ─────────────────────────

export interface QuizQuestionData {
  id: number;
  question: string;
  type: string;
  skill: string;
  difficulty: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizResponsePayload {
  quizTitle: string;
  difficulty: string;
  estimatedTime: string;
  questions: QuizQuestionData[];
}

export interface QuizReportPayload {
  score: number;
  readiness: number;
  strengths: string[];
  weaknesses: string[];
  skillGaps: string[];
  improvements: string[];
  roadmap: { phase: string; goal: string; duration: string; topics: string[] }[];
  recommendedProjects: string[];
  recommendedCertifications: string[];
  recommendedCourses: string[];
  careerAdvice: string[];
}

// ───────────────────────── DETERMINISTIC MOCK BANK ─────────────────────────

const TECH_BANK: Record<string, { q: string; opts: string[]; ans: string; exp: string; skill: string }[]> = {
  "Frontend Developer": [
    { q: "What is the virtual DOM in React?", opts: ["A lightweight copy of the real DOM", "A browser extension", "A CSS framework", "A server-side renderer"], ans: "A lightweight copy of the real DOM", exp: "React maintains a virtual DOM to batch updates and minimise expensive real-DOM manipulations.", skill: "React" },
    { q: "Which CSS property creates a flexible container?", opts: ["display: block", "display: flex", "display: grid only", "display: inline"], ans: "display: flex", exp: "display: flex enables a flex formatting context for its children.", skill: "CSS" },
    { q: "What does the 'useEffect' hook do?", opts: ["Manages component state", "Performs side effects in function components", "Creates context providers", "Optimises rendering"], ans: "Performs side effects in function components", exp: "useEffect lets you synchronise a component with an external system (API calls, subscriptions, DOM changes).", skill: "React" },
    { q: "What is TypeScript's purpose?", opts: ["To replace HTML templates", "To add static typing to JavaScript", "To compile Java to JS", "To handle CSS preprocessing"], ans: "To add static typing to JavaScript", exp: "TypeScript is a typed superset of JavaScript that compiles to plain JS, catching errors at compile time.", skill: "TypeScript" },
    { q: "Which HTTP method is idempotent?", opts: ["POST", "PATCH", "PUT", "None of the above"], ans: "PUT", exp: "PUT replaces the entire resource and multiple identical requests produce the same result.", skill: "REST APIs" },
  ],
  "Backend Developer": [
    { q: "What is middleware in Express.js?", opts: ["A database driver", "A function with access to req, res, and next", "A view template engine", "An ORM layer"], ans: "A function with access to req, res, and next", exp: "Middleware functions intercept the request-response cycle and can modify req/res or end the cycle.", skill: "Express.js" },
    { q: "What does ACID stand for in databases?", opts: ["Atomicity, Consistency, Isolation, Durability", "Advanced CSS Integration Design", "Async Compute Input Data", "Association, Class, Interface, Dependency"], ans: "Atomicity, Consistency, Isolation, Durability", exp: "ACID properties guarantee reliable database transactions.", skill: "Databases" },
    { q: "What is an JWT?", opts: ["A JSON parsing library", "A stateless token format for authentication", "A CSS preprocessor", "A query language"], ans: "A stateless token format for authentication", exp: "JWT (JSON Web Token) encodes claims in a compact, URL-safe token signed by a secret or key.", skill: "Authentication" },
    { q: "Which Node.js module handles file paths safely across OSes?", opts: ["fs", "path", "os", "crypto"], ans: "path", exp: "The path module provides utilities for working with file and directory paths portably.", skill: "Node.js" },
    { q: "What is connection pooling?", opts: ["Caching HTTP responses", "Reusing DB connections to reduce overhead", "Load-balancing API servers", "Storing sessions in Redis"], ans: "Reusing DB connections to reduce overhead", exp: "A connection pool maintains a set of active DB connections, avoiding the cost of creating a new one per query.", skill: "Databases" },
  ],
  "Full Stack Developer": [
    { q: "What is the N-tier architecture?", opts: ["Single-file scripts", "Separation of presentation, logic, and data layers", "Microservices only", "Serverless functions"], ans: "Separation of presentation, logic, and data layers", exp: "N-tier splits an application into logical layers (UI, business logic, data access) for maintainability.", skill: "Architecture" },
    { q: "What does CORS stand for?", opts: ["Cross-Origin Resource Sharing", "Client-Only Request Service", "Central Object Retrieval System", "Cache Origin Resolution Service"], ans: "Cross-Origin Resource Sharing", exp: "CORS is a security feature that allows or restricts cross-origin HTTP requests.", skill: "Web Security" },
    { q: "Which status code indicates a resource was created?", opts: ["200", "201", "204", "301"], ans: "201", exp: "HTTP 201 (Created) confirms that the request succeeded and a new resource was created.", skill: "REST APIs" },
    { q: "What is optimistic UI?", opts: ["A design pattern for dark mode", "Updating the UI before the server responds", "A database migration strategy", "A testing technique"], ans: "Updating the UI before the server responds", exp: "Optimistic UI assumes the request will succeed and updates the interface immediately, rolling back on error.", skill: "UX" },
    { q: "What is a reverse proxy?", opts: ["A client-side proxy", "A server that forwards requests to backend services", "A DNS override", "A CDN caching layer only"], ans: "A server that forwards requests to backend services", exp: "A reverse proxy sits between clients and one or more origin servers, handling routing, load balancing, SSL termination, etc.", skill: "DevOps" },
  ],
  "Data Scientist": [
    { q: "What is overfitting?", opts: ["A model performing equally on train and test data", "A model memorising training data and failing on new data", "A dataset with missing values", "A type of normalisation"], ans: "A model memorising training data and failing on new data", exp: "Overfitting occurs when a model learns noise in the training set and cannot generalise to unseen data.", skill: "Machine Learning" },
    { q: "Which Python library is used for numerical computing?", opts: ["Flask", "NumPy", "BeautifulSoup", "Pygame"], ans: "NumPy", exp: "NumPy provides efficient N-dimensional arrays and linear algebra operations.", skill: "Python" },
    { q: "What is a confusion matrix?", opts: ["A data visualisation tool", "A table showing TP, FP, TN, FN counts", "A neural network layer", "A clustering metric"], ans: "A table showing TP, FP, TN, FN counts", exp: "A confusion matrix summarises classification performance across all classes.", skill: "Machine Learning" },
    { q: "What does pandas 'groupby' do?", opts: ["Filters rows", "Groups rows by a key and applies aggregations", "Drops duplicates", "Merges DataFrames"], ans: "Groups rows by a key and applies aggregations", exp: "groupby splits data into groups, applies a function (sum, mean, count), and combines results.", skill: "Python" },
    { q: "What is the bias-variance trade-off?", opts: ["A model selection criterion", "The balance between under-fitting and over-fitting", "A data cleaning step", "A type of regularisation"], ans: "The balance between under-fitting and over-fitting", exp: "High bias → underfitting; high variance → overfitting. The goal is to minimise total error.", skill: "Machine Learning" },
  ],
  "Cybersecurity Analyst": [
    { q: "Which of the following is a symmetric encryption algorithm?", opts: ["RSA", "AES", "ECC", "Diffie-Hellman"], ans: "AES", exp: "AES is a widely used symmetric key cryptographic algorithm, whereas RSA, ECC, and Diffie-Hellman are asymmetric algorithms.", skill: "Cryptography" },
    { q: "What does the CIA triad stand for in security?", opts: ["Central Intelligence Agency", "Confidentiality, Integrity, Availability", "Control, Identity, Authorization", "Cryptography, Inspection, Auditing"], ans: "Confidentiality, Integrity, Availability", exp: "The CIA triad represents the three core principles of information security: Confidentiality, Integrity, and Availability.", skill: "Security Fundamentals" },
    { q: "Which attack vector involves tricking a user into executing unwanted actions on a trusted site?", opts: ["SQL Injection", "Cross-Site Scripting (XSS)", "Cross-Site Request Forgery (CSRF)", "Man-in-the-Middle (MitM)"], ans: "Cross-Site Request Forgery (CSRF)", exp: "CSRF forces an end user to execute unwanted actions on a web application in which they are currently authenticated.", skill: "Web Security" },
    { q: "What is the primary purpose of a firewall?", opts: ["To encrypt data in transit", "To filter network traffic based on rules", "To detect malware on endpoints", "To manage user passwords"], ans: "To filter network traffic based on rules", exp: "Firewalls monitor and filter incoming and outgoing network traffic based on established security policies.", skill: "Network Security" },
    { q: "Which of the following protocols is considered insecure for remote management?", opts: ["SSH", "Telnet", "HTTPS", "SFTP"], ans: "Telnet", exp: "Telnet transmits data, including passwords, in plaintext, making it insecure. SSH should be used instead.", skill: "Secure Protocols" },
  ],
};

const HR_BANK = [
  { q: "Tell me about a time you handled a conflict in a team.", opts: ["I avoided it", "I listened to all sides and mediated a resolution", "I escalated to management immediately", "I ignored the other person"], ans: "I listened to all sides and mediated a resolution", exp: "Conflict resolution demonstrates emotional intelligence and collaboration.", skill: "Soft Skills" },
  { q: "Where do you see yourself in 5 years?", opts: ["In a different industry", "Growing into a leadership role in this domain", "Doing the exact same job", "Starting my own company"], ans: "Growing into a leadership role in this domain", exp: "This shows ambition aligned with the company's growth path.", skill: "Career Planning" },
  { q: "What is your biggest weakness?", opts: ["I have none", "A genuine weakness you are actively improving", "I work too hard", "Other people's code"], ans: "A genuine weakness you are actively improving", exp: "Self-awareness and growth mindset are valued over cliché answers.", skill: "Self Awareness" },
  { q: "Why should we hire you?", opts: ["I need a job", "I am the best candidate", "My skills and passion align with this role's needs", "I will work for less pay"], ans: "My skills and passion align with this role's needs", exp: "A compelling answer links your unique strengths to the role's requirements.", skill: "Communication" },
  { q: "Describe a project where you led a team.", opts: ["A collaborative effort you guided", "An individual assignment", "A homework exercise", "A social media post"], ans: "A collaborative effort you guided", exp: "Leadership experience demonstrates initiative, planning, and people skills.", skill: "Leadership" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function generateQuizMock(
  jobRole: string,
  difficulty: string,
  questionCount: number,
  quizType: string
): Promise<QuizResponsePayload> {
  let pool = [...HR_BANK];

  if (quizType === "TECHNICAL" || quizType === "MIXED" || quizType === "PROJECT_BASED") {
    let matchedRole = "Frontend Developer";
    const roleLower = jobRole.toLowerCase();
    if (roleLower.includes("security") || roleLower.includes("cyber") || roleLower.includes("penetration") || roleLower.includes("infosec")) {
      matchedRole = "Cybersecurity Analyst";
    } else if (roleLower.includes("backend") || roleLower.includes("server") || roleLower.includes("database") || roleLower.includes("sql") || roleLower.includes("node")) {
      matchedRole = "Backend Developer";
    } else if (roleLower.includes("full") || roleLower.includes("stack")) {
      matchedRole = "Full Stack Developer";
    } else if (roleLower.includes("data") || roleLower.includes("ml") || roleLower.includes("ai") || roleLower.includes("scientist") || roleLower.includes("python")) {
      matchedRole = "Data Scientist";
    } else if (roleLower.includes("front") || roleLower.includes("react") || roleLower.includes("ui") || roleLower.includes("ux") || roleLower.includes("web") || roleLower.includes("js") || roleLower.includes("css")) {
      matchedRole = "Frontend Developer";
    } else {
      const keys = Object.keys(TECH_BANK);
      const found = keys.find(k => k.toLowerCase() === roleLower);
      matchedRole = found || "Frontend Developer";
    }
    const tech = TECH_BANK[matchedRole] || TECH_BANK["Frontend Developer"];
    pool = [...tech, ...pool];
  }

  while (pool.length < questionCount) {
    pool = [...pool, ...pool];
  }

  const selected = shuffle(pool).slice(0, questionCount);
  const timePerQ = difficulty === "EASY" ? 1.5 : difficulty === "MEDIUM" ? 2 : 3;
  const totalMin = Math.round(selected.length * timePerQ);

  return {
    quizTitle: `${jobRole} — ${difficulty} Assessment`,
    difficulty,
    estimatedTime: `${totalMin} minutes`,
    questions: selected.map((item, i) => ({
      id: i + 1,
      question: item.q,
      type: "mcq",
      skill: item.skill,
      difficulty,
      options: item.opts,
      correctAnswer: item.ans,
      explanation: item.exp,
    })),
  };
}

export async function generateReportMock(
  jobRole: string,
  questions: { question: string; skill: string; correctAnswer: string }[],
  answers: { selectedAnswer: string | null }[]
): Promise<QuizReportPayload> {
  const correct = questions.filter((q, i) => {
    const a = answers[i]?.selectedAnswer;
    return a === q.correctAnswer;
  }).length;

  const score = Math.round((correct / questions.length) * 100);
  const readiness = Math.min(100, Math.round(score * 0.7 + 30));

  const skillsMap = new Map<string, number>();
  questions.forEach((q, i) => {
    if (!skillsMap.has(q.skill)) skillsMap.set(q.skill, 0);
    const ok = answers[i]?.selectedAnswer === q.correctAnswer ? 1 : 0;
    skillsMap.set(q.skill, skillsMap.get(q.skill)! + ok);
  });

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const gaps: string[] = [];

  skillsMap.forEach((correctCount, skill) => {
    if (correctCount > 0) strengths.push(skill);
    else {
      weaknesses.push(skill);
      gaps.push(`Improve foundational understanding of ${skill}`);
    }
  });

  return {
    score,
    readiness,
    strengths: strengths.length ? strengths : ["Good effort, keep practicing"],
    weaknesses: weaknesses.length ? weaknesses : ["Continue building depth"],
    skillGaps: gaps.length ? gaps : ["No critical gaps identified"],
    improvements: [
      `Aim to improve your ${weaknesses[0] || "overall"} knowledge`,
      "Practice with timed assessments to build speed",
      "Review explanations for every wrong answer",
    ],
    roadmap: [
      { phase: "Week 1-2", goal: "Strengthen core concepts", duration: "2 weeks", topics: weaknesses.length ? [...weaknesses.slice(0, 3)] : ["General CS fundamentals"] },
      { phase: "Week 3-4", goal: "Apply knowledge in projects", duration: "2 weeks", topics: ["Build a personal project", "Contribute to open source"] },
      { phase: "Week 5-6", goal: "Mock interviews & refinement", duration: "2 weeks", topics: ["Practice behavioral questions", "System design basics"] },
    ],
    recommendedProjects: [
      "Build a full-stack CRUD app with auth",
      "Create a real-time chat application",
      "Develop a REST API with comprehensive tests",
    ],
    recommendedCertifications: [
      "AWS Certified Cloud Practitioner",
      "Meta Frontend Developer Certificate",
      "Google Data Analytics Certificate",
    ],
    recommendedCourses: [
      "System Design for Beginners (freeCodeCamp)",
      "JavaScript: The Hard Parts (Frontend Masters)",
      "Database Design and Management (Coursera)",
    ],
    careerAdvice: [
      "Tailor your resume to highlight measurable achievements",
      "Practice explaining complex concepts simply",
      "Network actively on LinkedIn and GitHub",
    ],
  };
}

// ───────────────────────── SERVER ACTIONS ─────────────────────────

export async function generateQuizAction(params: {
  resumeId?: string;
  jobRole: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXTREME";
  quizType: "TECHNICAL" | "HR" | "MIXED" | "PROJECT_BASED";
  questionCount: number;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const userId = user.id;
  const userProfileData = await db.findUserById(userId);
  const profile = userProfileData?.profile;

  // Build profile text context
  const userProfile = `
Name: ${userProfileData?.email || "SkillSprint Candidate"}
College: ${profile?.college || "N/A"}
Branch: ${profile?.branch || "N/A"}
Graduation Year: ${profile?.graduationYear || "N/A"}
Target Role: ${params.jobRole}
Skills: ${profile?.skills?.join(", ") || "N/A"}
`.trim();

  // Load specific resume analysis if resumeId provided to tailor context
  let resumeText = "";
  if (params.resumeId) {
    let analysis = await db.getResumeAnalysisByFileId(params.resumeId, userId);
    if (!analysis) {
      analysis = await db.getLatestResumeAnalysis(userId);
    }
    if (analysis) {
      let suggestions: any = analysis.suggestions;
      if (typeof suggestions === "string") {
        try {
          suggestions = JSON.parse(suggestions);
        } catch (e) {}
      }
      const skills = suggestions?.extractedSignals || [];
      const atsScore = analysis.atsScore || suggestions?.atsScore || 0;
      const improvements = suggestions?.improvementSuggestions || [];
      resumeText = `
Resumes analyzed skills: ${skills.join(", ") || ""}
ATS score: ${atsScore}
Improvement areas: ${JSON.stringify(improvements)}
`.trim();
    }
  }

  const QUIZ_SYSTEM_PROMPT = `You are an expert technical interviewer. Generate interview quiz questions.
Return ONLY valid JSON — no markdown, no extra text, no code fences.
The JSON must match this schema EXACTLY:
{
  "quizTitle": "string",
  "difficulty": "EASY | MEDIUM | HARD | EXTREME",
  "estimatedTime": "string e.g. 20 minutes",
  "questions": [
    {
      "id": 1,
      "question": "string",
      "type": "mcq",
      "skill": "string",
      "difficulty": "EASY | MEDIUM | HARD | EXTREME",
      "options": ["string A", "string B", "string C", "string D"],
      "correctAnswer": "string (exact text from options)",
      "explanation": "string"
    }
  ]
}`;

  const prompt = `
Candidate profile:
${userProfile}
${resumeText ? `Resume Context:\n${resumeText}` : ""}

Generate exactly ${params.questionCount} questions for the role "${params.jobRole}" at ${params.difficulty} difficulty. Quiz type: ${params.quizType}.
${params.difficulty === "EXTREME" ? "IMPORTANT: For EXTREME difficulty, generate extremely difficult, edge-case, expert-level SDE-4/Principal/Hardcore questions testing deep implementation details, advanced systems architecture edge cases, and compiler/runtime internals." : ""}
`;

  const mockPayload = await generateQuizMock(params.jobRole, params.difficulty, params.questionCount, params.quizType);

  let quizResult: QuizResponsePayload;
  let source: "gemini" | "mock" = "gemini";

  try {
    const result = await generateStructuredAIResponse(
      prompt,
      QUIZ_SYSTEM_PROMPT,
      MODELS.MOCK_INTERVIEW,
      mockPayload
    );
    quizResult = result as QuizResponsePayload;
    if (!quizResult || !quizResult.questions || quizResult.questions.length === 0) {
      throw new Error("Invalid output from AI");
    }
  } catch (err) {
    console.error("Gemini quiz generation failed — falling back to mock:", err);
    quizResult = mockPayload;
    source = "mock";
  }

  // Create session in database
  const session = await db.createQuizSession(userId, {
    resumeId: params.resumeId || null,
    title: quizResult.quizTitle,
    jobRole: params.jobRole,
    difficulty: params.difficulty,
    quizType: params.quizType,
    questionCount: quizResult.questions.length,
    estimatedTime: quizResult.estimatedTime,
    generatedPayload: JSON.stringify(quizResult.questions),
    source,
    questions: quizResult.questions,
  });

  return { success: true, session };
}

export async function listQuizSessionsAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  const sessions = await db.listQuizSessions(user.id);
  return { success: true, sessions };
}

export async function getQuizSessionAction(id: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  const session = await db.getQuizSession(id, user.id);
  if (!session) throw new Error("Session not found");
  return { success: true, session };
}

export async function submitQuizAction(id: string, data: {
  answers: { questionId: string; selectedAnswer: string | null }[];
  durationSec?: number;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const userId = user.id;
  const session = await db.getQuizSession(id, userId);
  if (!session) throw new Error("Session not found");

  if (session.status === "SUBMITTED" || session.status === "EVALUATED") {
    throw new Error("Quiz already submitted");
  }

  // Set to in-progress
  await db.updateQuizSession(session.id, { status: "IN_PROGRESS" });

  // Grade answers and update questions array atomically
  const updatedQuestions = session.questions.map((q: any) => {
    const candidateAns = data.answers.find((a: any) => a.questionId === q.id);
    const selectedAnswer = candidateAns ? candidateAns.selectedAnswer : null;
    const isCorrect = selectedAnswer === q.correctAnswer;
    return {
      ...q,
      answers: candidateAns ? [{ selectedAnswer, isCorrect }] : []
    };
  });

  const correctCount = updatedQuestions.filter((q: any) => {
    const ans = q.answers?.[0];
    return ans?.isCorrect ?? false;
  }).length;

  const score = session.questions.length > 0
    ? Math.round((correctCount / session.questions.length) * 100)
    : 0;

  // Update session atomically in Firestore
  await db.updateQuizSession(session.id, {
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
    durationSec: data.durationSec || 0,
    score,
    correctCount,
    totalCount: session.questions.length,
    questions: updatedQuestions
  });

  // Generate Report via Gemini or fall back to mock
  const userProfileData = await db.findUserById(userId);
  const profile = userProfileData?.profile;
  const userProfile = `
Name: ${userProfileData?.email || "SkillSprint Candidate"}
Target Role: ${session.jobRole}
Skills: ${profile?.skills?.join(", ") || "N/A"}
  `.trim();

  const REPORT_SYSTEM_PROMPT = `You are an expert career coach and interviewer. Evaluate the candidate's answers and produce a detailed report.
Return ONLY valid JSON — no markdown, no extra text.
Schema:
{
  "score": number (0-100),
  "readiness": number (0-100),
  "strengths": ["string"],
  "weaknesses": ["string"],
  "skillGaps": ["string"],
  "improvements": ["string"],
  "roadmap": [{ "phase": "string", "goal": "string", "duration": "string", "topics": ["string"] }],
  "recommendedProjects": ["string"],
  "recommendedCertifications": ["string"],
  "recommendedCourses": ["string"],
  "careerAdvice": ["string"]
}`;

  const qaPairs = session.questions.map((q: any) => {
    const candidateAns = data.answers.find((a) => a.questionId === q.id);
    return {
      question: q.question,
      skill: q.skill,
      correctAnswer: q.correctAnswer,
      candidateAnswer: candidateAns?.selectedAnswer || "(skipped)"
    };
  });

  const prompt = `
Candidate profile: ${userProfile}
Role: ${session.jobRole}

Quiz results:
${JSON.stringify(qaPairs, null, 2)}

Evaluate and generate a detailed career readiness report.
`;

  const mockReportPayload = await generateReportMock(session.jobRole, session.questions, data.answers);

  let report: QuizReportPayload;
  let reportSource: "gemini" | "mock" = "gemini";

  try {
    const result = await generateStructuredAIResponse(
      prompt,
      REPORT_SYSTEM_PROMPT,
      MODELS.MOCK_INTERVIEW,
      mockReportPayload
    );
    report = result as QuizReportPayload;
    if (!report || !report.strengths) {
      throw new Error("Invalid report output from AI");
    }
  } catch (err) {
    console.error("Gemini report generation failed — falling back to mock:", err);
    report = mockReportPayload;
    reportSource = "mock";
  }

  // Save report to database
  const savedReport = await db.createQuizReport(userId, session.id, {
    score: report.score,
    readiness: report.readiness,
    strengths: report.strengths,
    weaknesses: report.weaknesses,
    skillGaps: report.skillGaps,
    improvements: report.improvements,
    roadmap: report.roadmap,
    recommendedProjects: report.recommendedProjects,
    recommendedCertifications: report.recommendedCertifications,
    recommendedCourses: report.recommendedCourses,
    careerAdvice: report.careerAdvice,
    fullPayload: report
  });

  // Set session evaluated
  await db.updateQuizSession(session.id, { status: "EVALUATED" });

  return {
    success: true,
    score,
    correctCount,
    totalCount: session.questions.length,
    report: savedReport,
    reportSource
  };
}

export async function getQuizReportAction(sessionId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  const report = await db.getQuizReport(sessionId, user.id);
  if (!report) throw new Error("Report not found");
  return { success: true, report };
}

export async function listUserResumesAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  const resumes = await db.listResumesByUserId(user.id);
  return { success: true, resumes };
}
