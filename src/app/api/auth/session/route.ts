import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/actions/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ user: null });
    }

    const clientUser = {
      uid: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      photoURL: sessionUser.profile?.avatarUrl || sessionUser.profile?.photoURL || "",
      provider: sessionUser.githubConnected ? "github" : "google",
      githubConnected: sessionUser.githubConnected,
      linkedinConnected: sessionUser.linkedinConnected,
      resumeUploaded: sessionUser.resumeUploaded,
      careerTwinGenerated: sessionUser.careerTwinGenerated,
      onboardingCompleted: sessionUser.onboardingCompleted,
      role: sessionUser.role
    };

    return NextResponse.json({ user: clientUser });
  } catch (err: any) {
    console.error("Error reading session:", err);
    return NextResponse.json({ user: null, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session_user_id");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
