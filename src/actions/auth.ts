"use server";

import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import nodemailer from "nodemailer";

async function isSecureOrigin(): Promise<boolean> {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const xForwardedProto = headersList.get("x-forwarded-proto");
  
  // Local network / development hosts
  const isLocal = 
    host.includes("localhost") || 
    host.includes("127.0.0.1") || 
    host.startsWith("192.168.") || 
    host.startsWith("10.") || 
    host.startsWith("172.");
    
  return xForwardedProto === "https" || (!isLocal && process.env.NODE_ENV === "production");
}

// Sync OAuth User from Supabase client to PostgreSQL via Prisma
export async function syncOAuthUser(supabaseUserId: string, email: string, role: "STUDENT" | "RECRUITER" = "STUDENT") {
  try {
    console.log(`[syncOAuthUser] --- START AUTH SYNC ---`);
    console.log(`[syncOAuthUser] Firebase UID: "${supabaseUserId}"`);
    console.log(`[syncOAuthUser] Email: "${email}"`);

    let user = await db.findUserByEmail(email);
    console.log(`[syncOAuthUser] findUserByEmail result:`, user ? { id: user.id, email: user.email } : null);

    let migrationOccurred = false;
    let userCreationOccurred = false;

    if (!user) {
      console.log(`[syncOAuthUser] User not found by email. Creating new user record with ID: "${supabaseUserId}"`);
      user = await db.createUser({
        id: supabaseUserId,
        email,
        role: role === "STUDENT" ? "STUDENT" : "RECRUITER",
      });
      userCreationOccurred = true;
    } else if (user.id !== supabaseUserId) {
      console.log(`[syncOAuthUser] Mismatch detected: Database User ID "${user.id}" !== Firebase UID "${supabaseUserId}". Migrating record...`);
      try {
        await db.migrateUserId(user.id, supabaseUserId);
        migrationOccurred = true;

        // Re-fetch the migrated user by the new ID
        const migratedUser = await db.findUserById(supabaseUserId);
        if (migratedUser) {
          user = migratedUser;
        } else {
          console.warn("[syncOAuthUser] Re-fetching migrated user returned null. Using in-memory fallback user object.");
          user = {
            id: supabaseUserId,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt || new Date().toISOString(),
            profile: user.profile
          };
        }
      } catch (migrateErr: any) {
        console.error("[syncOAuthUser] Database migration failed, using in-memory fallback user object:", migrateErr);
        user = {
          id: supabaseUserId,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt || new Date().toISOString(),
          profile: user.profile
        };
      }
    }

    console.log(`[syncOAuthUser] Final Database User ID: "${user.id}"`);
    console.log(`[syncOAuthUser] Creation occurred: ${userCreationOccurred}`);
    console.log(`[syncOAuthUser] Migration occurred: ${migrationOccurred}`);

    // Encode session info into cookie
    const sessionPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    const cookieValue = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const cookieStore = await cookies();
    const secure = await isSecureOrigin();
    cookieStore.set("session_user_id", cookieValue, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    console.log(`[syncOAuthUser] Set session_user_id cookie (encoded)`);
    console.log(`[syncOAuthUser] --- END AUTH SYNC ---`);

    return { success: true, user: { id: user.id, email: user.email, role: user.role } };
  } catch (error: any) {
    console.error("[syncOAuthUser] Error syncing OAuth user:", error);
    return { success: false, error: error.message };
  }
}

// Get the currently authenticated session user
export async function getSessionUser() {
  const headersList = await headers();
  const referer = headersList.get("referer") || "Unknown Path";
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");
  const sessionVal = cookieStore.get("session_user_id")?.value;

  console.log(`[getSessionUser] --- START SESSION CHECK ---`);
  console.log(`[getSessionUser] Referer: "${referer}"`);
  console.log(`[getSessionUser] Cookie session_user_id: "${sessionVal}"`);

  if (!sessionVal) {
    console.warn(`[getSessionUser] session_user_id cookie is missing.`);
    console.log(`[getSessionUser] --- END SESSION CHECK (FAILED) ---`);
    return null;
  }

  // Parse Base64 session payload if present
  let sessionData: { id: string; email: string; role: string } | null = null;
  if (sessionVal.startsWith("ey") || (sessionVal.startsWith("{") && sessionVal.endsWith("}"))) {
    try {
      const decoded = sessionVal.startsWith("ey")
        ? Buffer.from(sessionVal, 'base64').toString('utf8')
        : sessionVal;
      sessionData = JSON.parse(decoded);
      console.log(`[getSessionUser] Decoded session cookie data:`, sessionData);
    } catch (e: any) {
      console.warn(`[getSessionUser] Failed to parse session cookie:`, e.message);
    }
  }

  const userId = sessionData ? sessionData.id : sessionVal;

  try {
    let user = await db.findUserById(userId);
    console.log(`[getSessionUser] findUserById result:`, user ? { id: user.id, email: user.email } : null);

    if (!user && sessionData) {
      console.warn(`[getSessionUser] User ID "${userId}" not found in database. Using cookie session fallback data.`);
      user = {
        id: sessionData.id,
        email: sessionData.email,
        role: sessionData.role as any,
        createdAt: new Date().toISOString(),
        profile: null
      };
    }

    if (!user) {
      console.warn(`[getSessionUser] User ID "${userId}" not found in database and no session fallback available.`);
      console.log(`[getSessionUser] --- END SESSION CHECK (FAILED) ---`);
      return null;
    }

    // Load profile or fallback
    let profile = user.profile;
    if (!profile) {
      profile = await db.getProfileByUserId(userId);
    }

    console.log(`[getSessionUser] Session check successful for user: "${user.id}"`);
    console.log(`[getSessionUser] --- END SESSION CHECK ---`);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: profile || {
        id: "fallback-profile",
        userId: user.id,
        fullName: "SkillSprint Student",
        targetRole: "Software Developer",
        college: "N/A",
        cgpa: 8.5,
        skills: ["React", "JavaScript"],
        updatedAt: new Date()
      },
    };
  } catch (error: any) {
    console.error(`[getSessionUser] Database error during lookup. User ID: "${userId}". Error: ${error.message}`, error);
    console.log(`[getSessionUser] --- END SESSION CHECK (ERROR) ---`);
    return null;
  }
}

