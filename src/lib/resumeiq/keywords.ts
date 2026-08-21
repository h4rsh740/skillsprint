import { KeywordAnalysis } from "./types";

// Common industry keywords
const KEYWORDS_LIST = [
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go", "rust", "php", "html", "css", "sql", "bash", "swift", "kotlin", "scala",
  "react", "angular", "vue", "next.js", "remix", "svelte", "tailwind", "bootstrap", "sass", "graphql", "redux", "vite", "webpack",
  "node.js", "express", "nestjs", "fastapi", "django", "flask", "rails", "spring boot", "rest api", "grpc", "websockets",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd", "git", "github", "jenkins", "linux",
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "sqlite", "dynamodb", "firebase", "prisma",
  "pytorch", "tensorflow", "pandas", "numpy", "scikit-learn", "nlp", "machine learning", "deep learning", "gemini", "openai", "llm", "langchain", "rag",
  "jest", "cypress", "playwright", "figma", "postman", "jira", "agile", "scrum", "tdd"
];

// Alias mapping for normalizer
const ALIAS_MAP: Record<string, string> = {
  "reactjs": "React",
  "react.js": "React",
  "javascript": "JavaScript",
  "js": "JavaScript",
  "next js": "Next.js",
  "nextjs": "Next.js",
  "node js": "Node.js",
  "nodejs": "Node.js",
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "typescript": "TypeScript",
  "ts": "TypeScript",
  "tailwindcss": "Tailwind CSS",
  "tailwind": "Tailwind CSS",
  "mongodb": "MongoDB",
  "docker": "Docker",
  "kubernetes": "Kubernetes",
  "k8s": "Kubernetes",
  "aws": "AWS",
  "amazon web services": "AWS",
  "gcp": "GCP",
  "google cloud": "GCP",
  "github": "GitHub",
  "restful": "REST API",
  "rest apis": "REST API",
  "rest api": "REST API"
};

export function normalizeKeyword(kw: string): string {
  const clean = kw.trim().toLowerCase();
  if (ALIAS_MAP[clean]) {
    return ALIAS_MAP[clean];
  }
  // Title case default
  return kw.split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function textContainsKeyword(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;
  
  // Escape regex special chars except spaces
  const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  
  // Check with word boundaries. For special cases like C++, C#, .NET, Next.js:
  let regexStr = `\\b${escaped}\\b`;
  if (/[+#.]/.test(keyword)) {
    // If it contains symbols, match without strict word boundary on the side of symbol
    regexStr = `(?:^|\\s|\\b)${escaped}(?:$|\\s|\\b)`;
  }
  
  const regex = new RegExp(regexStr, "i");
  return regex.test(text);
}

export function extractJobKeywords(jobDescription: string, additionalSkills: string[] = []): string[] {
  const extracted = new Set<string>();
  
  // Add additional skills directly
  additionalSkills.forEach(skill => {
    if (skill.trim()) {
      extracted.add(normalizeKeyword(skill));
    }
  });

  const lowercaseDesc = jobDescription.toLowerCase();
  
  // Check our standard list
  KEYWORDS_LIST.forEach(kw => {
    if (textContainsKeyword(lowercaseDesc, kw)) {
      extracted.add(normalizeKeyword(kw));
    }
  });

  return Array.from(extracted);
}

export function analyzeKeywords(resumeText: string, jobKeywords: string[], resumeSkills: string[] = []): KeywordAnalysis {
  const matched: string[] = [];
  const missing: string[] = [];
  const weak: string[] = [];

  const fullResumeText = resumeText + " " + resumeSkills.join(" ");

  jobKeywords.forEach(kw => {
    const isPresent = textContainsKeyword(fullResumeText, kw);
    
    if (isPresent) {
      // Check if it's weak. Weak means it's mentioned only in the skills list but not in bullet points (experience or projects)
      // or occurs only once in the entire resume text.
      const occurrences = (resumeText.match(new RegExp(kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi")) || []).length;
      const presentInBullets = textContainsKeyword(resumeText, kw);

      if (occurrences <= 1 && !presentInBullets) {
        weak.push(kw);
      } else {
        matched.push(kw);
      }
    } else {
      missing.push(kw);
    }
  });

  return { matched, missing, weak };
}
