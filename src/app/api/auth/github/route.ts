import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const step = "[GitHub OAuth → Start]";

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Determine the stable production callback URL.
  //    Priority:
  //    a) NEXT_PUBLIC_APP_URL env var  (always set on Vercel to your production domain)
  //    b) x-forwarded-host + x-forwarded-proto from Vercel edge (reliable for prod)
  //    c) host header fallback for localhost only
  // ─────────────────────────────────────────────────────────────────────────
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const currentBaseUrl = `${proto}://${host}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  // Always use the registered production callback domain for GitHub OAuth handshake
  const targetBaseUrl = appUrl || currentBaseUrl;
  const redirectUri = `${targetBaseUrl}/api/auth/github/callback`;

  console.log(`${step} Current base URL: ${currentBaseUrl}, target base URL: ${targetBaseUrl}`);
  console.log(`${step} Redirect URI: ${redirectUri}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Require real credentials — no mock fallback
  // ─────────────────────────────────────────────────────────────────────────
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.error(`${step} GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not configured.`);
    const errorUrl = `${currentBaseUrl}/onboarding?error=${encodeURIComponent("GitHub OAuth is not configured. Please contact the administrator.")}`;
    return NextResponse.redirect(errorUrl);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Generate HMAC-signed state (self-validating, no cookie needed)
  //    state = nonce:HMAC-SHA256(nonce, APP_SECRET):base64(initiatorBaseUrl)
  //    This avoids cross-domain cookie loss between preview and prod URLs.
  // ─────────────────────────────────────────────────────────────────────────
  const nonce = crypto.randomBytes(24).toString("hex");
  const secret = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || "skillsprint-oauth-secret";
  const hmac = crypto.createHmac("sha256", secret).update(nonce).digest("hex");
  const base64Url = Buffer.from(currentBaseUrl).toString("base64");
  const state = `${nonce}:${hmac}:${base64Url}`;

  // Also set cookie as a fallback for same-domain flows
  const cookieStore = await cookies();
  cookieStore.set("github_oauth_state", nonce, {
    httpOnly: true,
    secure: currentBaseUrl.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Build GitHub Authorization URL
  // ─────────────────────────────────────────────────────────────────────────
  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set("redirect_uri", redirectUri);
  githubAuthUrl.searchParams.set("scope", "read:user user:email repo read:org");
  githubAuthUrl.searchParams.set("state", state);

  console.log(`${step} Redirecting to GitHub: ${githubAuthUrl.toString()}`);
  return NextResponse.redirect(githubAuthUrl.toString());
}
