import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Feature flag: LinkedIn OAuth is gated off in favor of consolidated Firebase Auth
const ENABLE_LINKEDIN_AUTH = process.env.ENABLE_LINKEDIN_AUTH === "true";

export async function GET(request: Request) {
  if (!ENABLE_LINKEDIN_AUTH) {
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const loginRedirectUrl = `${protocol}://${host}/auth/signin?error=${encodeURIComponent(
      "LinkedIn OAuth is currently disabled. Primary authentication is consolidated to Firebase Auth."
    )}`;
    return NextResponse.redirect(loginRedirectUrl);
  }

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/auth/linkedin/callback`;

  const linkedinAuthUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  linkedinAuthUrl.searchParams.set("response_type", "code");
  linkedinAuthUrl.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID || "");
  linkedinAuthUrl.searchParams.set("redirect_uri", redirectUri);
  linkedinAuthUrl.searchParams.set("state", "skillsprint_linkedin_oauth_state");
  linkedinAuthUrl.searchParams.set("scope", "openid profile email");

  return NextResponse.redirect(linkedinAuthUrl.toString());
}

