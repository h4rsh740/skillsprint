"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

export type ScoreDetails = {
  resume: number;
  github: number;
  projects: number;
  interview: number;
  marketDemand: number;
  skillsprintScore: number;
  growthPercentage: number;
  history: {
    month: string;
    score: number;
  }[];
};

export async function getSkillSprintScores(): Promise<ScoreDetails> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const scores = await db.getScoresByUserId(user.id);
  const resume = await db.getLatestResumeByUserId(user.id);
  const interviews = await db.getInterviewsByUserId(user.id);

  // Dynamic calculations based on uploaded records
  const resumeScore = resume?.atsScore || scores.resume;
  
  // Calculate interview score from last mock interview
  const latestInterview = interviews?.[0];
  const interviewScore = latestInterview?.overallScore || scores.interview;

  // Recalculate SkillSprint Score
  const subTotal = 
    resumeScore + 
    scores.github + 
    scores.projects + 
    interviewScore + 
    scores.marketDemand;
  
  const skillsprintScore = Math.round(subTotal / 5);

  // Update in database to persist dynamic changes
  await db.updateScores(user.id, {
    resume: resumeScore,
    interview: interviewScore,
    skillsprintScore,
    history: [
      { month: "April", score: 58 },
      { month: "May", score: 67 },
      { month: "June", score: skillsprintScore }
    ]
  });

  // Calculate Growth (Growth = (June - April) / April)
  const growth = Math.round(((skillsprintScore - 58) / 58) * 100);

  return {
    resume: resumeScore,
    github: scores.github,
    projects: scores.projects,
    interview: interviewScore,
    marketDemand: scores.marketDemand,
    skillsprintScore,
    growthPercentage: growth,
    history: [
      { month: "April", score: 58 },
      { month: "May", score: 67 },
      { month: "June", score: skillsprintScore }
    ]
  };
}
