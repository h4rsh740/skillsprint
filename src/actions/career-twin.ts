"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";

export type CareerTwinTimeline = {
  month: string;
  title: string;
  subtitle: string;
  skills: string[];
  salary: string;
};

export type CareerTwinResult = {
  timeline: CareerTwinTimeline[];
  growthOpportunities: {
    title: string;
    impact: string;
  }[];
  riskFactors: string[];
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
  - timeline (array of 4 objects for Present, +3 Months, +6 Months, +12 Months with fields: month, title, subtitle, skills, salary)
  - growthOpportunities (array of 2 objects with title, impact)
  - riskFactors (array of 3 strings)
  - swot (object with strengths, weaknesses, opportunities, threats array of strings)
  - recommendedRoles (array of objects with title, match, reason, description)`;

  const simulatedPayload: CareerTwinResult = {
    timeline: [
      {
        month: "Present",
        title: "Engineering Student",
        subtitle: `Current CGPA: ${cgpa} | Target: ${targetRole}`,
        skills: currentSkills.split(",").map(s => s.trim()).filter(Boolean).slice(0, 3) || ["React", "JavaScript"],
        salary: "N/A"
      },
      {
        month: "+3 Months",
        title: "Open Source Contributor",
        subtitle: "Predicted based on your current skill velocity",
        skills: ["System Design", "Advanced " + targetRole.split(" ")[0]],
        salary: "N/A"
      },
      {
        month: "+6 Months",
        title: `${targetRole.split(" ")[0]} Intern`,
        subtitle: "High probability at Tier-2 companies",
        skills: ["API Design", "Docker", "PostgreSQL"],
        salary: "₹40k - ₹60k / mo"
      },
      {
        month: "+12 Months",
        title: `${targetRole} (Full Time)`,
        subtitle: "Placement Ready",
        skills: ["System Architecture", "Cloud Deployments"],
        salary: "₹12L - ₹18L / yr"
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
