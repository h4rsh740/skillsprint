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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  let baseUrl: string;

  if (appUrl) {
    // Explicit env var always wins — guarantees a stable production domain
    baseUrl = appUrl;
    console.log(`${step} Using NEXT_PUBLIC_APP_URL as base: ${baseUrl}`);
  } else {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    baseUrl = `${proto}://${host}`;
    console.log(`${step} Derived base URL from headers: ${baseUrl}`);
  }

  const redirectUri = `${baseUrl}/api/auth/github/callback`;
  console.log(`${step} Redirect URI: ${redirectUri}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Require real credentials — no mock fallback
  // ─────────────────────────────────────────────────────────────────────────
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.error(`${step} GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not configured.`);
    const errorUrl = `${baseUrl}/onboarding?error=${encodeURIComponent("GitHub OAuth is not configured. Please contact the administrator.")}`;
    return NextResponse.redirect(errorUrl);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Generate and persist a CSRF state token (validated in the callback)
  // ─────────────────────────────────────────────────────────────────────────
  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("github_oauth_state", state, {
    httpOnly: true,
    secure: baseUrl.startsWith("https"),
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
