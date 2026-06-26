"use server";

import { generateStructuredAIResponse, MODELS } from "@/lib/ai";
import { db } from "@/lib/db";
import { getSessionUser } from "./auth";

export type PortfolioAuditResult = {
  id: string;
  portfolioUrl: string;
  designScore: number;
  performanceScore: number;
  seoScore: number;
  suggestions: string[];
  createdAt: string;
};

export async function getPortfolioAudit(): Promise<PortfolioAuditResult | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const latest = await db.getPortfolioAudit(user.id);
  if (!latest) return null;

  return {
    id: latest.id,
    portfolioUrl: latest.portfolioUrl,
    designScore: latest.designScore,
    performanceScore: latest.performanceScore,
    seoScore: latest.seoScore,
    suggestions: latest.suggestions || [],
    createdAt: latest.createdAt
  };
}

export async function auditPortfolio(formData: FormData): Promise<PortfolioAuditResult> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const portfolioUrl = (formData.get("portfolioUrl") as string) || "https://yourportfolio.dev";

  const prompt = `Analyze this developer portfolio URL: ${portfolioUrl}. Audit design, performance, SEO, and return improvement recommendations.`;
  const systemPrompt = `You are a web auditor. Review the portfolio URL and return scores (0-100) and suggestions. Return a JSON object matching this schema:
  {
    "designScore": 0-100,
    "performanceScore": 0-100,
    "seoScore": 0-100,
    "suggestions": ["suggestion 1", "suggestion 2"]
  }`;

  const simulatedPayload = {
    designScore: 84,
    performanceScore: 78,
    seoScore: 82,
    suggestions: [
      "Compress hero banner image assets to improve Initial Input Delay from 2.8s to under 1.2s.",
      "Add description and keyword meta tags to optimize crawling indices on Google and Bing.",
      "Adjust body contrast ratios on dark mode layouts to satisfy WCAG AA accessibility standards.",
      "Include a clickable link pointing directly to your AI Career Twin timeline validation page."
    ]
  };

  const aiResult = await generateStructuredAIResponse(
    prompt,
    systemPrompt,
    MODELS.CAREER_TWIN,
    simulatedPayload
  );

  const audit = await db.savePortfolioAudit(user.id, {
    portfolioUrl,
    designScore: aiResult.designScore,
    performanceScore: aiResult.performanceScore,
    seoScore: aiResult.seoScore,
    suggestions: aiResult.suggestions
  });

  return {
    id: audit.id,
    portfolioUrl: audit.portfolioUrl,
    designScore: audit.designScore,
    performanceScore: audit.performanceScore,
    seoScore: audit.seoScore,
    suggestions: audit.suggestions,
    createdAt: audit.createdAt
  };
}
