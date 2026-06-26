import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/actions/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const host = request.headers.get("host") || "localhost:3000";
  const xForwardedProto = request.headers.get("x-forwarded-proto");
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.");
  const protocol = xForwardedProto || (isLocal ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/auth/linkedin/callback`;

  const onboardingRedirectUrl = `${protocol}://${host}/onboarding`;
  const loginRedirectUrl = `${protocol}://${host}/auth/signin`;

  if (error) {
    console.error("LinkedIn OAuth error:", error, errorDescription);
    return NextResponse.redirect(`${loginRedirectUrl}?error=${encodeURIComponent(errorDescription || "LinkedIn login failed")}`);
  }

  // Get current logged-in user session if available
  const currentUser = await getSessionUser();

  // FALLBACK: If client keys are not set, log in a mock LinkedIn user
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET || code === "mock-linkedin-code") {
    console.warn("LinkedIn client credentials not configured. Logging in/connecting mock LinkedIn profile...");
    
    let targetUserId = currentUser?.id;
    let onboardingCompleted = false;

    if (!targetUserId) {
      // Legacy behavior: If not logged in, sign in with a mock LinkedIn user
      targetUserId = "linkedin-mock-sub-123456";
      
      const userRef = doc(firestoreDb, "users", targetUserId);
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: targetUserId,
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
          onboardingCompleted = !!data?.onboardingCompleted;
        }

        // Write user to Postgres/local DB
        await db.createUser({
          id: targetUserId,
          email: "alex.rivera@linkedin.com",
          role: "STUDENT"
        });
      } catch (e) {
        console.error("Firestore check failed:", e);
      }

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set("session_user_id", targetUserId, {
        httpOnly: true,
        secure: protocol === "https",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
    }

    try {
      // Connect LinkedIn details to the target user (current or mock)
      await db.saveLinkedInAccount(targetUserId, {
        username: currentUser ? (currentUser.profile?.fullName || "candidate").toLowerCase().replace(/\s+/g, "-") : "linkedin-candidate",
        displayName: currentUser ? currentUser.profile?.fullName || "SkillSprint Candidate" : "LinkedIn Profile",
        headline: "Software Engineer III at Google | Tech Lead",
        about: "Passionate engineer focusing on microservices, caching, cloud architectures, and AI Twin pipelines.",
        avatarUrl: currentUser?.profile?.avatarUrl || currentUser?.profile?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
        skills: ["React", "TypeScript", "Node.js", "Docker", "AWS", "System Design"],
        experience: [
          { company: "Google", role: "Software Engineer III", date: "2024 - Present" },
          { company: "Tech Solutions", role: "SDE II", date: "2022 - 2024" }
        ],
        education: [
          { institution: "University of Washington", degree: "M.S. Computer Science", date: "2020 - 2022" }
        ],
        certificates: [
          { title: "AWS Solutions Architect Associate", issuer: "Amazon" }
        ]
      });

      await db.saveOAuthToken(targetUserId, "linkedin", {
        accessToken: encrypt("mock-linkedin-access-token-xyz"),
        scopes: ["openid", "profile", "email"]
      });

      // Update connectivity
      await db.updateProfile(targetUserId, {
        linkedinUrl: "https://linkedin.com/in/alex-rivera-sde"
      });

      try {
        const userRef = doc(firestoreDb, "users", targetUserId);
        await updateDoc(userRef, { linkedinConnected: true });
      } catch (fErr) {
        console.warn("Firestore update skipped:", fErr);
      }

      // Sync history track
      await db.createSyncHistory(targetUserId, {
        provider: "linkedin",
        status: "success",
        details: { message: "Mock LinkedIn profile linked successfully" }
      });

      return NextResponse.redirect(
        currentUser ? `${onboardingRedirectUrl}` : (onboardingCompleted ? `${protocol}://${host}/dashboard` : `${protocol}://${host}/onboarding`)
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
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
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

    const { access_token, expires_in } = await tokenRes.json();

    // 2. Fetch LinkedIn OpenID Connect profile info
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      throw new Error("Failed to retrieve LinkedIn user information");
    }

    const profile = await profileRes.json();
    
    // Determine the user ID to bind to
    let targetUserId = currentUser?.id;
    let onboardingCompleted = false;

    if (!targetUserId) {
      // Legacy behavior: If not logged in, sign in with LinkedIn sub as primary ID
      targetUserId = `linkedin-${profile.sub}`;
      const userRef = doc(firestoreDb, "users", targetUserId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: targetUserId,
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
        onboardingCompleted = !!data?.onboardingCompleted;
      }

      // Sync with Postgres/local DB
      await db.createUser({
        id: targetUserId,
        email: profile.email || "",
        role: "STUDENT"
      });

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set("session_user_id", targetUserId, {
        httpOnly: true,
        secure: protocol === "https",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
    }

    // 3. Save LinkedIn Account details and encrypted token
    await db.saveLinkedInAccount(targetUserId, {
      username: profile.sub,
      displayName: profile.name || `${profile.given_name} ${profile.family_name}`,
      avatarUrl: profile.picture || "",
      headline: "Software Engineer Candidate",
      about: "SkillSprint candidate seeking new opportunities.",
      skills: ["React", "JavaScript", "TypeScript"],
      experience: [],
      education: [],
      projects: []
    });

    await db.saveOAuthToken(targetUserId, "linkedin", {
      accessToken: encrypt(access_token),
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : undefined,
      scopes: ["openid", "profile", "email"]
    });

    // Update connection status
    try {
      const userRef = doc(firestoreDb, "users", targetUserId);
      await updateDoc(userRef, { linkedinConnected: true });
    } catch (fErr) {
      console.warn("Firestore update skipped:", fErr);
    }

    // Sync history log
    await db.createSyncHistory(targetUserId, {
      provider: "linkedin",
      status: "success",
      details: { username: profile.name }
    });

    // 4. Redirect user based on context
    return NextResponse.redirect(
      currentUser ? `${onboardingRedirectUrl}` : (onboardingCompleted ? `${protocol}://${host}/dashboard` : `${protocol}://${host}/onboarding`)
    );
  } catch (err: any) {
    console.error("LinkedIn exchange/profile error:", err);
    return NextResponse.redirect(`${loginRedirectUrl}?error=${encodeURIComponent(err.message || "LinkedIn connection failed")}`);
  }
}
