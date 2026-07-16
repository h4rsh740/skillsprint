// Curated, broad technical skill / keyword dictionary used by the local ATS
// engine. All entries are lowercase canonical forms. Aliases map common
// variants (e.g. "js" -> "javascript") to their canonical form so matching is
// robust without being random.

export const SKILLS: string[] = [
  // Languages
  "javascript", "typescript", "python", "java", "c++", "c#", "c", "go", "golang",
  "rust", "ruby", "php", "swift", "kotlin", "scala", "dart", "r", "matlab",
  "sql", "html", "html5", "css", "css3", "sass", "scss", "bash", "shell",
  // Frameworks / libraries
  "react", "react.js", "next.js", "vue", "vue.js", "angular", "svelte", "node",
  "node.js", "express", "express.js", "deno", "django", "flask", "fastapi",
  "spring", "spring boot", "rails", "laravel", "asp.net", "tailwind", "tailwindcss",
  "bootstrap", "redux", "zustand", "mobx", "react query", "nextauth", "jquery",
  "three.js", "webgl", "d3.js", "d3", "chart.js", "webpack", "vite", "babel",
  // APIs / protocols
  "graphql", "rest", "rest api", "restful", "api", "apis", "soap", "websocket",
  "oauth", "jwt", "authentication", "authorization",
  // Databases
  "mysql", "postgresql", "postgres", "sqlite", "mongodb", "redis", "dynamodb",
  "cassandra", "neo4j", "elasticsearch", "firebase", "supabase",
  // Cloud / devops
  "aws", "amazon web services", "azure", "gcp", "google cloud", "heroku",
  "vercel", "netlify", "digitalocean", "docker", "kubernetes", "k8s", "terraform",
  "ansible", "ci/cd", "github actions", "jenkins", "gitlab ci", "linux", "nginx",
  "apache", "microservices", "serverless", "lambda", "ecs", "eks", "devops",
  "sre", "observability", "prometheus", "grafana", "datadog",
  // Data / ML
  "machine learning", "ml", "deep learning", "tensorflow", "pytorch", "keras",
  "scikit-learn", "sklearn", "pandas", "numpy", "opencv", "nlp",
  "computer vision", "data science", "data analysis", "data engineering", "etl",
  "spark", "hadoop", "hive", "tableau", "power bi", "looker", "excel",
  // Mobile
  "react native", "flutter", "android", "ios", "swiftui",
  // Tools / testing
  "git", "github", "gitlab", "bitbucket", "svn", "jest", "mocha", "cypress",
  "selenium", "playwright", "testing", "tdd", "figma", "adobe xd", "photoshop",
  "ui", "ux", "prisma", "sequelize", "typeorm", "mongoose", "socket.io", "webrtc",
  "rabbitmq", "kafka",
  // Methodology / soft
  "agile", "scrum", "jira", "kanban", "communication", "leadership", "mentoring",
  "problem solving", "teamwork", "responsive design", "system design",
  "data structures", "algorithms", "blockchain", "solidity", "ethereum",
];

export const SKILL_SET = new Set(SKILLS);

// Alias -> canonical. The canonical itself is implicitly included.
export const ALIASES: Record<string, string> = {
  js: "javascript",
  "reactjs": "react",
  "react.js": "react",
  "nextjs": "next.js",
  "vuejs": "vue",
  "vue.js": "vue",
  "nodejs": "node.js",
  "node": "node.js",
  "expressjs": "express",
  "express.js": "express",
  "postgres": "postgresql",
  "golang": "go",
  "k8s": "kubernetes",
  "ci/cd": "ci/cd",
  "cicd": "ci/cd",
  "gcp": "gcp",
  "google cloud": "gcp",
  "amazon web services": "aws",
  "ml": "machine learning",
  "sklearn": "scikit-learn",
  "restful": "rest",
  "rest api": "rest api",
  "apis": "api",
  "tailwindcss": "tailwind",
  "css3": "css",
  "html5": "html",
  "react native": "react native",
  "system design": "system design",
  "data structures": "data structures",
  "responsive design": "responsive design",
};

