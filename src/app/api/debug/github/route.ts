import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/github
 *
 * Safe read-only diagnostics for GitHub OAuth configuration.
 * Never exposes secret values — only reports presence/absence.
 */
export async function GET(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "unknown";
  const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  const baseUrl = appUrl || `${proto}://${host}`;
  const callbackUrl = `${baseUrl}/api/auth/github/callback`;

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    github: {
      clientIdConfigured: !!process.env.GITHUB_CLIENT_ID,
      clientSecretConfigured: !!process.env.GITHUB_CLIENT_SECRET,
      githubTokenConfigured: !!process.env.GITHUB_TOKEN,
    },
    appUrl: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "(not set)",
      derivedBaseUrl: baseUrl,
      callbackUrl,
    },
    requestHeaders: {
      host,
      xForwardedHost: request.headers.get("x-forwarded-host") || "(not set)",
      xForwardedProto: request.headers.get("x-forwarded-proto") || "(not set)",
      xVercelDeploymentUrl: request.headers.get("x-vercel-deployment-url") || "(not set)",
    },
    ai: {
      geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
    },
    instructions: [
      "If callbackUrl does not match your GitHub OAuth App's 'Authorization callback URL', OAuth will fail.",
      "Set NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app in Vercel environment variables.",
      "Make sure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set in Vercel → Settings → Environment Variables.",
      "Register callback URL in GitHub → Settings → Developer Settings → OAuth Apps → Your App.",
    ],
  };

  return NextResponse.json(diagnostics, { status: 200 });
}
