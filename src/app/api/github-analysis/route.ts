import { NextResponse } from "next/server";
import { getSessionUser } from "@/actions/auth";
import { analyzeGitHub } from "@/actions/github";
import { requirePayment } from "@/lib/x402";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const paymentError = await requirePayment(request as any, { endpoint: "githubAnalysis" });
    if (paymentError) return paymentError;

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await analyzeGitHub(body.username);

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("GitHub analysis API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
