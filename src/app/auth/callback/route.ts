import { NextResponse } from "next/server";
import { syncOAuthUser } from "@/actions/auth";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const roleParam = requestUrl.searchParams.get("role") || "STUDENT";
  const role = roleParam === "RECRUITER" ? "RECRUITER" : "STUDENT";

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Create server-side supabase client to handle exchange
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      }
    });

    try {
      // Exchange code for token
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;

      const session = data.session;
      if (session?.user) {
        // Sync user profile to Postgres via Prisma and set the Next.js session cookie
        const syncResult = await syncOAuthUser(
          session.user.id,
          session.user.email || "",
          role
        );
        
        const finalRole = syncResult.user?.role || role;
        
        // Redirect based on role and onboarding status
        if (finalRole === "STUDENT") {
          return NextResponse.redirect(`${requestUrl.origin}/onboarding`);
        } else {
          return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
        }
      }
    } catch (err) {
      console.error("OAuth callback exchange failed:", err);
    }
  }

  // Fallback to signin on failure
  return NextResponse.redirect(`${requestUrl.origin}/auth/signin?error=oauth-failed`);
}
