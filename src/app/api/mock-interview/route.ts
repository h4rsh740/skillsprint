import { NextResponse } from "next/server";
import { getSessionUser } from "@/actions/auth";
import { generateInterviewQuestions, submitInterviewAnswers } from "@/actions/interview";
import { requirePayment } from "@/lib/x402";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const paymentError = await requirePayment(request as any, { endpoint: "mockInterview" });
    if (paymentError) return paymentError;

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    if (body.action === "submit" && Array.isArray(body.answers)) {
      const evaluation = await submitInterviewAnswers(body.answers);
      return NextResponse.json({ success: true, evaluation });
    }

    const questions = await generateInterviewQuestions();
    return NextResponse.json({ success: true, questions });
  } catch (err: any) {
    console.error("Mock interview API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
