"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

export async function getStudentProfileForTwin() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  
  const profile = await db.getProfileByUserId(user.id);
  return {
    cgpa: profile?.cgpa || "",
    targetRole: profile?.targetRole || "",
    skills: profile?.skills?.join(", ") || "",
  };
}

export type CareerTwinTimeline = {
  month: string;
  title: string;
  subtitle: string;
  skills: string[];
  salary: string;
  resources?: { name: string; url: string; }[];
};

export type CareerTwinResult = {
  timeline: CareerTwinTimeline[];
  growthOpportunities: {
    title: string;
    impact: string;
  }[];
  riskFactors: string[];
  placementReadiness?: number;
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendedRoles?: {
    title: string;
    match: number;
    reason: string;
    description: string;
  }[];
};

export async function generateCareerTwin(formData: FormData): Promise<CareerTwinResult> {
  const cgpa = formData.get("cgpa") as string;
  const targetRole = formData.get("targetRole") as string;
  const currentSkills = formData.get("skills") as string;

  if (!cgpa || !targetRole) {
    throw new Error("Missing required profile fields");
  }

  const prompt = `Student Profile:
  CGPA: ${cgpa}
  Target Role: ${targetRole}
  Skills: ${currentSkills}
  `;

  const systemPrompt = `You are an AI Career Twin projector. Based on the student's current profile, project their career timeline for the next 12 months. Return a JSON object with:
  - timeline (array of 4 objects for Present, +3 Months, +6 Months, +12 Months with fields: month, title, subtitle, skills, salary, and resources (array of objects with name and url, pointing to real high-quality free learning videos or courses on YouTube, freeCodeCamp, or Coursera to learn these skills))
  - growthOpportunities (array of 2 objects with title, impact)
  - riskFactors (array of 3 strings)
  - swot (object with strengths, weaknesses, opportunities, threats array of strings)
  - recommendedRoles (array of objects with title, match, reason, description)
  - placementReadiness (number between 0 and 100 representing the student's placement readiness percentage based on CGPA and skills)`;

  const simulatedPayload: CareerTwinResult = {
    timeline: [
      {
        month: "Present",
        title: "Engineering Student",
        subtitle: `Current CGPA: ${cgpa} | Target: ${targetRole}`,
        skills: currentSkills.split(",").map(s => s.trim()).filter(Boolean).slice(0, 3) || ["React", "JavaScript"],
        salary: "N/A",
        resources: [
          { name: "freeCodeCamp React Course", url: "https://www.youtube.com/watch?v=Ke90Tje7VS0" },
          { name: "MDN Web Docs JavaScript", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" }
        ]
      },
      {
        month: "+3 Months",
        title: "Open Source Contributor",
        subtitle: "Predicted based on your current skill velocity",
        skills: ["System Design", "Advanced " + targetRole.split(" ")[0]],
        salary: "N/A",
        resources: [
          { name: "ByteByteGo System Design", url: "https://www.youtube.com/watch?v=i53Gi_K397I" },
          { name: "freeCodeCamp Git & GitHub", url: "https://www.youtube.com/watch?v=RGOj5yH7evk" }
        ]
      },
      {
        month: "+6 Months",
        title: `${targetRole.split(" ")[0]} Intern`,
        subtitle: "High probability at Tier-2 companies",
        skills: ["API Design", "Docker", "PostgreSQL"],
        salary: "₹40k - ₹60k / mo",
        resources: [
          { name: "TechWorld with Nana Docker", url: "https://www.youtube.com/watch?v=3c-iKn5qWXg" },
          { name: "freeCodeCamp PostgreSQL", url: "https://www.youtube.com/watch?v=SpfIwlAYRyA" }
        ]
      },
      {
        month: "+12 Months",
        title: `${targetRole} (Full Time)`,
        subtitle: "Placement Ready",
        skills: ["System Architecture", "Cloud Deployments"],
        salary: "₹12L - ₹18L / yr",
        resources: [
          { name: "freeCodeCamp AWS Cloud Practitioner", url: "https://www.youtube.com/watch?v=SOTamWGuqXs" },
          { name: "TechWorld with Nana Kubernetes", url: "https://www.youtube.com/watch?v=d6WC5n9G_sM" }
        ]
      }
    ],
    growthOpportunities: [
      {
        title: "Master System Design",
        impact: "+15% Placement Chance at Tier 1"
      },
      {
        title: "Build a full-stack clone",
        impact: "Increases recruiter visibility"
      }
    ],
    riskFactors: [
      "Low consistency in coding practice (GitHub commits irregular).",
      "Missing core CS fundamentals in resume (OS, DBMS, Networks).",
      "No significant backend project to showcase full-stack ability."
    ],
    placementReadiness: 68,
    swot: {
      strengths: ["Strong frontend foundations", "Consistent project shipping", "Clean UI implementation taste"],
      weaknesses: ["Limited testing depth", "Low system design exposure", "Weak DSA interview consistency"],
      opportunities: ["Product Engineer track", "Hackathons + internships", "Portfolio case-study upgrades"],
      threats: ["High market competition", "Generic resume wording", "No strong open-source signal yet"]
    },
    recommendedRoles: [
      {
        title: "Frontend Developer",
        match: 86,
        description: "React strength + UI project quality",
        reason: "Recommended based on strong React skills, portfolio evidence of UI craftsmanship, good Git discipline, and rising consistency across shipped projects."
      },
      {
        title: "UI Engineer",
        match: 82,
        description: "Design systems + responsive implementation",
        reason: "Recommended due to excellent CSS/Tailwind skills and attention to visual detail."
      },
      {
        title: "Product Engineer",
        match: 78,
        description: "Fast shipping + cross-functional potential",
        reason: "Good alignment with your rapid prototyping skills and full-stack side projects."
      }
    ]
  };

  const result = await generateStructuredAIResponse(
    prompt, 
    systemPrompt, 
    MODELS.CAREER_TWIN, 
    simulatedPayload
  );

  return result as CareerTwinResult;
}
