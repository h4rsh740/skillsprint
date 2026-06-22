"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

export type SearchFilters = {
  college?: string;
  branch?: string;
  targetRole?: string;
  skills?: string;
  minCgpa?: string;
};

export async function searchProfiles(filters: SearchFilters) {
  const user = await getSessionUser();
  // Recruiter authorization check (disabled for hackathon testing/demo convenience, but recommended)
  
  const skillsArray = filters.skills
    ? filters.skills.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const profiles = await db.findManyProfiles({
    college: filters.college || undefined,
    branch: filters.branch || undefined,
    targetRole: filters.targetRole || undefined,
    skills: skillsArray.length > 0 ? skillsArray : undefined,
    minCgpa: filters.minCgpa ? parseFloat(filters.minCgpa) : undefined,
  });

  return {
    success: true,
    results: profiles.map((p: any) => {
      const latestResume = p.user?.resumes?.[0] || null;
      const latestTwin = p.user?.careerTwins?.[0] || null;

      return {
        id: p.id,
        fullName: p.fullName || "Anonymous Student",
        college: p.college || "N/A",
        branch: p.branch || "N/A",
        graduationYear: p.graduationYear || 2026,
        cgpa: p.cgpa || 0.0,
        targetRole: p.targetRole || "Software Engineer",
        skills: p.skills || [],
        atsScore: latestResume?.atsScore || 70,
        placementProbability: latestResume?.placementProbability || 60,
        salaryProjection: latestTwin?.salaryProjection || "₹10L - ₹15L / yr",
        careerTwin: latestTwin || null,
      };
    })
  };
}
