"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";

export type StructuredResume = {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location?: string;
    github?: string;
    linkedin?: string;
  };
  summary: string;
  skills: string[];
  experience: {
    company: string;
    role: string;
    date: string;
    bullets: string[];
  }[];
  projects: {
    title: string;
    description: string;
    bullets: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    date: string;
    gpa?: string;
  }[];
};

export type ResumeAnalysisResult = {
  atsScore: number;
  resumeScore: number;
  improvedAtsScore?: number;
  projectsParsed: number;
  keywordGaps: number;
  extractedSignals: string[];
  improvementSuggestions: {
    title: string;
    description: string;
    priority: "High" | "Med" | "Low";
    progress: number;
  }[];
  rewriteSuggestions: {
    original: string;
    improved: string;
  }[];
  originalResume?: StructuredResume;
  improvedResume?: StructuredResume;
};

export async function analyzeResume(formData: FormData): Promise<ResumeAnalysisResult> {
  const file = formData.get("resume") as File;
  
  if (!file) {
    throw new Error("No resume file provided");
  }

  // Convert File to Base64
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString("base64");
  
  let mimeType = file.type || "application/pdf";
  if (file.name.endsWith(".pdf")) {
    mimeType = "application/pdf";
  } else if (file.name.endsWith(".png")) {
    mimeType = "image/png";
  } else if (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) {
    mimeType = "image/jpeg";
  }

  const prompt = `Please analyze the uploaded resume file. Extract details such as skills, education, experience, and projects. 
  Provide:
  1. An ATS Score (0-100) reflecting how well this resume matches tech SDE roles.
  2. A Resume Score (0-100) based on style, impact, and content quality.
  3. Total projects parsed in the resume.
  4. Total priority keyword gaps (missing core technologies for standard tech roles).
  5. Extracted keywords/signals.
  6. Actionable improvement suggestions (with title, description, priority High/Med/Low, progress 0-100 indicating current completion status or action difficulty).
  7. Resume rewrite suggestions (at least one bullet point rewrite from the resume, showing the 'original' text and the 'improved' impact-focused text).
  8. A structured JSON representation of the original resume content.
  9. A structured JSON representation of the fully optimized/improved resume content (integrating all suggested improvements, missing skills, and improved impact-oriented metrics-driven bullet points in the exact same structure as the original).
  10. An Improved ATS Score (0-100) reflecting the score if all AI optimizations are applied.`;

  const systemPrompt = `You are a strict, top-tier tech recruiter and ATS expert AI. Analyze the candidate's resume and return a JSON object with:
  {
    "atsScore": number (0-100),
    "resumeScore": number (0-100),
    "improvedAtsScore": number (0-100),
    "projectsParsed": number,
    "keywordGaps": number,
    "extractedSignals": ["string"],
    "improvementSuggestions": [
      {
        "title": "string",
        "description": "string",
        "priority": "High" | "Med" | "Low",
        "progress": number (0-100)
      }
    ],
    "rewriteSuggestions": [
      {
        "original": "string",
        "improved": "string"
      }
    ],
    "originalResume": {
      "personalInfo": {
        "name": "string",
        "email": "string",
        "phone": "string",
        "location": "string",
        "github": "string",
        "linkedin": "string"
      },
      "summary": "string",
      "skills": ["string"],
      "experience": [
        {
          "company": "string",
          "role": "string",
          "date": "string",
          "bullets": ["string"]
        }
      ],
      "projects": [
        {
          "title": "string",
          "description": "string",
          "bullets": ["string"]
        }
      ],
      "education": [
        {
          "institution": "string",
          "degree": "string",
          "date": "string",
          "gpa": "string"
        }
      ]
    },
    "improvedResume": {
      "personalInfo": {
        "name": "string",
        "email": "string",
        "phone": "string",
        "location": "string",
        "github": "string",
        "linkedin": "string"
      },
      "summary": "string (improved professional summary)",
      "skills": ["string (including added missing key skills)"],
      "experience": [
        {
          "company": "string",
          "role": "string",
          "date": "string",
          "bullets": ["string (rewritten as metrics-driven impact points)"]
        }
      ],
      "projects": [
        {
          "title": "string",
          "description": "string (improved action-oriented description)",
          "bullets": ["string (optimized metrics-driven achievements)"]
        }
      ],
      "education": [
        {
          "institution": "string",
          "degree": "string",
          "date": "string",
          "gpa": "string"
        }
      ]
    }
  }`;

  const simulatedPayload: ResumeAnalysisResult = {
    resumeScore: 81,
    atsScore: 73,
    improvedAtsScore: 96,
    projectsParsed: 5,
    keywordGaps: 11,
    extractedSignals: ["React", "JavaScript", "TypeScript", "Git", "TailwindCSS", "REST APIs"],
    improvementSuggestions: [
      {
        "title": "Rewrite summary for target role",
        "description": "Lead with frontend positioning and measurable outcomes.",
        "priority": "High",
        "progress": 82
      },
      {
        "title": "Insert ATS keywords",
        "description": "TypeScript, Next.js, unit testing, performance optimization.",
        "priority": "High",
        "progress": 68
      },
      {
        "title": "Project bullets → impact bullets",
        "description": "Use metrics like load time, users, conversion, deployments.",
        "priority": "Med",
        "progress": 57
      }
    ],
    rewriteSuggestions: [
      {
        "original": "built a weather app using React.",
        "improved": "Architected a responsive weather dashboard using React and Tailwind, integrating third-party REST APIs and achieving a 98% Lighthouse performance score."
      }
    ],
    originalResume: {
      personalInfo: {
        name: "Harsh Singh",
        email: "harsh.singh@gmail.com",
        phone: "+91 98765 43210",
        location: "Mumbai, India",
        github: "github.com/h4rsh740",
        linkedin: "linkedin.com/in/harshsingh"
      },
      summary: "Aspiring Web Developer with basic experience in JavaScript and React, looking for frontend roles.",
      skills: ["React", "JavaScript", "HTML", "CSS", "REST APIs", "Git"],
      experience: [
        {
          company: "Tech Startups Inc.",
          role: "Web Development Intern",
          date: "Dec 2024 - Apr 2025",
          bullets: [
            "Assisted in coding standard components in React.",
            "Wrote simple styling using CSS modules.",
            "Fixed CSS/HTML bugs on internal administrative dashboards."
          ]
        }
      ],
      projects: [
        {
          title: "Weather app using React",
          description: "Built a weather app using React.",
          bullets: [
            "Utilized standard React useEffect hook to pull current weather data from OpenWeather API.",
            "Created responsive layout for mobile and desktop dashboards."
          ]
        }
      ],
      education: [
        {
          institution: "Mumbai Institute of Technology",
          degree: "B.Tech in Computer Science and Engineering",
          date: "2022 - 2026",
          gpa: "8.4/10.0"
        }
      ]
    },
    improvedResume: {
      personalInfo: {
        name: "Harsh Singh",
        email: "harsh.singh@gmail.com",
        phone: "+91 98765 43210",
        location: "Mumbai, India",
        github: "github.com/h4rsh740",
        linkedin: "linkedin.com/in/harshsingh"
      },
      summary: "Performance-driven Frontend Engineer with hands-on experience in building scalable React and Next.js interfaces, optimizing rendering efficiency, and implementing modular design patterns. Proven track record of improving web performance and application speed by up to 35%.",
      skills: ["React", "Next.js", "TypeScript", "JavaScript", "TailwindCSS", "HTML5", "CSS3", "REST APIs", "Git", "Jest (Unit Testing)", "Lighthouse Optimization"],
      experience: [
        {
          company: "Tech Startups Inc.",
          role: "Web Development Intern",
          date: "Dec 2024 - Apr 2025",
          bullets: [
            "Spearheaded conversion of legacy React codebase to structured components, reducing compile bundles by 18%.",
            "Implemented reusable, modular layouts using TailwindCSS, enhancing development speed and visual consistency across pages.",
            "Diagnosed and resolved rendering bottlenecks on administrative dashboards, yielding a 25% decrease in time-to-interactive (TTI)."
          ]
        }
      ],
      projects: [
        {
          title: "Weather app using React",
          description: "Built a weather app using React.",
          bullets: [
            "Architected a responsive weather dashboard using React and Tailwind, integrating third-party REST APIs and achieving a 98% Lighthouse performance score.",
            "Optimized data fetching with caching and loading states to handle API rate limits, decreasing network load by 30%."
          ]
        }
      ],
      education: [
        {
          institution: "Mumbai Institute of Technology",
          degree: "B.Tech in Computer Science and Engineering",
          date: "2022 - 2026",
          gpa: "8.4/10.0"
        }
      ]
    }
  };

  const result = await generateStructuredAIResponse(
    prompt, 
    systemPrompt, 
    MODELS.RESUME_ANALYSIS, 
    simulatedPayload,
    base64Data,
    mimeType
  );

  return result as ResumeAnalysisResult;
}

