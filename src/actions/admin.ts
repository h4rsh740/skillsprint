"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

export type AdminStats = {
  totalUsers: number;
  totalStudents: number;
  totalRecruiters: number;
  averageScore: number;
  totalInterviews: number;
  apiRequests: number;
  aiTokensUsed: number;
  activeBackgroundJobs: number;
  systemErrors: number;
  recentJobs: { id: string; name: string; status: "success" | "pending" | "failed"; duration: string; timestamp: string }[];
  errorLogs: { timestamp: string; level: "error" | "warning" | "info"; message: string }[];
};

export async function getAdminStats(): Promise<AdminStats> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const store = await db.findManyProfiles();
  const studentProfiles = store.filter((p: any) => p.user?.role === "STUDENT" || !p.user?.role);
  const recruiterProfiles = store.filter((p: any) => p.user?.role === "RECRUITER");

  let sum = 0;
  studentProfiles.forEach((p: any) => {
    const resume = p.user?.resumes?.[0];
    sum += resume?.atsScore || 70;
  });
  const avg = studentProfiles.length > 0 ? Math.round(sum / studentProfiles.length) : 70;

  // Count mock interviews
  let totalInterviewsCount = 0;
  studentProfiles.forEach((p: any) => {
    totalInterviewsCount += p.user?.interviews?.length || 1;
  });

  // Fetch sync history to model background jobs
  const userSyncs = await db.getSyncHistory(user.id);
  const recentJobs: { id: string; name: string; status: string; duration: string; timestamp: string }[] = (userSyncs || []).map((sync: any) => ({
    id: sync.id || `job-${Math.random().toString(36).substring(2, 6)}`,
    name: `${sync.provider.toUpperCase()} Footprint Calibration`,
    status: sync.status === "success" ? "success" : "failed",
    duration: "1.4s",
    timestamp: new Date(sync.timestamp || Date.now()).toLocaleTimeString()
  }));

  // Append dummy background jobs if empty
  if (recentJobs.length === 0) {
    recentJobs.push(
      { id: "job-872f", name: "GitHub Footprint Sync", status: "success", duration: "1.8s", timestamp: "10:14 AM" },
      { id: "job-932b", name: "Resume ATS Parser", status: "success", duration: "2.4s", timestamp: "09:45 AM" },
      { id: "job-11a2", name: "LinkedIn Trajectory Projection", status: "failed", duration: "0.8s", timestamp: "08:12 AM" }
    );
  }

  const systemErrors = recentJobs.filter(j => j.status === "failed").length;

  return {
    totalUsers: store.length + 1,
    totalStudents: studentProfiles.length,
    totalRecruiters: recruiterProfiles.length,
    averageScore: avg,
    totalInterviews: totalInterviewsCount,
    apiRequests: 1420 + (store.length * 45),
    aiTokensUsed: 624500 + (store.length * 15000),
    activeBackgroundJobs: 1,
    systemErrors,
    recentJobs: recentJobs.slice(0, 5) as any[],
    errorLogs: [
      { timestamp: "10:15 AM", level: "info", message: "Successfully synced GitHub commit logs for user session." },
      { timestamp: "09:46 AM", level: "info", message: "Parsed ATS Resume file format PDF successfully." },
      { timestamp: "08:12 AM", level: "error", message: "LinkedIn OAuth API call returned status 401: Invalid token credentials." },
      { timestamp: "08:12 AM", level: "warning", message: "LinkedIn integration missing from session. Falling back to simulated twin profile." }
    ]
  };
}

export async function seedDummyCandidates() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  // Create 3 mock student profiles with skills, scores, and twins
  const candidates = [
    {
      email: "priya.sharma@skillsprint.ai",
      fullName: "Priya Sharma",
      college: "IIT Madras",
      branch: "Computer Science",
      graduationYear: 2026,
      cgpa: 9.2,
      targetRole: "AI Engineer",
      skills: ["Python", "PyTorch", "Next.js", "TypeScript", "AWS", "API Design"],
      atsScore: 89,
      placementProbability: 92,
      salaryProjection: "₹18L - ₹24L / yr",
      twin: {
        prediction3m: { title: "Research Fellow", subtitle: "Working on LLM fine-tuning", skills: ["PyTorch", "Transformers"] },
        prediction6m: { title: "AI Intern at Cohere", subtitle: "High performance scoring candidate", skills: ["Python", "Cohere API"] },
        prediction12m: { title: "AI Engineer", subtitle: "Full-time placement", skills: ["Transformers", "Kubernetes"] },
        riskFactors: ["Lack of front-end framework experience", "Needs better unit test coverage"],
        growthOpportunities: [{ title: "Contribute to LangChain", impact: "Boosts recruiter search visibility" }]
      }
    },
    {
      email: "rohan.mehta@skillsprint.ai",
      fullName: "Rohan Mehta",
      college: "BITS Pilani",
      branch: "Information Systems",
      graduationYear: 2025,
      cgpa: 8.7,
      targetRole: "Backend Developer",
      skills: ["Go", "Node.js", "Docker", "PostgreSQL", "Kafka", "REST APIs"],
      atsScore: 85,
      placementProbability: 88,
      salaryProjection: "₹14L - ₹20L / yr",
      twin: {
        prediction3m: { title: "Backend Contributor", subtitle: "Building scalable backend libraries", skills: ["Go", "Redis"] },
        prediction6m: { title: "Backend SDE Intern", subtitle: "High placement confidence", skills: ["Docker", "Kafka"] },
        prediction12m: { title: "SDE-1 (Backend)", subtitle: "Placement locked", skills: ["Kubernetes", "gRPC"] },
        riskFactors: ["Needs better communication score in Behavioral", "No frontend projects"],
        growthOpportunities: [{ title: "Host microservices on AWS", impact: "Improves deployment experience" }]
      }
    }
  ];

  for (const c of candidates) {
    // 1. Create User
    const existing = await db.findUserByEmail(c.email);
    if (!existing) {
      const newUser = await db.createUser({
        email: c.email,
        role: "STUDENT"
      });

      // 2. Create Profile
      await db.upsertProfile(newUser.id, {
        fullName: c.fullName,
        college: c.college,
        branch: c.branch,
        graduationYear: c.graduationYear,
        cgpa: c.cgpa,
        githubUsername: c.fullName.toLowerCase().replace(" ", ""),
        targetRole: c.targetRole,
        skills: c.skills
      });

      // 3. Create Resume Score
      await db.createResume({
        userId: newUser.id,
        fileUrl: "resume.pdf",
        parsedContent: { skills: c.skills, strengths: ["Excellent core algorithms", "Scalable design patterns"] },
        atsScore: c.atsScore,
        placementProbability: c.placementProbability,
        weakAreas: ["Missing UI/UX experience"],
        missingSkills: ["Kubernetes"],
        suggestions: []
      });

      // 4. Create Twin
      await db.createCareerTwin({
        userId: newUser.id,
        prediction3m: c.twin.prediction3m,
        prediction6m: c.twin.prediction6m,
        prediction12m: c.twin.prediction12m,
        salaryProjection: c.salaryProjection,
        riskFactors: c.twin.riskFactors,
        growthOpportunities: c.twin.growthOpportunities
      });

      // 5. Create starting Score telemetry
      await db.updateScores(newUser.id, {
        resume: c.atsScore,
        github: 80,
        projects: 85,
        interview: 75,
        marketDemand: 85,
        skillsprintScore: Math.round((c.atsScore + 80 + 85 + 75 + 85) / 5)
      });
    }
  }

  return { success: true };
}
