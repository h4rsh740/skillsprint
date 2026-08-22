import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "GEMINI_API_KEY not set" });
  }

  const results: Record<string, any> = {};

  // Test each model on both v1 and v1beta
  const tests = [
    { id: "gemini-2.0-flash-lite-v1beta", model: "gemini-2.0-flash-lite", apiVersion: "v1beta" },
    { id: "gemini-2.0-flash-v1beta", model: "gemini-2.0-flash", apiVersion: "v1beta" },
    { id: "gemini-2.0-flash-exp-v1beta", model: "gemini-2.0-flash-exp", apiVersion: "v1beta" },
    { id: "gemini-1.5-flash-v1beta", model: "gemini-1.5-flash", apiVersion: "v1beta" },
    { id: "gemini-1.5-flash-v1", model: "gemini-1.5-flash", apiVersion: "v1" },
    { id: "gemini-1.5-flash-latest-v1", model: "gemini-1.5-flash-latest", apiVersion: "v1" },
    { id: "gemini-1.5-flash-001-v1", model: "gemini-1.5-flash-001", apiVersion: "v1" },
    { id: "gemini-pro-v1beta", model: "gemini-pro", apiVersion: "v1beta" },
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
