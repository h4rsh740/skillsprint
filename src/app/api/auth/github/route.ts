import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = request.headers.get("host") || "localhost:3000";
  const xForwardedProto = request.headers.get("x-forwarded-proto");
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.");
  const protocol = xForwardedProto || (isLocal ? "http" : "https");
  
  const redirectUri = `${protocol}://${host}/api/auth/github/callback`;

  // Fallback: If GitHub Client ID is not configured, redirect directly to callback for local mock login
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.warn("GitHub credentials not configured in .env.local. Redirecting to mock callback...");
    return NextResponse.redirect(`${redirectUri}?code=mock-github-code-12345&state=skillsprint_github_oauth_state`);
  }

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set("redirect_uri", redirectUri);
  githubAuthUrl.searchParams.set("scope", "read:user user:email repo read:org"); // Request expanded scopes
  githubAuthUrl.searchParams.set("state", "skillsprint_github_oauth_state");

  return NextResponse.redirect(githubAuthUrl.toString());
}
