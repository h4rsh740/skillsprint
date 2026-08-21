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

const enhancedResumeSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
  portfolio: z.string().default(""),
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  experience: z.array(experienceEntrySchema).default([]),
  projects: z.array(projectEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
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
