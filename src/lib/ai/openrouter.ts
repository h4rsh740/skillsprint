import OpenAI from "openai";

/**
 * OpenRouter Centralized AI Gateway for SkillSprint AI
 *
 * Configurable via:
 * - OPENROUTER_API_KEY
 * - OPENROUTER_MODEL (defaults to "anthropic/claude-3.5-sonnet" or "google/gemini-2.0-flash-001")
 *
 * Provides structured JSON parsing, safe retries, timeout protection,
 * Google Gemini fallback, and zero leakage of credentials.
 */

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "SkillSprint AI Career Intelligence",
    },
    timeout: 20000,
  });
}

/**
 * Call Gemini API directly as a secondary fallback if OpenRouter is unreachable or throttled
 */
async function callGeminiFallback(
  prompt: string,
  systemInstruction?: string,
  responseJson = true
): Promise<string | null> {
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!geminiApiKey) return null;

  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-3.5-flash-lite",
  ];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const payload: any = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2500,
        },
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      if (responseJson) {
        payload.generationConfig.responseMimeType = "application/json";
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch {
      continue;
    }
  }

  return null;
}

export type OpenRouterOptions = {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  responseJson?: boolean;
};

/**
 * Executes a structured prompt via OpenRouter with JSON extraction & fallback
 */
export async function analyzeWithOpenRouter<T = any>(
  prompt: string,
  options: OpenRouterOptions = {}
): Promise<{ success: boolean; data: T | null; rawText?: string; providerUsed: "openrouter" | "gemini" | "deterministic"; error?: string }> {
  const model = options.model || DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 3000;
  const responseJson = options.responseJson ?? true;

  const client = getOpenAIClient();

  // 1. Attempt OpenRouter primary
  if (client) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const messages: any[] = [];
        if (options.systemInstruction) {
          messages.push({ role: "system", content: options.systemInstruction });
        }
        messages.push({ role: "user", content: prompt });

        const completion = await client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: responseJson ? { type: "json_object" } : undefined,
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          if (!responseJson) {
            return { success: true, data: content as any, rawText: content, providerUsed: "openrouter" };
          }
          try {
            const parsed = parseSafeJSON<T>(content);
            if (parsed) {
              return { success: true, data: parsed, rawText: content, providerUsed: "openrouter" };
            }
          } catch (jsonErr) {
            console.warn(`[OpenRouter] JSON parse retry on attempt ${attempt}`);
          }
        }
      } catch (err: any) {
        console.warn(`[OpenRouter] Attempt ${attempt} failed:`, err?.message || err);
      }
    }
  }

  // 2. Attempt Google Gemini secondary fallback
  try {
    const geminiText = await callGeminiFallback(prompt, options.systemInstruction, responseJson);
    if (geminiText) {
      if (!responseJson) {
        return { success: true, data: geminiText as any, rawText: geminiText, providerUsed: "gemini" };
      }
      const parsed = parseSafeJSON<T>(geminiText);
      if (parsed) {
        return { success: true, data: parsed, rawText: geminiText, providerUsed: "gemini" };
      }
    }
  } catch (geminiErr: any) {
    console.warn("[Gemini Fallback] Failed:", geminiErr?.message || geminiErr);
  }

  return {
    success: false,
    data: null,
    providerUsed: "deterministic",
    error: "AI gateways unavailable or returned unparseable content",
  };
}

/**
 * Extracts and safely parses JSON from markdown code blocks or raw strings
 */
export function parseSafeJSON<T = any>(input: string): T | null {
  if (!input) return null;
  let clean = input.trim();

  // Strip ```json ... ``` code fences
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  }

  // Try direct parse
  try {
    return JSON.parse(clean) as T;
  } catch {
    // Attempt greedy object/array extraction
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const extracted = clean.substring(firstBrace, lastBrace + 1);
        return JSON.parse(extracted) as T;
      } catch {}
    }

    const firstBracket = clean.indexOf("[");
    const lastBracket = clean.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        const extracted = clean.substring(firstBracket, lastBracket + 1);
        return JSON.parse(extracted) as T;
      } catch {}
    }
  }

  return null;
}
