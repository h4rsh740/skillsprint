import { z } from "zod";

const experienceEntrySchema = z.object({
  company: z.string().default(""),
  position: z.string().default(""),
  location: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  bullets: z.array(z.string()).default([]),
});

const projectEntrySchema = z.object({
  name: z.string().default(""),
  description: z.string().optional().default(""),
  bullets: z.array(z.string()).default([]),
});

const educationEntrySchema = z.object({
  school: z.string().default(""),
  degree: z.string().default(""),
  fieldOfStudy: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  bullets: z.array(z.string()).optional().default([]),
});

const resumeSectionSchema = z.object({
  id: z.string().default(""),
  title: z.string().default(""),
  type: z.enum(["summary", "skills", "experience", "projects", "education", "certifications", "achievements", "extracurricular", "areasOfInterest", "custom"]).default("custom"),
  content: z.string().optional(),
  items: z.array(z.any()).optional(),
  order: z.number().default(0),
  column: z.enum(["left", "right", "main"]).default("main"),
});

const resumeLayoutSchema = z.object({
  type: z.enum(["single-column", "two-column", "sidebar", "custom"]).default("single-column"),
  sections: z.array(resumeSectionSchema).default([]),
});

const enhancedResumeSchema = z.object({
  personal: z.object({
    name: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default(""),
    linkedin: z.string().default(""),
    github: z.string().default(""),
    portfolio: z.string().default(""),
    title: z.string().optional().default(""),
    otherLinks: z.array(z.string()).optional().default([]),
  }),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  experience: z.array(experienceEntrySchema).default([]),
  projects: z.array(projectEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  extracurricular: z.array(z.string()).default([]),
  areasOfInterest: z.array(z.string()).default([]),
  customSections: z.array(z.object({
    title: z.string(),
    content: z.array(z.string())
  })).default([]),
  layout: resumeLayoutSchema,
});

const resumeChangeSchema = z.object({
  id: z.string().optional().default(""),
  section: z.string().default(""),
  original: z.string().default(""),
  enhanced: z.string().default(""),
  changeType: z.enum(["Added", "Improved", "Keyword Optimized", "Reorganized", "Condensed"]).default("Improved"),
  reason: z.string().default(""),
  targetKeywords: z.array(z.string()).default([]),
  atsImpact: z.enum(["Low", "Medium", "High"]).optional().default("Medium"),
});

const recommendationEntrySchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  relatedKeyword: z.string().optional().default(""),
});

export const enhanceResponseSchema = z.object({
  enhancedResume: enhancedResumeSchema,
  changes: z.array(resumeChangeSchema).default([]),
  recommendations: z.array(recommendationEntrySchema).default([]),
});
