import type {
  AtsResult, EnhanceResponse, JobInput, KeywordAnalysis, ResumeData, ResumeIssue,
} from "./types";
import { enhanceResponseSchema } from "./schemas";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiError extends Error {
  constructor(message: string, public code: string, public retryAfterMs = 0) {
    super(message);
    this.name = "GeminiError";
  }
}

const DEFAULT_MODEL = "gemini-2.0-flash";

/** Strip markdown code fences and extract the first JSON object. */
function extractJson(content: string): string {
  let text = content.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
}

async function callOpenRouter(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ResumeIQ AI"
    },
    body: JSON.stringify({
      model: model || "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.3,
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new Error("Empty OpenRouter response.");
  }
  return text;
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const modelInstance = genAI.getGenerativeModel({
      model: model,
      systemInstruction: system,
    });

    const result = await modelInstance.generateContent({
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();
    if (!text || !text.trim()) {
      throw new GeminiError("Empty Gemini response.", "EMPTY");
    }
    return text;
  } catch (err: any) {
    const errMsg = err?.message || "";
    if (errMsg.includes("429") || errMsg.includes("quota")) {
      throw new GeminiError("Gemini rate limit reached or quota exceeded.", "RATE_LIMIT");
    }
    if (errMsg.includes("API key")) {
      throw new GeminiError("Invalid Gemini API key or unauthorized access.", "AUTH");
    }
    throw new GeminiError(`Gemini request failed: ${errMsg}`, "UPSTREAM");
  }
}

/**
 * Enhance a resume via Google Gemini (with OpenRouter fallback when rate-limited).
 */
export async function enhanceResumeWithGemini(
  resume: ResumeData,
  job: JobInput,
  keywords: KeywordAnalysis,
  ats: AtsResult,
  issues: ResumeIssue[]
): Promise<EnhanceResponse> {
  const system = buildSystemPrompt();
  const user = buildUserPrompt(resume, job, keywords, ats, issues);

  let lastError: unknown;
  
  // Try Gemini first
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  
  if (apiKey) {
    // Try models in order of preference — first working one wins
    const modelsToTry = [
      process.env.GEMINI_MODEL,   // user-configured model (may be undefined)
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
    ].filter(Boolean) as string[];

    // Deduplicate while preserving order
    const uniqueModels = [...new Set(modelsToTry)];

    for (const modelId of uniqueModels) {
      try {
        console.log(`[AI] Trying Google Gemini model: ${modelId}`);
        const content = await callGemini(apiKey, modelId, system, user);
        const jsonStr = extractJson(content);
        const raw = JSON.parse(jsonStr);
        const parsed = enhanceResponseSchema.safeParse(raw);
        if (!parsed.success) {
          console.warn(`[AI] Schema validation failed for model ${modelId}, trying next...`);
          lastError = new GeminiError("Gemini response failed schema validation.", "SCHEMA");
          continue;
        }
        console.log(`[AI] Success with model: ${modelId}`);
        return {
          enhancedResume: parsed.data.enhancedResume,
          changes: parsed.data.changes.map((c, i) => ({ ...c, id: c.id || `change-${i + 1}` })),
          recommendations: parsed.data.recommendations,
        };
      } catch (err) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI] Model ${modelId} failed:`, errMsg.slice(0, 200));
        
        // Stop immediately on auth errors — no point trying more models
        if (errMsg.includes("API key") || errMsg.includes("unauthorized") || errMsg.includes("403")) {
          break;
        }
        // Otherwise (404 model not found, 400, 429 rate limit) — continue to next model
        continue;
      }
    }
  }

  // Fallback to OpenRouter if Gemini failed or is not configured
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

  if (openRouterKey) {
    console.log("[AI] Falling back to OpenRouter API (Llama 3.3)...");
    try {
      const content = await callOpenRouter(openRouterKey, openRouterModel, system, user);
      const jsonStr = extractJson(content);
      const raw = JSON.parse(jsonStr);
      const parsed = enhanceResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error("OpenRouter response failed schema validation.");
      }
      return {
        enhancedResume: parsed.data.enhancedResume,
        changes: parsed.data.changes.map((c, i) => ({ ...c, id: c.id || `change-${i + 1}` })),
        recommendations: parsed.data.recommendations,
      };
    } catch (err: any) {
      console.error("[AI] OpenRouter fallback also failed:", err.message);
      lastError = err;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new GeminiError("Resume enhancement failed on both Gemini and OpenRouter.", "FAILED");
}

export { DEFAULT_MODEL as GEMINI_DEFAULT_MODEL };
export { DEFAULT_MODEL };
