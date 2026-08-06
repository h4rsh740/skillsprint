import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, syncOAuthUser } from "@/actions/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Helper: get user from session cookie OR Firebase ID token in Authorization header
async function getAuthorizedUser(request: NextRequest) {
  // 1. Try session cookie first (normal flow)
  const userFromCookie = await getSessionUser();
  if (userFromCookie) return userFromCookie;

  // 2. Fallback: accept Firebase ID token in Authorization header
  // This handles the race condition where syncOAuthUser hasn't set the cookie yet
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.slice(7);
    try {
      // Decode the JWT payload (base64 middle section) to get uid/email
      const parts = idToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        const uid: string = payload.user_id || payload.sub || "";
        const email: string = payload.email || "";
        if (uid && email) {
          // Sync creates the session cookie server-side and returns the user
          const syncResult = await syncOAuthUser(uid, email, "STUDENT");
          if (syncResult.success && syncResult.user) {
            return {
              id: syncResult.user.id,
              email: syncResult.user.email,
              role: syncResult.user.role,
              name: (syncResult.user as any).name || email.split("@")[0],
              githubConnected: false,
              linkedinConnected: false,
              resumeUploaded: false,
              careerTwinGenerated: false,
              onboardingCompleted: false,
              profile: null,
            } as any;
          }
        }
      }
    } catch (tokenErr) {
      console.warn("[onboard] Failed to decode Bearer token:", tokenErr);
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthorizedUser(request);
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


export async function POST(request: NextRequest) {
  try {
    const user = await getAuthorizedUser(request);
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
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthorizedUser(request);
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
