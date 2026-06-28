import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/actions/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    // Read session manually so this Route Handler can access cookies
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get("session_user_id")?.value;
    if (!rawCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatHistory }: { chatHistory: ChatMessage[] } = await req.json();

    // Parallel DB fetches
    const [profile, resume, careerTwin] = await Promise.all([
      db.getProfileByUserId(user.id),
      db.getLatestResumeByUserId(user.id),
      db.getLatestCareerTwin(user.id),
    ]);

    const systemPrompt = `You are a world-class tech career coach AI at SkillSprint. You are speaking to a student named ${profile?.fullName || "Candidate"}.

Student Context:
- Email: ${user.email}
- Target Role: ${profile?.targetRole || "Software Developer"}
- College: ${profile?.college || "N/A"}
- CGPA: ${profile?.cgpa || "8.5"}
- Current Skills: ${profile?.skills?.join(", ") || "React, JavaScript"}
- Latest Resume ATS Score: ${resume?.atsScore || 75}/100
- Latest Placement Probability: ${resume?.placementProbability || 65}%
- Salary Target / Prediction: ${careerTwin?.salaryProjection || "₹12L - ₹18L / yr"}

Instructions:
1. Your personality is empathetic, structured, and practical. Give short, actionable recommendations. Do not use generic corporate filler.
2. Whenever recommending skills to learn, roadmap milestones, or interview preparation:
   - Always suggest 1-2 high-quality free learning resources.
   - Recommend specific top-tier YouTube channels or free-to-audit Coursera courses.
   - Provide direct, valid clickable links in markdown format: [Resource Name](URL).

Conversational History:
${chatHistory.map((m) => `${m.role === "user" ? "Student" : "Coach"}: ${m.content}`).join("\n")}

Answer the last question with concrete steps.`;

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // ── Gemini Streaming ──────────────────────────────────────────────────────
    if (geminiApiKey) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:streamGenerateContent?alt=sse&key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!geminiRes.ok || !geminiRes.body) {
        const errText = await geminiRes.text();
        console.error("Gemini streaming error:", errText);
        return NextResponse.json({ error: "AI service error" }, { status: 502 });
      }

      // Pipe SSE from Gemini → client as plain text chunks
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const reader = geminiRes.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    controller.enqueue(encoder.encode(text));
                  }
                } catch {
                  // skip malformed chunk
                }
              }
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // ── Fallback (no API key) ─────────────────────────────────────────────────
    const fallback =
      `Hey ${profile?.fullName?.split(" ")[0] || "Candidate"}, as your SkillSprint coach, I'm analyzing your current target role of *${profile?.targetRole || "Software Developer"}*. ` +
      `Your placement probability is at **${resume?.placementProbability || 65}%**. ` +
      `How can I help you today? We can discuss:\n1. Optimizing your Resume ATS Score.\n2. Reviewing your Career Twin projections.\n3. Practicing for a specific target company.`;

    return new Response(fallback, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
