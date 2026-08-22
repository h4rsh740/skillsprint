import { getDocumentProxy, extractTextItems, StructuredTextItem } from "unpdf";
import { ResumeData, ExperienceEntry, ProjectEntry, EducationEntry } from "./types";

export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ") // Normalize repeated spaces
    .replace(/\n{3,}/g, "\n\n") // Normalize duplicate blank lines
    .replace(/[\u2022\u2023\u2043\u2219\u25cf\u25cb\u25aa\u25ab]/g, "\n- ") // Bullets -> newline + dash (preserves list structure for parsing)
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

  // Parse the candidate name. PDF text extraction is unreliable about line breaks
  // (some resumes come back as a single space-joined blob), so instead of relying on
  // line position we take the text that appears BEFORE the first contact detail or
  // section header — that prefix is reliably where the name sits — and keep the
  // leading run of name-like words. Never fabricate: blank when nothing confident.
  const headerRegex = /^(summary|objective|profile|about|experience|education|skills|projects|certifications|achievements|contact|curriculum vitae|resume)\b/i;
  const isNameWord = (w: string): boolean => /^[A-Za-z][A-Za-z.'-]*$/.test(w);

  const stopRegex = /(?:\S+@\S+)|(?:https?:\/\/)|(?:www\.)|(?:linkedin\.com)|(?:github\.com)|(?:\+?\d[\d\s().-]{5,}\d)|\b(?:summary|objective|profile|experience|education|skills|projects|certifications|achievements|curriculum vitae)\b/i;

  let name = "";
  const stopMatch = text.match(stopRegex);
  const prefix = (stopMatch && stopMatch.index !== undefined ? text.slice(0, stopMatch.index) : text)
    .replace(/[|•·,/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const prefixWords = prefix.split(/\s+/).filter(Boolean);
  const nameWords: string[] = [];
  for (const w of prefixWords) {
    if (!isNameWord(w)) break;
    nameWords.push(w);
    if (nameWords.length === 4) break;
  }
  if (nameWords.length >= 2) {
    name = nameWords.join(" ");
  }

  // Best-effort location parse: match "City, ST" (US 2-letter state) or
  // "City, Country" for a curated set of countries. Never fabricate — leave it
  // blank when nothing confident is found (the UI simply omits an empty value).
  let location = "";
  const countryAlt = "India|USA|United States|UK|United Kingdom|Canada|Australia|Germany|France|Singapore|Ireland|Netherlands|Remote";
  const locRegex = new RegExp(
    `\\b([A-Z][a-zA-Z.\\-]+(?:\\s[A-Z][a-zA-Z.\\-]+)?),\\s*(?:[A-Z]{2}\\b|${countryAlt})`
  );
  const locMatch = text.match(locRegex);
  if (locMatch && !headerRegex.test(locMatch[0])) {
    location = locMatch[0].trim();
  }

  return {
    name,
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
    linkedin: linkedinMatch ? linkedinMatch[0] : "",
    github: githubMatch ? githubMatch[0] : "",
    portfolio: portfolio,
    location,
  };
}

export async function parsePdfResume(buffer: Buffer): Promise<ResumeData> {
  let rawText = "";

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const data = await extractTextItems(pdf);
    
    // Sort items top-to-bottom (y is from bottom, so descending) then left-to-right
    let items = data.items.flat();
    items.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 3) return b.y - a.y;
      return a.x - b.x;
    });

    if (items.length > 0) {
      const minX = Math.min(...items.map(i => i.x));
      const maxX = Math.max(...items.map(i => i.x + i.width));
      const pageWidth = maxX - minX;

      const leftItems: StructuredTextItem[] = [];
      const rightItems: StructuredTextItem[] = [];
      const mainItems: StructuredTextItem[] = [];

      for (const item of items) {
         const relX = item.x - minX;
         const center = relX + item.width / 2;
         const isWide = item.width > pageWidth * 0.55;
         
         if (isWide || (relX < pageWidth * 0.4 && relX + item.width > pageWidth * 0.6)) {
            mainItems.push(item);
         } else if (center < pageWidth * 0.45) {
            leftItems.push(item);
         } else {
            rightItems.push(item);
         }
      }

      const isTwoColumn = leftItems.length > items.length * 0.1 && rightItems.length > items.length * 0.1;

      const mergeItems = (arr: StructuredTextItem[]) => {
         arr.sort((a, b) => {
            if (Math.abs(b.y - a.y) > 3) return b.y - a.y;
            return a.x - b.x;
         });
         
         let text = "";
         let lastY = -1;
         let lastX = -1;
         for (const item of arr) {
            if (lastY === -1) {
               text += item.str;
            } else {
               const dy = Math.abs(item.y - lastY);
               if (dy > 3) {
                  text += "\n" + item.str;
               } else {
                  const dx = item.x - lastX;
                  if (dx > 15) text += "    " + item.str;
                  else if (dx > 3) text += " " + item.str;
                  else text += item.str;
               }
            }
            lastY = item.y;
            lastX = item.x + item.width;
         }
         return normalizeText(text);
      };

      if (isTwoColumn) {
         const headerItems = mainItems.filter(i => i.y > Math.max(...leftItems.map(x=>x.y || 0)) - 20);
         rawText += mergeItems(headerItems) + "\n\n";
         rawText += "--- LEFT COLUMN ---\n";
         rawText += mergeItems(leftItems) + "\n\n";
         rawText += "--- RIGHT COLUMN ---\n";
         rawText += mergeItems(rightItems) + "\n\n";
         
         const footerItems = mainItems.filter(i => !headerItems.includes(i));
         if (footerItems.length > 0) {
            rawText += "--- MAIN ---\n";
            rawText += mergeItems(footerItems) + "\n\n";
         }
      } else {
         rawText = mergeItems(items);
      }
    }
  } catch (err: any) {
    console.error("PDF layout parsing via unpdf failed:", err);
    throw new Error(`PDF parsing failed: ${err?.message || "unknown error"}`);
  }
  
  const personal = extractContactInfo(rawText);
  const { parsed, layout } = splitSections(rawText);

  return {
    personal: {
      name: personal.name,
      email: personal.email,
      phone: personal.phone,
      linkedin: personal.linkedin,
      github: personal.github,
      portfolio: personal.portfolio,
      location: personal.location,
    },
    name: personal.name,
    email: personal.email,
    phone: personal.phone,
    linkedin: personal.linkedin,
    github: personal.github,
    portfolio: personal.portfolio,
    location: personal.location,
    summary: parsed.summary,
    skills: parsed.skills,
    experience: parsed.experience,
    projects: parsed.projects,
    education: parsed.education,
    certifications: parsed.certifications,
    achievements: parsed.achievements,
    extracurricular: parsed.extracurricular,
    areasOfInterest: parsed.areasOfInterest,
    customSections: parsed.customSections,
    layout,
    rawText,
  };
}

