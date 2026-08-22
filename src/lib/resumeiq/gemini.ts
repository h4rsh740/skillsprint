import type {
  AtsResult, EnhanceResponse, JobInput, KeywordAnalysis, ResumeData, ResumeIssue,
} from "./types";
import { enhanceResponseSchema } from "./schemas";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { enhanceLocally } from "./localEnhancer";

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
      "HTTP-Referer": "https://skillsprint-umber.vercel.app",
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

/**
 * Call Gemini via direct REST API — avoids SDK v1beta path issues on Vercel.
 */
async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  apiVersion = "v1beta"
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: [{ text: system }],
    },
    contents: [
      { role: "user", parts: [{ text: user }] }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new GeminiError(
      `Gemini API error (${res.status}) [${apiVersion}/${model}]: ${errBody.slice(0, 300)}`,
      res.status === 429 ? "RATE_LIMIT" : res.status === 403 ? "AUTH" : "UPSTREAM"
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || !text.trim()) {
    throw new GeminiError("Empty Gemini response.", "EMPTY");
  }
  return text;
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

  // Try Gemini first — iterate through models until one works
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    // Try free Gemini models on both v1beta and v1 endpoints — first working one wins
    const modelsToTry: Array<{ model: string; apiVersion: string }> = [
      // User-configured model first
      ...(process.env.GEMINI_MODEL ? [
        { model: process.env.GEMINI_MODEL, apiVersion: "v1beta" },
      ] : []),
      // Current free-tier Gemini models (updated names as of 2025)
      { model: "gemini-3.5-flash-lite",  apiVersion: "v1beta" },
      { model: "gemini-3.6-flash",       apiVersion: "v1beta" },
      { model: "gemini-3.5-flash",       apiVersion: "v1beta" },
      { model: "gemini-2.5-flash-lite",  apiVersion: "v1beta" },
      { model: "gemini-2.5-flash",       apiVersion: "v1beta" },
    ];

    for (const { model: modelId, apiVersion } of modelsToTry) {
      try {
        console.log(`[AI] Trying ${apiVersion}/models/${modelId}`);
        const content = await callGemini(apiKey, modelId, system, user, apiVersion);
        const jsonStr = extractJson(content);
        const raw = JSON.parse(jsonStr);
        const parsed = enhanceResponseSchema.safeParse(raw);
        if (!parsed.success) {
          console.warn(`[AI] Schema validation failed for ${modelId}:`, parsed.error.issues.slice(0, 3));
          lastError = new GeminiError("Gemini response failed schema validation.", "SCHEMA");
          continue;
        }
        console.log(`[AI] Success with model: ${modelId}`);
        
        // Strict Validation: Strip any hallucinated explicit skills.
        const originalSkills = new Set(resume.skills.map(s => s.toLowerCase()));
        parsed.data.enhancedResume.skills = parsed.data.enhancedResume.skills.filter(s => 
          originalSkills.has(s.toLowerCase())
        );

        return {
          enhancedResume: parsed.data.enhancedResume,
          changes: parsed.data.changes.map((c, i) => ({ ...c, id: c.id || `change-${i + 1}` })),
          recommendations: parsed.data.recommendations,
        };
      } catch (err) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI] Model ${modelId} failed:`, errMsg.slice(0, 200));
        // Auth errors — stop immediately
        if (errMsg.includes("AUTH") || errMsg.includes("403") || errMsg.includes("API key")) {
          break;
        }
        // All other errors (404, 400, rate limit) — try next model
        continue;
      }
    }
  }

  // Fallback to OpenRouter — free models only
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  // Try multiple free OpenRouter models in sequence
  const openRouterFreeModels = [
    process.env.OPENROUTER_MODEL,
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
  ].filter(Boolean) as string[];

  if (openRouterKey) {
    for (const orModel of [...new Set(openRouterFreeModels)]) {
      console.log(`[AI] Trying OpenRouter free model: ${orModel}`);
      try {
        const content = await callOpenRouter(openRouterKey, orModel, system, user);
        const jsonStr = extractJson(content);
        const raw = JSON.parse(jsonStr);
        const parsed = enhanceResponseSchema.safeParse(raw);
        if (!parsed.success) {
          console.warn(`[AI] OpenRouter schema validation failed for ${orModel}`);
          lastError = new Error("OpenRouter response failed schema validation.");
          continue;
        }
        console.log(`[AI] Success with OpenRouter model: ${orModel}`);
        return {
          enhancedResume: parsed.data.enhancedResume,
          changes: parsed.data.changes.map((c, i) => ({ ...c, id: c.id || `change-${i + 1}` })),
          recommendations: parsed.data.recommendations,
        };
      } catch (err: any) {
        console.warn(`[AI] OpenRouter model ${orModel} failed:`, err.message?.slice(0, 150));
        lastError = err;
        continue;
      }
    }
  }

  // Final fallback: offline, rule-based enhancer.
  // Guarantees the feature works even when no AI keys are configured (e.g. on Vercel)
  // or when every AI provider is rate-limited / unreachable. Safe rewrites only —
  // the result is still passed through the anti-hallucination validator downstream.
  const reason =
    !apiKey && !openRouterKey
      ? "no AI API keys configured"
      : lastError instanceof Error
        ? lastError.message.slice(0, 200)
        : "all AI providers unavailable";
  console.warn(`[AI] Falling back to offline local enhancer (${reason}).`);

  const local = enhanceLocally(resume, job, keywords);
  return {
    enhancedResume: local.enhancedResume,
    changes: local.changes.map((c, i) => ({ ...c, id: c.id || `change-${i + 1}` })),
    recommendations: local.recommendations.map((r) => ({
      title: "ATS Recommendation",
      description: r,
    })),
  };
}

export { DEFAULT_MODEL as GEMINI_DEFAULT_MODEL };
export { DEFAULT_MODEL };
