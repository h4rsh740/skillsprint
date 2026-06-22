"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

export type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  url: string;
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  explainableReason: string;
};

export async function getJobRecommendations(): Promise<JobListing[]> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await db.getProfileByUserId(user.id);
  const targetRole = profile?.targetRole || "Software Developer";
  const userSkills = profile?.skills || ["React", "JavaScript", "HTML", "CSS"];

  const adzunaAppId = process.env.ADZUNA_APP_ID;
  const adzunaAppKey = process.env.ADZUNA_APP_KEY;
  const jsearchApiKey = process.env.JSEARCH_API_KEY;

  let rawJobs: any[] = [];

  // 1. Try JSearch API
  if (jsearchApiKey) {
    try {
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(targetRole)}&num_pages=1`;
      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": jsearchApiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        },
        next: { revalidate: 3600 }
      });
      if (res.ok) {
        const data = await res.json();
        rawJobs = data.data || [];
      }
    } catch (err) {
      console.warn("Failed to fetch JSearch API, falling back:", err);
    }
  }

  // 2. Try Adzuna API if JSearch empty
  if (rawJobs.length === 0 && adzunaAppId && adzunaAppKey) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${adzunaAppId}&app_key=${adzunaAppKey}&what=${encodeURIComponent(targetRole)}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        rawJobs = data.results || [];
      }
    } catch (err) {
      console.warn("Failed to fetch Adzuna API, falling back:", err);
    }
  }

  // 3. Fallback High-Fidelity Mock Jobs (Hackathon Demo Mode)
  if (rawJobs.length === 0) {
    rawJobs = [
      {
        id: "mock-1",
        title: `Junior ${targetRole.split(" ")[0]} Engineer`,
        company: "Stripe",
        location: "Bengaluru, India (Remote)",
        salary: "₹18L - ₹24L / yr",
        description: "Looking for an engineer to optimize transaction flows and build internal tools. Experience with React, Node.js, and SQL is preferred.",
        url: "https://stripe.com/jobs",
        skillsRequired: ["React", "JavaScript", "TypeScript", "Node.js", "SQL"]
      },
      {
        id: "mock-2",
        title: `Associate Full Stack Developer`,
        company: "Atlassian",
        location: "Bengaluru, India",
        salary: "₹22L - ₹28L / yr",
        description: "Join the Jira Cloud team. Work on responsive interfaces and high-scale APIs. Experience with Next.js, Docker, and REST APIs is required.",
        url: "https://atlassian.com/careers",
        skillsRequired: ["React", "Next.js", "TypeScript", "Docker", "API Design"]
      },
      {
        id: "mock-3",
        title: "Frontend Development Intern",
        company: "Razorpay",
        location: "Mumbai, India",
        salary: "₹45k - ₹60k / mo",
        description: "Help build the next generation of online checkout components. Deep knowledge of HTML, CSS, Tailwind, and React is necessary.",
        url: "https://razorpay.com/jobs",
        skillsRequired: ["React", "JavaScript", "HTML", "CSS", "Tailwind"]
      }
    ];
  }

  // Calculate Match Score and Skills Overlap
  const results: JobListing[] = rawJobs.map((job: any) => {
    // Determine skills required
    const skillsRequired = job.skillsRequired || 
      (job.description ? extractSkillsFromText(job.description) : ["React", "JavaScript"]);
    
    const matchingSkills = userSkills.filter((us: string) => 
      skillsRequired.some((rs: string) => rs.toLowerCase() === us.toLowerCase())
    );

    const missingSkills = skillsRequired.filter((rs: string) => 
      !userSkills.some((us: string) => us.toLowerCase() === rs.toLowerCase())
    );

    // Score calculation
    const overlapPercentage = skillsRequired.length > 0 
      ? Math.round((matchingSkills.length / skillsRequired.length) * 100)
      : 50;

    // Explainable AI Annotations
    let explainableReason = `You match ${matchingSkills.length} of the required skills. `;
    if (overlapPercentage > 80) {
      explainableReason += "Your profile is a strong fit. You have outstanding synergy with their stack. We highly recommend applying immediately.";
    } else if (overlapPercentage > 50) {
      explainableReason += `Consider learning ${missingSkills.slice(0, 2).join(" or ")} to boost your shortlisting probability.`;
    } else {
      explainableReason += "This role requires several missing backend/system capabilities. We suggest generating a roadmap target to acquire them first.";
    }

    return {
      id: job.id || job.job_id || Math.random().toString(),
      title: job.title || job.job_title || `SDE-1 (${targetRole})`,
      company: job.company || job.employer_name || "Tech Company",
      location: job.location || job.job_city || "India",
      salary: job.salary || job.job_max_salary || "₹12L - ₹18L / yr",
      description: job.description || "Exciting engineering role working on scalable systems.",
      url: job.url || job.job_apply_link || "https://linkedin.com/jobs",
      matchScore: overlapPercentage,
      matchingSkills,
      missingSkills,
      explainableReason
    };
  });

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

// Simple text search tool for mock matching
function extractSkillsFromText(text: string): string[] {
  const commonSkills = ["React", "Next.js", "TypeScript", "JavaScript", "Node.js", "SQL", "PostgreSQL", "Docker", "AWS", "HTML", "CSS", "Tailwind"];
  return commonSkills.filter(skill => new RegExp(`\\b${skill}\\b`, "i").test(text));
}
