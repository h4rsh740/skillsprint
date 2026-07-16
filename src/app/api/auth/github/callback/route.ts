import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getSessionUser } from "@/actions/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const step = "[GitHub OAuth → Callback]";
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const returnedState = searchParams.get("state");

  console.log(`${step} Callback received. code=${code ? "present" : "missing"} error=${error || "none"}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 0. Resolve stable base URL (same logic as /api/auth/github/route.ts)
  // ─────────────────────────────────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  let baseUrl: string;

  if (appUrl) {
    baseUrl = appUrl;
  } else {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    baseUrl = `${proto}://${host}`;
  }

  const redirectUri = `${baseUrl}/api/auth/github/callback`;
  const onboardingUrl = `${baseUrl}/onboarding`;
  const signinUrl = `${baseUrl}/auth/signin`;
  const dashboardGithubUrl = `${baseUrl}/dashboard/github`;

  console.log(`${step} Base URL: ${baseUrl}`);
  console.log(`${step} Redirect URI for token exchange: ${redirectUri}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Validate CSRF state — prefer HMAC verification (works cross-domain),
  //    fall back to cookie comparison for same-domain flows.
  // ─────────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  cookieStore.delete("github_oauth_state");

  let stateValid = false;

  if (returnedState) {
    if (returnedState.includes(":")) {
      // HMAC-signed state: nonce:signature
      const [nonce, signature] = returnedState.split(":");
      const secret = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || "skillsprint-oauth-secret";
      const expectedSig = crypto.createHmac("sha256", secret).update(nonce).digest("hex");
      stateValid = signature === expectedSig;
    } else {
      // Legacy cookie-based state
      const expectedState = cookieStore.get("github_oauth_state")?.value;
      stateValid = !!(expectedState && returnedState === expectedState);
    }
  }

  if (!stateValid) {
    console.error(`${step} OAuth state validation failed.`);
    return NextResponse.redirect(`${onboardingUrl}?error=${encodeURIComponent("GitHub OAuth state validation failed. Please try connecting again.")}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Handle GitHub OAuth errors (user denied, etc.)
  // ─────────────────────────────────────────────────────────────────────────
  if (error) {
    console.error(`${step} GitHub returned an error: ${error} — ${errorDescription}`);
    return NextResponse.redirect(`${onboardingUrl}?error=${encodeURIComponent(errorDescription || "GitHub authorization was denied or failed.")}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Require real credentials — remove all mock fallbacks
  // ─────────────────────────────────────────────────────────────────────────
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.error(`${step} GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set in environment variables.`);
    return NextResponse.redirect(`${onboardingUrl}?error=${encodeURIComponent("GitHub OAuth credentials are not configured in production.")}`);
  }

  if (!code) {
    console.error(`${step} No authorization code present in callback URL.`);
    return NextResponse.redirect(`${onboardingUrl}?error=${encodeURIComponent("No authorization code was returned from GitHub.")}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Require an active user session (must be logged in via Google/email first)
  // ─────────────────────────────────────────────────────────────────────────
  const currentUser = await getSessionUser();
  if (!currentUser) {
    console.error(`${step} No active user session found. User must be signed in before connecting GitHub.`);
    return NextResponse.redirect(`${signinUrl}?error=${encodeURIComponent("Session expired. Please sign in and then connect GitHub again.")}`);
  }

  const userId = currentUser.id;
  console.log(`${step} Active session found for user: ${userId}`);

  try {
    // ─────────────────────────────────────────────────────────────────────
    // 5. Exchange authorization code for access token
    // ─────────────────────────────────────────────────────────────────────
    console.log(`${step} Exchanging authorization code for access token...`);

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error(`${step} Token exchange HTTP error ${tokenRes.status}: ${errBody}`);
      throw new Error(`Token exchange failed with status ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    console.log(`${step} Token exchange response keys: ${Object.keys(tokenData).join(", ")}`);

    if (tokenData.error) {
      console.error(`${step} GitHub token error: ${tokenData.error} — ${tokenData.error_description}`);
      throw new Error(tokenData.error_description || tokenData.error || "GitHub token exchange failed");
    }

    const access_token = tokenData.access_token;
    const scopes = (tokenData.scope || "").split(",").map((s: string) => s.trim()).filter(Boolean);

    if (!access_token) {
      console.error(`${step} No access_token in response. Full response: ${JSON.stringify(tokenData)}`);
      throw new Error("No access token returned from GitHub. The authorization code may have expired or already been used.");
    }

    console.log(`${step} Token exchange successful. Scopes: ${scopes.join(", ")}`);

    // ─────────────────────────────────────────────────────────────────────
    // 6. Fetch authenticated GitHub user profile
    // ─────────────────────────────────────────────────────────────────────
    console.log(`${step} Fetching GitHub user profile...`);

    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${access_token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "SkillSprint-AI"
      }
    });

    if (!profileRes.ok) {
      const errBody = await profileRes.text();
      console.error(`${step} GitHub profile fetch failed ${profileRes.status}: ${errBody}`);
      throw new Error(`Failed to retrieve GitHub user profile (HTTP ${profileRes.status})`);
    }

    const profileData = await profileRes.json();
    console.log(`${step} GitHub profile fetched: login=${profileData.login}, public_repos=${profileData.public_repos}`);

    // ─────────────────────────────────────────────────────────────────────
    // 7. Persist to database — best effort (don't block OAuth success)
    // ─────────────────────────────────────────────────────────────────────
    console.log(`${step} Saving GitHub account to database...`);

    try {
      await db.saveGitHubAccount(userId, {
        username: profileData.login,
        displayName: profileData.name || profileData.login,
        avatarUrl: profileData.avatar_url || "",
        email: profileData.email || currentUser.email,
        publicRepos: profileData.public_repos || 0,
        privateRepos: profileData.total_private_repos || 0
      });
      console.log(`${step} Saving encrypted OAuth token...`);
      await db.saveOAuthToken(userId, "github", {
        accessToken: encrypt(access_token),
        scopes
      });
      console.log(`${step} Updating profile with GitHub username: ${profileData.login}`);
      await db.updateProfile(userId, { githubUsername: profileData.login });
    } catch (dbErr: any) {
      console.warn(`${step} DB save failed (continuing anyway):`, dbErr.message);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 8. Update Firestore record (non-blocking — Firestore may be offline)
    // ─────────────────────────────────────────────────────────────────────
    try {
      const userRef = doc(firestoreDb, "users", userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        await updateDoc(userRef, { githubConnected: true });
        console.log(`${step} Firestore githubConnected updated to true.`);
      }
    } catch (fErr) {
      console.warn(`${step} Firestore update skipped (non-critical):`, fErr);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 9. Log sync history — best effort
    // ─────────────────────────────────────────────────────────────────────
    try {
      await db.createSyncHistory(userId, {
        provider: "github",
        status: "success",
        details: { username: profileData.login, scopes }
      });
    } catch (_) {}

    console.log(`${step} GitHub OAuth complete.`);

    // ─────────────────────────────────────────────────────────────────────
    // 10. Determine redirect target — go forward to step 3 (Resume Upload)
    // ─────────────────────────────────────────────────────────────────────
    const targetUrl = currentUser.onboardingCompleted ? dashboardGithubUrl : `${onboardingUrl}?step=3`;
    console.log(`${step} onboardingCompleted=${currentUser.onboardingCompleted}. Redirecting to: ${targetUrl}`);

    return NextResponse.redirect(targetUrl);

  } catch (err: any) {
    console.error(`${step} Error during GitHub OAuth callback:`, err.message, err.stack);

    try {
      await db.createSyncHistory(userId, {
        provider: "github",
        status: "failed",
        details: { error: err.message }
      });
    } catch (_) {}

    return NextResponse.redirect(`${onboardingUrl}?error=${encodeURIComponent(err.message || "GitHub connection failed.")}`);
  }
}
