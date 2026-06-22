import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/auth/linkedin/callback`;

  const loginRedirectUrl = `${protocol}://${host}/auth/signin`;

  if (error) {
    console.error("LinkedIn OAuth error:", error, errorDescription);
    return NextResponse.redirect(`${loginRedirectUrl}?error=${encodeURIComponent(errorDescription || "LinkedIn login failed")}`);
  }

  // FALLBACK: If client keys are not set, log in a mock LinkedIn user for local testing
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    console.warn("LinkedIn client credentials not configured. Logging in with mock LinkedIn profile...");
    
    const mockUid = "linkedin-mock-sub-123456";
    const userRef = doc(db, "users", mockUid);
    
    try {
      const userSnap = await getDoc(userRef);
      let onboardingCompleted = false;

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: mockUid,
          name: "Alex Rivera (LinkedIn)",
          email: "alex.rivera@linkedin.com",
          photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
          provider: "linkedin",
          createdAt: new Date().toISOString(),
          githubConnected: false,
          linkedinConnected: true,
          careerTwinGenerated: false,
          onboardingCompleted: false,
          role: "STUDENT"
        });
      } else {
        const data = userSnap.data();
        onboardingCompleted = !!data.onboardingCompleted;
      }

      const cookieStore = await cookies();
      cookieStore.set("session_user_id", mockUid, {
        httpOnly: true,
        secure: protocol === "https",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return NextResponse.redirect(
        onboardingCompleted ? `${protocol}://${host}/dashboard` : `${protocol}://${host}/onboarding`
      );
    } catch (e: any) {
      console.error("Failed to authenticate mock LinkedIn user:", e);
      return NextResponse.redirect(`${loginRedirectUrl}?error=${encodeURIComponent(e.message || "Failed to login")}`);
    }
  }

  if (!code) {
    return NextResponse.redirect(`${loginRedirectUrl}?error=No+authorization+code+returned`);
  }

  try {
    // 1. Exchange code for LinkedIn access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application-x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json();
      throw new Error(errData.error_description || "Failed to exchange authorization code for access token");
    }

    const { access_token } = await tokenRes.json();

    // 2. Fetch LinkedIn OpenID Connect profile info
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      throw new Error("Failed to retrieve LinkedIn user information");
    }

    const profile = await profileRes.json();
    const linkedinUid = `linkedin-${profile.sub}`;
    
    // 3. Sync profile to Firestore
    const userRef = doc(db, "users", linkedinUid);
    const userSnap = await getDoc(userRef);
    let onboardingCompleted = false;

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: linkedinUid,
        name: profile.name || `${profile.given_name} ${profile.family_name}` || "LinkedIn User",
        email: profile.email || "",
        photoURL: profile.picture || "",
        provider: "linkedin",
        createdAt: new Date().toISOString(),
        githubConnected: false,
        linkedinConnected: true,
        careerTwinGenerated: false,
        onboardingCompleted: false,
        role: "STUDENT"
      });
    } else {
      const data = userSnap.data();
      onboardingCompleted = !!data.onboardingCompleted;
    }

    // 4. Set HTTP-Only Session Cookie
    const cookieStore = await cookies();
    cookieStore.set("session_user_id", linkedinUid, {
      httpOnly: true,
      secure: protocol === "https",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    // 5. Redirect user based on onboarding status
    return NextResponse.redirect(
      onboardingCompleted ? `${protocol}://${host}/dashboard` : `${protocol}://${host}/onboarding`
    );
  } catch (err: any) {
    console.error("LinkedIn exchange/profile error:", err);
    return NextResponse.redirect(`${loginRedirectUrl}?error=${encodeURIComponent(err.message || "Authentication failed")}`);
  }
}