// Inverted alias map: canonical -> all spellings (including itself).
export const CANONICAL_ALIASES: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const canonical of SKILLS) map[canonical] = [canonical];
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (!map[canonical]) map[canonical] = [canonical];
    map[canonical].push(alias);
  }
  return map;
})();

// Logical groups used to organize the enhanced "Technical Skills" section and
// to break keyword analysis down by category.
export const CATEGORIES: Record<string, string[]> = {
  Languages: [
    "javascript", "typescript", "python", "java", "c++", "c#", "c", "go",
    "rust", "ruby", "php", "swift", "kotlin", "scala", "dart", "r", "sql",
    "html", "html5", "css", "css3", "sass", "scss", "bash", "shell",
  ],
  "Frameworks & Libraries": [
    "react", "next.js", "vue", "angular", "svelte", "node.js", "express",
    "deno", "django", "flask", "fastapi", "spring", "spring boot", "rails",
    "laravel", "asp.net", "tailwind", "bootstrap", "redux", "zustand", "mobx",
    "react query", "nextauth", "jquery", "three.js", "webgl", "d3.js", "d3",
    "chart.js", "webpack", "vite", "babel", "react native", "flutter",
  ],
  "APIs & Protocols": [
    "graphql", "rest", "rest api", "restful", "api", "apis", "soap", "websocket",
    "oauth", "jwt", "authentication", "authorization",
  ],
  Databases: [
    "mysql", "postgresql", "sqlite", "mongodb", "redis", "dynamodb",
    "cassandra", "neo4j", "elasticsearch", "firebase", "supabase",
  ],
  "Cloud & DevOps": [
    "aws", "azure", "gcp", "heroku", "vercel", "netlify", "docker",
    "kubernetes", "terraform", "ansible", "ci/cd", "github actions", "jenkins",
    "gitlab ci", "linux", "nginx", "apache", "microservices", "serverless",
    "lambda", "ecs", "eks", "devops", "sre", "observability", "prometheus",
    "grafana", "datadog",
  ],
  "Data & ML": [
    "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
    "scikit-learn", "pandas", "numpy", "opencv", "nlp", "computer vision",
    "data science", "data analysis", "data engineering", "etl", "spark",
    "hadoop", "hive", "tableau", "power bi", "looker", "excel",
  ],
  "Tools & Testing": [
    "git", "github", "gitlab", "bitbucket", "svn", "jest", "mocha", "cypress",
    "selenium", "playwright", "testing", "tdd", "figma", "adobe xd",
    "photoshop", "prisma", "sequelize", "typeorm", "mongoose", "socket.io",
    "webrtc", "rabbitmq", "kafka", "android", "ios", "swiftui",
  ],
  "Methodology & Soft Skills": [
    "agile", "scrum", "jira", "kanban", "communication", "leadership",
    "mentoring", "problem solving", "teamwork", "responsive design",
    "system design", "data structures", "algorithms", "blockchain",
    "solidity", "ethereum", "ui", "ux",
  ],
};

