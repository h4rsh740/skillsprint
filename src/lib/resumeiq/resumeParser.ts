import { extractText, getDocumentProxy } from "unpdf";
import { ResumeData, ExperienceEntry, ProjectEntry, EducationEntry } from "./types";

export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ") // Normalize repeated spaces
    .replace(/\n{3,}/g, "\n\n") // Normalize duplicate blank lines
    .replace(/[\u2022\u2023\u2043\u2219\u25cf\u25cb\u25aa\u25ab]/g, "-") // Common bullet points
    .replace(/[^\x00-\x7F]/g, (char) => {
      // Normalize common invalid Unicode spaces/dashes
      if (char === "\u2013" || char === "\u2014") return "-";
      if (char === "\u2018" || char === "\u2019") return "'";
      if (char === "\u201c" || char === "\u201d") return '"';
      return "";
    })
    .trim();
}

export function extractContactInfo(text: string) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/;
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/;
  const portfolioRegex = /(?:https?:\/\/)?(?:www\.)?(?:[A-Za-z0-9_-]+\.)+(?:com|org|net|io|me|dev|co)(?:\/[A-Za-z0-9_-]*)*\/?/;

  const emailMatch = text.match(emailRegex);
  const phoneMatch = text.match(phoneRegex);
  const githubMatch = text.match(githubRegex);
  const linkedinMatch = text.match(linkedinRegex);
  
  // Filter out email/linkedin/github from general portfolio search
  let portfolio = "";
  const portfolioMatches = text.match(new RegExp(portfolioRegex, "gi")) || [];
  for (const match of portfolioMatches) {
    if (!match.includes("github.com") && !match.includes("linkedin.com") && !match.includes("@")) {
      portfolio = match;
      break;
    }
  }

  // Parse name from the first non-empty lines
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  let name = "";
  if (lines.length > 0) {
    // Usually the name is on the first line and is 2-3 words
    const firstLineWords = lines[0].split(/\s+/);
    if (firstLineWords.length >= 2 && firstLineWords.length <= 4 && !firstLineWords.some(w => w.includes("@") || w.includes("http"))) {
      name = lines[0];
    } else if (lines.length > 1) {
      const secondLineWords = lines[1].split(/\s+/);
      if (secondLineWords.length >= 2 && secondLineWords.length <= 4) {
        name = lines[1];
      }
    }
  }

  return {
    name: name || "Candidate Name",
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
    linkedin: linkedinMatch ? linkedinMatch[0] : "",
    github: githubMatch ? githubMatch[0] : "",
    portfolio: portfolio,
    location: "Location Info", // Default or parsed if possible
  };
}

export async function parsePdfResume(buffer: Buffer): Promise<ResumeData> {
  let rawText = "";

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    rawText = normalizeText(text || "");
  } catch (err: any) {
    console.error("PDF parsing via unpdf failed:", err);
    throw new Error(`PDF parsing failed: ${err?.message || "unknown error"}`);
  }
  
  const contact = extractContactInfo(rawText);
  const sections = splitSections(rawText);

  return {
    ...contact,
    summary: sections.summary,
    skills: sections.skills,
    experience: sections.experience,
    projects: sections.projects,
    education: sections.education,
    certifications: sections.certifications,
    achievements: sections.achievements,
    rawText,
  };
}