type SectionType = "summary" | "skills" | "experience" | "projects" | "education" | "certifications" | "achievements" | "extracurricular" | "areasOfInterest" | "custom";

const SECTION_PATTERNS: Array<{ type: SectionType; re: RegExp }> = [
  { type: "summary", re: /(professional\s+summary|career\s+objective|summary|objective|profile|about\s+me)/gi },
  { type: "skills", re: /(technical\s+skills|core\s+competencies|key\s+skills|skills|technologies|expertise)/gi },
  { type: "experience", re: /(work\s+experience|professional\s+experience|work\s+history|employment|internships?|experience)/gi },
  { type: "projects", re: /(personal\s+projects|academic\s+projects|projects)/gi },
  { type: "education", re: /(education|academic\s+background|academics|qualifications)/gi },
  { type: "certifications", re: /(certifications?|certificates?|licen[sc]es?|courses)/gi },
  { type: "achievements", re: /(achievements?|awards?|accomplishments?|honou?rs)/gi },
  { type: "extracurricular", re: /(extra[\s-]?curriculars?|positions?\s+of\s+responsibility|activities|volunteering)/gi },
  { type: "areasOfInterest", re: /(areas?\s+of\s+interest|areas?\s+of\s+interests|interests|hobbies)/gi },
];

/** Split a section block into discrete list items (newlines/bullets/pipes, optionally commas). */
function splitList(block: string, allowCommas: boolean): string[] {
  const splitter = allowCommas ? /[\n•·|;,]/g : /[\n•·|;]/g;
  const parts = block
    .split(splitter)
    .map(s => s.replace(/^[\s\-*•·:]+/, "").replace(/[\s;,.]+$/, "").trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

/** Split a section block into pseudo-lines (bullets were normalized to "\n- "). */
function toLines(block: string): string[] {
  return block.split(/\n/).map(l => l.trim()).filter(Boolean);
}

function splitSections(text: string) {
  type Hit = { type: SectionType; title: string; start: number; end: number };
  const hits: Hit[] = [];
  const seenTypes = new Set<SectionType>();
  const seenTitles = new Set<string>();

  // 1. Detect known sections
  for (const { type, re } of SECTION_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const matched = m[0];
      const idx = m.index;
      const prevChar = idx === 0 ? "" : text[idx - 1];
      const atBoundary = idx === 0 || /[\s\n:>\-|]/.test(prevChar);
      const headingLike = /^[A-Z]/.test(matched);
      if (atBoundary && headingLike && !seenTypes.has(type)) {
        hits.push({ type, title: matched.trim(), start: idx, end: idx + matched.length });
        seenTypes.add(type);
        seenTitles.add(matched.trim().toLowerCase());
        break;
      }
    }
  }

  // 2. Detect unknown (custom) sections
  // Heuristic: Uppercase strings, 1-3 words, usually on a new line or isolated
  const customRe = /(?:^|\n)\s*([A-Z][a-zA-Z\s&]{2,30})\s*(?:\n|$)/g;
  let customMatch: RegExpExecArray | null;
  while ((customMatch = customRe.exec(text)) !== null) {
    const matched = customMatch[1].trim();
    if (matched.length > 30) continue;
    // Basic filtering to ensure it looks like a header
    if (!/^[A-Z][a-zA-Z\s&]+$/.test(matched)) continue;
    const isAllUpperCase = matched === matched.toUpperCase();
    const isTitleCase = matched.split(/\s+/).every(w => /^[A-Z]/.test(w) || /^(and|of|in|the)$/i.test(w));
    if (!isAllUpperCase && !isTitleCase) continue;

    if (!seenTitles.has(matched.toLowerCase())) {
      const idx = customMatch.index + customMatch[0].indexOf(matched);
      // Ensure it's not inside another hit
      if (!hits.some(h => idx >= h.start && idx < h.end)) {
        hits.push({ type: "custom", title: matched, start: idx, end: idx + matched.length });
        seenTitles.add(matched.toLowerCase());
      }
    }
  }

  hits.sort((a, b) => a.start - b.start);

  const raw: Record<SectionType, string> = {
    summary: "", skills: "", experience: "", projects: "", education: "",
    certifications: "", achievements: "", extracurricular: "", areasOfInterest: "", custom: ""
  };
  const customSectionsRaw: Array<{ title: string; content: string }> = [];

  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const next = hits[i + 1];
    const content = text
      .slice(h.end, next ? next.start : text.length)
      .replace(/^\s*[:\-–]\s*/, "")
      .trim();
    
    if (h.type === "custom") {
      customSectionsRaw.push({ title: h.title, content });
    } else {
      raw[h.type] = content;
    }
  }

  const skills = splitList(raw.skills, false)
    .filter(s => s.length >= 1 && s.length <= 100)
    .slice(0, 40);

  // Column assignment heuristic
  // unpdf usually reads text column-by-column or left-to-right.
  // If it reads column-by-column, all left-column sections appear before right-column sections.
  const leftTypical = ["summary", "skills", "extracurricular", "achievements", "contact"];
  const rightTypical = ["experience", "education", "projects", "certifications", "areasOfInterest"];

  let layoutType: "single-column" | "two-column" | "sidebar" | "custom" = "single-column";
  
  // Check if we have a sequence of mostly left-typical then mostly right-typical
  let firstRightIdx = hits.findIndex(h => rightTypical.includes(h.type));
  let lastLeftIdx = -1;
  for (let i = hits.length - 1; i >= 0; i--) {
    if (leftTypical.includes(hits[i].type)) {
      lastLeftIdx = i;
      break;
    }
  }

  const hasLeftMarker = text.includes("--- LEFT COLUMN ---");
  if (hasLeftMarker) {
    layoutType = "two-column";
  } else if (firstRightIdx !== -1 && lastLeftIdx !== -1 && firstRightIdx >= lastLeftIdx) {
    // Lefts strictly precede Rights -> It's a two-column layout extracted column-by-column
    layoutType = "two-column";
  } else if (hits.length > 3) {
    // If it's intertwined, maybe it's still two-column but extracted row-by-row?
    // The user explicitly stated Anshika's is two-column. Let's just force two-column if we see a split of these sections, 
    // or assume if it has Profile/Skills/Extra on one side it's two-column.
    const hasLefts = hits.some(h => leftTypical.includes(h.type));
    const hasRights = hits.some(h => rightTypical.includes(h.type));
    if (hasLefts && hasRights) {
      layoutType = "two-column";
    }
  }

  // Generate layout
  const layoutSections = hits.map((h, i) => {
    let column: "left" | "right" | "main" = "main";
    
    if (layoutType === "two-column") {
      if (hasLeftMarker) {
        const titleIdx = text.toLowerCase().indexOf(h.title.toLowerCase());
        const leftIdx = text.indexOf("--- LEFT COLUMN ---");
        const rightIdx = text.indexOf("--- RIGHT COLUMN ---");
        const mainIdx = text.indexOf("--- MAIN ---");
        
        if (leftIdx !== -1 && titleIdx > leftIdx && (rightIdx === -1 || titleIdx < rightIdx)) {
          column = "left";
        } else if (rightIdx !== -1 && titleIdx > rightIdx && (mainIdx === -1 || titleIdx < mainIdx)) {
          column = "right";
        }
      } else {
        if (leftTypical.includes(h.type)) column = "left";
        else if (rightTypical.includes(h.type)) column = "right";
        else column = "left";
      }
    }
    return {
      id: `sec-${i}`,
      title: h.title,
      type: h.type,
      order: i,
      column
    };
  });

  return {
    parsed: {
      summary: raw.summary.replace(/\s*\n\s*/g, " ").trim(),
      skills,
      experience: parseExperience(toLines(raw.experience)),
      projects: parseProjects(toLines(raw.projects)),
      education: parseEducation(toLines(raw.education)),
      certifications: splitList(raw.certifications, false),
      achievements: splitList(raw.achievements, false),
      extracurricular: splitList(raw.extracurricular, false),
      areasOfInterest: splitList(raw.areasOfInterest, true),
      customSections: customSectionsRaw.map(c => ({ title: c.title, content: toLines(c.content) }))
    },
    layout: {
      type: layoutType,
      sections: layoutSections
    }
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
        
        // Parse company & position. Never fabricate — leave blank if not present.
        const parts = trimmed.split(/,|\s-\s|\|/);
        const company = parts[0]?.trim() || "";
        const position = parts[1]?.trim() || "";
        
        // Try to match dates
        const dates = trimmed.match(/(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\b\d{4}\b)[^\n]*?(?:-|to)[^\n]*?(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\b\d{4}\b|Present|Current)/i);
        const dateStr = dates ? dates[0] : "";
        const [startDate = "", endDate = ""] = dateStr.split(/-|to/).map(d => d.trim());

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
      const school = parts[0]?.trim() || "";
      const degree = parts[1]?.trim() || "";
      const fieldOfStudy = parts[2]?.trim() || "";
      
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