// Maps common target roles (substring match, lowercased) to a curated set of
// expected canonical keywords.
export const ROLE_PROFILES: Record<string, string[]> = {
  "frontend developer": ["javascript", "typescript", "react", "next.js", "html", "css", "tailwind", "redux", "webpack", "figma", "git", "testing", "responsive design"],
  "front end developer": ["javascript", "typescript", "react", "next.js", "html", "css", "tailwind", "redux", "webpack", "figma", "git", "testing", "responsive design"],
  "front-end developer": ["javascript", "typescript", "react", "next.js", "html", "css", "tailwind", "redux", "webpack", "figma", "git", "testing", "responsive design"],
  "react developer": ["javascript", "typescript", "react", "next.js", "html", "css", "redux", "tailwind", "git", "testing"],
  "backend developer": ["node.js", "python", "java", "sql", "postgresql", "mongodb", "redis", "rest", "api", "docker", "microservices", "aws", "git"],
  "back end developer": ["node.js", "python", "java", "sql", "postgresql", "mongodb", "redis", "rest", "api", "docker", "microservices", "aws", "git"],
  "full stack developer": ["javascript", "typescript", "react", "next.js", "node.js", "sql", "postgresql", "rest", "api", "docker", "aws", "git", "html", "css"],
  "fullstack developer": ["javascript", "typescript", "react", "next.js", "node.js", "sql", "postgresql", "rest", "api", "docker", "aws", "git", "html", "css"],
  "software developer": ["javascript", "typescript", "react", "next.js", "node.js", "sql", "git", "rest", "api", "testing", "agile"],
  "software engineer": ["javascript", "typescript", "react", "node.js", "sql", "git", "rest", "api", "system design", "testing", "agile"],
  "sde": ["javascript", "typescript", "react", "next.js", "node.js", "sql", "data structures", "algorithms", "git", "system design", "rest", "api"],
  "java developer": ["java", "spring", "spring boot", "sql", "postgresql", "rest", "api", "microservices", "git", "maven", "hibernate"],
  "data analyst": ["sql", "excel", "python", "pandas", "numpy", "tableau", "power bi", "data analysis", "statistics", "looker"],
  "data scientist": ["python", "pandas", "numpy", "scikit-learn", "machine learning", "deep learning", "sql", "tensorflow", "pytorch", "statistics", "nlp", "data analysis"],
  "data engineer": ["python", "sql", "spark", "hadoop", "etl", "kafka", "airflow", "aws", "docker", "postgresql", "data engineering"],
  "devops engineer": ["docker", "kubernetes", "aws", "terraform", "ci/cd", "linux", "bash", "ansible", "jenkins", "prometheus", "grafana", "git"],
  "machine learning engineer": ["python", "tensorflow", "pytorch", "machine learning", "deep learning", "scikit-learn", "sql", "aws", "docker", "nlp", "computer vision"],
  "mobile developer": ["swift", "kotlin", "react native", "flutter", "dart", "android", "ios", "git", "firebase"],
  "android developer": ["kotlin", "java", "android", "sqlite", "firebase", "git"],
  "ios developer": ["swift", "objective-c", "ios", "swiftui", "git", "firebase"],
  "web developer": ["html", "css", "javascript", "react", "next.js", "node.js", "git", "tailwind"],
  "ai engineer": ["python", "machine learning", "deep learning", "tensorflow", "pytorch", "nlp", "api", "sql", "git"],
};

// Strong, achievement-oriented action verbs.
export const STRONG_VERBS: string[] = [
  "developed", "built", "engineered", "designed", "implemented", "created",
  "led", "optimized", "improved", "increased", "reduced", "architected",
  "delivered", "launched", "automated", "spearheaded", "drove", "constructed",
  "established", "managed", "orchestrated", "streamlined", "migrated",
  "refactored", "integrated", "deployed", "scaled", "mentored", "collaborated",
  "configured", "maintained", "analyzed", "researched", "shipped", "prototyped",
  "modernized", "transformed", "leveraged", "utilized", "supported", "owned",
  "contributed", "executed", "applied", "explored",
];

// Weak / passive verbs that should be upgraded where possible.
export const WEAK_VERBS: string[] = [
  "worked", "work", "made", "make", "did", "done", "used", "use", "helped",
  "help", "responsible for", "handled", "handle", "involved in", "assisted",
  "assist", "participated", "participated in", "was", "were", "did some",
  "tried", "attempted",
];

// Qualitative, non-numeric descriptors that may be appended to a generic build
// bullet. These describe the nature of the work, never fabricated metrics.
export const QUALITY_DESCRIPTORS: string[] = [
  "responsive", "user-friendly", "accessible", "performant", "scalable",
  "maintainable", "cross-device compatible", "production-ready",
  "well-structured", "reusable", "modular",
];

// Stopwords used when extracting free-form tokens from a job description.
export const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "our", "are", "will", "have", "has",
  "from", "this", "that", "into", "your", "who", "their", "they", "them",
  "such", "able", "must", "should", "looking", "looking for", "experience",
  "using", "strong", "good", "well", "work", "working", "team", "plus", "etc",
  "including", "including but", "not", "but", "all", "any", "can", "need",
  "needed", "know", "knowledge", "understanding", "ability", "year", "years",
  "role", "position", "company", "candidate", "requirements", "required",
  "preferred", "skills", "skill", "developer", "engineer", "development",
]);

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
