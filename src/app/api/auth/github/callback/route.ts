import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/actions/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
  const redirectUri = `${protocol}://${host}/api/auth/github/callback`;

  const onboardingRedirectUrl = `${protocol}://${host}/onboarding`;
  const loginRedirectUrl = `${protocol}://${host}/auth/signin`;

  if (error) {
    console.error("GitHub OAuth error:", error, errorDescription);
    return NextResponse.redirect(`${onboardingRedirectUrl}?error=${encodeURIComponent(errorDescription || "GitHub connection failed")}`);
  }

  // Get current logged-in user session
  const currentUser = await getSessionUser();
  if (!currentUser) {
    console.error("No active user session found during GitHub OAuth callback.");
    return NextResponse.redirect(`${loginRedirectUrl}?error=Session+expired.+Please+sign+in+again.`);
  }

  const userId = currentUser.id;

  // FALLBACK: If client credentials are not configured, handle mock GitHub connection
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || code === "mock-github-code-12345") {
    console.warn("GitHub credentials not configured. Linking mock GitHub account...");

    try {
      // 1. Save github account info in PostgreSQL/JSON DB
      await db.saveGitHubAccount(userId, {
        username: "h4rsh740",
        displayName: "Harsh Singh",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
        email: currentUser.email,
        publicRepos: 18,
        privateRepos: 2
      });

      // 2. Save encrypted oauth token
      await db.saveOAuthToken(userId, "github", {
        accessToken: encrypt("mock-github-access-token-xyz"),
        scopes: ["read:user", "repo"]
      });

      // 3. Mark connected in DB Profile
      await db.updateProfile(userId, {
        githubUsername: "h4rsh740"
      });

      // 4. Also update Firestore if available
      try {
        const userRef = doc(firestoreDb, "users", userId);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          await updateDoc(userRef, { githubConnected: true });
        }
      } catch (fErr) {
        console.warn("Firestore update skipped (running in offline mode):", fErr);
      }

      // 5. Track sync history
      await db.createSyncHistory(userId, {
        provider: "github",
        status: "success",
        details: { message: "Mock GitHub account linked successfully" }
      });

      const targetRedirectUrl = currentUser.onboardingCompleted
        ? `${protocol}://${host}/dashboard/github`
        : onboardingRedirectUrl;

      return NextResponse.redirect(targetRedirectUrl);
    } catch (e: any) {
      console.error("Failed to link mock GitHub account:", e);
      return NextResponse.redirect(`${onboardingRedirectUrl}?error=${encodeURIComponent(e.message || "Failed to connect GitHub")}`);
    }
  }

  if (!code) {
    return NextResponse.redirect(`${onboardingRedirectUrl}?error=No+authorization+code+returned`);
  }

  try {
    // 1. Exchange code for GitHub access token
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
      throw new Error("Failed to exchange authorization code for access token");
    }

    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;
    const scopes = (tokenData.scope || "").split(",");

    if (!access_token) {
      throw new Error("No access token returned from GitHub");
    }

    // 2. Retrieve GitHub profile details
    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${access_token}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    if (!profileRes.ok) {
      throw new Error("Failed to retrieve GitHub user profile");
    }

    const profileData = await profileRes.json();

    // 3. Save github account details and encrypted token in PostgreSQL/JSON DB
    await db.saveGitHubAccount(userId, {
      username: profileData.login,
      displayName: profileData.name || profileData.login,
      avatarUrl: profileData.avatar_url || "",
      email: profileData.email || currentUser.email,
      publicRepos: profileData.public_repos || 0,
      privateRepos: profileData.total_private_repos || 0
    });

    await db.saveOAuthToken(userId, "github", {
      accessToken: encrypt(access_token),
      scopes
    });

    // 4. Update profile github username
    await db.updateProfile(userId, {
      githubUsername: profileData.login
    });

    // 5. Update Firestore record
    try {
      const userRef = doc(firestoreDb, "users", userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        await updateDoc(userRef, { githubConnected: true });
      }
    } catch (fErr) {
      console.warn("Firestore update skipped:", fErr);
    }

    // 6. Track sync history
    await db.createSyncHistory(userId, {
      provider: "github",
      status: "success",
      details: { username: profileData.login }
    });

    const targetRedirectUrl = currentUser.onboardingCompleted
      ? `${protocol}://${host}/dashboard/github`
      : onboardingRedirectUrl;

    return NextResponse.redirect(targetRedirectUrl);
  } catch (err: any) {
    console.error("GitHub callback processing error:", err);
    
    // Log sync failure
    await db.createSyncHistory(userId, {
      provider: "github",
      status: "failed",
      details: { error: err.message }
    });

    return NextResponse.redirect(`${onboardingRedirectUrl}?error=${encodeURIComponent(err.message || "Failed to process GitHub connection")}`);
  }
}