function splitSections(text: string) {
  const lines = text.split("\n");
  
  const sectionHeaders = {
    summary: /summary|objective|profile|about\s+me/i,
    skills: /skills|technical\s+skills|technologies|expertise|core\s+competencies/i,
    experience: /experience|work\s+history|employment|professional\s+experience/i,
    projects: /projects|academic\s+projects|personal\s+projects/i,
    education: /education|academic\s+background|academics/i,
    certifications: /certifications|credentials|licenses/i,
    achievements: /achievements|awards|accomplishments/i
  };

  const sectionsContent: Record<keyof typeof sectionHeaders, string[]> = {
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: []
  };

  let currentSection: keyof typeof sectionHeaders | null = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check if line is a header
    let matchedHeader = false;
    for (const [key, regex] of Object.entries(sectionHeaders)) {
      // Heading is usually short and matches regex
      if (trimmed.length < 30 && regex.test(trimmed)) {
        currentSection = key as keyof typeof sectionHeaders;
        matchedHeader = true;
        break;
      }
    }

    if (!matchedHeader && currentSection) {
      sectionsContent[currentSection].push(trimmed);
    }
  });

  // Post-process sections
  const summary = sectionsContent.summary.join(" ");
  
  // Skills: split by comma or bullets
  const skills: string[] = [];
  sectionsContent.skills.forEach(line => {
    const items = line.split(/[,\/|]|\s-\s/).map(s => s.replace(/^-/, "").trim()).filter(Boolean);
    skills.push(...items);
  });

  // Experience parsing
  const experience: ExperienceEntry[] = parseExperience(sectionsContent.experience);

  // Projects parsing
  const projects: ProjectEntry[] = parseProjects(sectionsContent.projects);

  // Education parsing
  const education: EducationEntry[] = parseEducation(sectionsContent.education);

  // Certifications list
  const certifications: string[] = sectionsContent.certifications
    .map(line => line.replace(/^-/, "").trim())
    .filter(Boolean);

  // Achievements list
  const achievements: string[] = sectionsContent.achievements
    .map(line => line.replace(/^-/, "").trim())
    .filter(Boolean);

  return {
    summary,
    skills: Array.from(new Set(skills)).slice(0, 30), // unique and capped
    experience,
    projects,
    education,
    certifications,
    achievements
  };
}

function parseExperience(lines: string[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  let currentEntry: ExperienceEntry | null = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (currentEntry) {
        currentEntry.bullets.push(trimmed.replace(/^[-*]\s*/, ""));
      }
    } else {
      // Potential new company/position line. If it contains dates or keywords, create new entry
      const dateRegex = /(?:19|20)\d{2}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i;
      const isHeader = trimmed.split(" ").length < 8 && (dateRegex.test(trimmed) || trimmed.includes(",") || trimmed.includes("|"));
      
      if (isHeader || !currentEntry) {
        if (currentEntry) {
          entries.push(currentEntry);
        }
        
        // Parse company & position
        const parts = trimmed.split(/,|\s-\s|\|/);
        const company = parts[0]?.trim() || "Company Name";
        const position = parts[1]?.trim() || "Software Engineer";
        
        // Try to match dates
        const dates = trimmed.match(/(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\b\d{4}\b)[^\n]*?(?:-|to)[^\n]*?(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\b\d{4}\b|Present|Current)/i);
        const dateStr = dates ? dates[0] : "";
        const [startDate = "2020", endDate = "Present"] = dateStr.split(/-|to/).map(d => d.trim());

        currentEntry = {
          company,
          position,
          startDate,
          endDate,
          bullets: []
        };
      } else {
        // Append as a bullet point anyway if no bullet symbol is present
        currentEntry.bullets.push(trimmed);
      }
    }
  });

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

function parseProjects(lines: string[]): ProjectEntry[] {
  const entries: ProjectEntry[] = [];
  let currentEntry: ProjectEntry | null = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (currentEntry) {
        currentEntry.bullets.push(trimmed.replace(/^[-*]\s*/, ""));
      }
    } else {
      const isHeader = trimmed.split(" ").length < 6;
      if (isHeader || !currentEntry) {
        if (currentEntry) {
          entries.push(currentEntry);
        }
        currentEntry = {
          name: trimmed,
          description: "",
          bullets: []
        };
      } else {
        currentEntry.bullets.push(trimmed);
      }
    }
  });

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

function parseEducation(lines: string[]): EducationEntry[] {
  const entries: EducationEntry[] = [];
  let currentEntry: EducationEntry | null = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    const isHeader = trimmed.split(" ").length < 10;

    if (isHeader || !currentEntry) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      
      const parts = trimmed.split(/,|\s-\s|\|/);
      const school = parts[0]?.trim() || "University Name";
      const degree = parts[1]?.trim() || "Bachelor of Science";
      const fieldOfStudy = parts[2]?.trim() || "Computer Science";
      
      currentEntry = {
        school,
        degree,
        fieldOfStudy,
        bullets: []
      };
    } else {
      currentEntry.bullets?.push(trimmed);
    }
  });

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}
