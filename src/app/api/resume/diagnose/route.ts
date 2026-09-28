import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "GEMINI_API_KEY not set" });
  }

  const results: Record<string, any> = {};

  // Test current available Gemini models (updated as of 2026)
  const tests = [
    { id: "gemini-3.5-flash-lite-v1beta", model: "gemini-3.5-flash-lite", apiVersion: "v1beta" },
    { id: "gemini-3.5-flash-v1beta", model: "gemini-3.5-flash", apiVersion: "v1beta" },
    { id: "gemini-2.5-flash-v1beta", model: "gemini-2.5-flash", apiVersion: "v1beta" },
    { id: "gemini-flash-latest-v1beta", model: "gemini-flash-latest", apiVersion: "v1beta" },
    { id: "gemini-3.8-flash-v1beta", model: "gemini-3.8-flash", apiVersion: "v1beta" },
  ];

  for (const t of tests) {
    try {
      const url = `https://generativelanguage.googleapis.com/${t.apiVersion}/models/${t.model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Say hello" }] }],
          generationConfig: { maxOutputTokens: 50 },
        }),
      });
      const status = res.status;
      const body = await res.text();
      results[t.id] = { status, ok: res.ok, snippet: body.slice(0, 200) };
    } catch (e: any) {
      results[t.id] = { error: e.message };
    }
  }

  return NextResponse.json({ ok: true, results, keyPresent: true, keyPrefix: apiKey.slice(0, 6) + "..." });
}
