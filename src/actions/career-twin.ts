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
  - riskFactors (array of 3 strings)`;

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
