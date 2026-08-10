import { NextResponse } from "next/server";
import { getSessionUser } from "@/actions/auth";
import { generateRoadmap } from "@/actions/roadmap";
import { requirePayment } from "@/lib/x402";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const paymentError = await requirePayment(request as any, { endpoint: "roadmapGeneration" });
    if (paymentError) return paymentError;

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const result = await generateRoadmap(formData);

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("Roadmap generation API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
