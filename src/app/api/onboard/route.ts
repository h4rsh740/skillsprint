import { NextResponse } from "next/server";
import { getSessionUser } from "@/actions/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const profile = await db.getProfileByUserId(user.id);
    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error("Onboarding profile get endpoint error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const formData = await request.formData();
    const fullName = formData.get("fullName") as string;
    const college = formData.get("college") as string;
    const branch = formData.get("branch") as string;
    const graduationYear = parseInt(formData.get("graduationYear") as string) || new Date().getFullYear() + 2;
    const cgpa = parseFloat(formData.get("cgpa") as string) || 8.0;
    const targetRole = formData.get("targetRole") as string;
    const skillsString = formData.get("skills") as string;

    if (!fullName || !college || !targetRole) {
      return NextResponse.json({ success: false, error: "Missing required profile fields" }, { status: 400 });
    }

    const skills = skillsString
      ? skillsString.split(",").map(s => s.trim()).filter(Boolean)
      : ["React", "JavaScript"];

    // Build a local profile object to return even if DB is unavailable
    const localProfile = { userId: user.id, fullName, college, branch, graduationYear, cgpa, targetRole, skills };

    let profile: any = localProfile;
    try {
      profile = await db.upsertProfile(user.id, { fullName, college, branch, graduationYear, cgpa, targetRole, skills });
    } catch (dbErr: any) {
      console.warn("[onboard POST] DB profile save failed (continuing anyway):", dbErr.message);
    }

    // Write activity log — best effort
    try {
      await db.createActivityLog({ userId: user.id, action: "PROFILE_UPDATED", details: { targetRole, cgpa } });
    } catch (_) {}

    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error("Onboarding profile endpoint error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Mark onboarding as completed in the DB
export async function PATCH() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Persist onboardingCompleted=true — best effort
    try {
      await db.updateProfile(user.id, { onboardingCompleted: true });
    } catch (dbErr: any) {
      console.warn("[onboard PATCH] DB update failed (continuing anyway):", dbErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Onboarding complete PATCH error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