// Sign Out User
export async function signOutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("session_user_id");
  return { success: true };
}

// Send 2FA Verification Email
export async function sendVerificationEmail(email: string, code: string) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    try {
      console.log("SMTP environment variables not configured. Falling back to auto-generated Ethereal test mail...");
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await transporter.sendMail({
        from: '"SkillSprint AI" <noreply@skillsprint.ai>',
        to: email,
        subject: "SkillSprint AI - 2FA Verification Code",
        text: `Your 2FA verification code is: ${code}. Note: This is a test email sent via Ethereal.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #4f46e5; text-align: center; font-weight: bold; margin-bottom: 24px;">SkillSprint AI</h2>
            <p style="font-size: 14px; color: #334155; line-height: 1.5;">Hello,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.5;">We received a sign-in or registration request. Please use the following 6-digit verification code to complete your authentication:</p>
            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a; margin: 24px 0;">
              ${code}
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
              Note: This is a test email generated via Ethereal because SMTP credentials are not configured in .env.local.
            </p>
          </div>
        `,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("Ethereal Email sent successfully! Preview URL: %s", previewUrl);
      return { success: true, previewUrl };
    } catch (e: any) {
      console.error("Failed to send Ethereal email fallback:", e);
      return { success: false, error: e.message };
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: `"SkillSprint AI" <${user}>`,
      to: email,
      subject: "SkillSprint AI - 2FA Verification Code",
      text: `Your 2FA verification code is: ${code}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; text-align: center; font-weight: bold; margin-bottom: 24px;">SkillSprint AI</h2>
          <p style="font-size: 14px; color: #334155; line-height: 1.5;">Hello,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.5;">We received a sign-in or registration request. Please use the following 6-digit verification code to complete your authentication:</p>
          <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a; margin: 24px 0;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 24px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            If you did not request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error("SMTP direct send failed:", error);
    return { success: false, error: error.message };
  }
}

