"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "./auth";
import { analyzeResume } from "./resume";

export async function onboardStudent(formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const fullName = formData.get("fullName") as string;
    const college = formData.get("college") as string;
    const branch = formData.get("branch") as string;
    const graduationYear = parseInt(formData.get("graduationYear") as string) || new Date().getFullYear();
    const cgpa = parseFloat(formData.get("cgpa") as string) || 0.0;
    const githubUsername = formData.get("githubUsername") as string;
    const targetRole = formData.get("targetRole") as string;
    const skillsString = formData.get("skills") as string;
    const resumeFile = formData.get("resume") as File;

    if (!fullName || !college || !targetRole || !githubUsername) {
      return { success: false, error: "Missing required profile fields" };
    }

    const skills = skillsString
      ? skillsString.split(",").map(s => s.trim()).filter(Boolean)
      : ["React", "JavaScript", "HTML", "CSS"];

    // 1. Create or Update Student Profile in Local DB / PostgreSQL
    const profile = await db.upsertProfile(user.id, {
      fullName,
      college,
      branch,
      graduationYear,
      cgpa,
      githubUsername,
      targetRole,
      skills,
    });

    // 2. Parse and Analyze Resume if uploaded
    if (resumeFile && resumeFile.size > 0) {
      try {
        const resumeFormData = new FormData();
        resumeFormData.append("resume", resumeFile);
        
        // This parses resume via AI, calculates ATS score and inserts it into DB
        await analyzeResume(resumeFormData);
      } catch (err: any) {
        console.error("Resume analysis failed during onboarding:", err);
      }
    }

    return { success: true, profile };
  } catch (error: any) {
    console.error("Onboarding failed:", error);
    return { success: false, error: error.message };
  }
}

export async function getDashboardData() {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const profile = await db.getProfileByUserId(user.id);
  const resume = await db.getLatestResumeByUserId(user.id);
  const careerTwin = await db.getLatestCareerTwin(user.id);
  const roadmap = await db.getLatestRoadmap(user.id);

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile,
    resume,
    careerTwin,
    roadmap
  };
}


