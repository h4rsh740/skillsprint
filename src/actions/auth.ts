"use server";

import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import nodemailer from "nodemailer";
import { encrypt } from "@/lib/encryption";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";

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

    // Resolve details to send back to client auth context
    const details = await resolveUserSessionDetails(user.id, user.email, user.role);

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

    return { 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        ...details
      } 
    };
  } catch (error: any) {
    console.error("[syncOAuthUser] Error syncing OAuth user:", error);
    return { success: false, error: error.message };
  }
}

// Get the currently authenticated session user with full details resolved
export async function getSessionUser() {
  const headersList = await headers();
  const referer = headersList.get("referer") || "Unknown Path";
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get("session_user_id")?.value;

  if (!sessionVal) {
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
    } catch (e: any) {
      console.warn(`[getSessionUser] Failed to parse session cookie:`, e.message);
    }
  }

  const userId = sessionData ? sessionData.id : sessionVal;

  try {
    let user = await db.findUserById(userId);

    if (!user && sessionData) {
      user = {
        id: sessionData.id,
        email: sessionData.email,
        role: sessionData.role as any,
        createdAt: new Date().toISOString(),
        profile: null
      };
    }

    if (!user) {
      return null;
    }

    // Load profile or fallback
    let profile = user.profile;
    if (!profile) {
      profile = await db.getProfileByUserId(userId);
    }

    const details = await resolveUserSessionDetails(user.id, user.email, user.role, profile);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: details.name,
      githubConnected: details.githubConnected,
      linkedinConnected: details.linkedinConnected,
      resumeUploaded: details.resumeUploaded,
      careerTwinGenerated: details.careerTwinGenerated,
      onboardingCompleted: details.onboardingCompleted,
      profile: profile || {
        id: "fallback-profile",
        userId: user.id,
        fullName: details.name,
        targetRole: "Software Developer",
        college: "N/A",
        cgpa: 8.5,
        skills: ["React", "JavaScript"],
        updatedAt: new Date()
      },
    };
  } catch (error: any) {
    console.error(`[getSessionUser] Database error during lookup. User ID: "${userId}". Error: ${error.message}`, error);
    return null;
  }
}

/**
 * Helper to resolve prioritized welcome back name, connection statuses and onboarding state
 */
async function resolveUserSessionDetails(userId: string, email: string, role: string, profileInput?: any) {
  const profile = profileInput || await db.getProfileByUserId(userId);
  const githubAccount = await db.getGitHubAccountByUserId(userId);
  const linkedinAccount = await db.getLinkedInAccountByUserId(userId);
  const resume = await db.getLatestResumeFile(userId);
  const twin = await db.getLatestCareerTwin(userId);

  // Welcome Username Priorities:
  // 1. LinkedIn Full Name
  // 2. GitHub Name
  // 3. Google/Profile Full Name
  // 4. Email Username
  let name = "";
  if (linkedinAccount?.displayName) {
    name = linkedinAccount.displayName;
  } else if (githubAccount?.displayName) {
    name = githubAccount.displayName;
  } else if (githubAccount?.username) {
    name = githubAccount.username;
  } else if (profile?.fullName) {
    name = profile.fullName;
  } else if (email) {
    name = email.split("@")[0];
  }

  const githubConnected = !!githubAccount;
  const linkedinConnected = !!linkedinAccount;
  const resumeUploaded = !!resume;
  const careerTwinGenerated = !!twin;

  // Onboarding is complete if the profile has core fields filled in.
  // We also check the DB-stored flag as a reliable override for returning users.
  let profileOnboardingDone = !!(profile?.onboardingCompleted);

  // Since onboardingCompleted is not in the Prisma schema, try raw query check on production
  if (!profileOnboardingDone) {
    try {
      const { prisma } = require("@/lib/prisma");
      const rawRes: any = await prisma.$queryRaw`
        SELECT "onboardingCompleted" FROM profiles WHERE "userId" = ${userId} LIMIT 1
      `;
      if (rawRes && rawRes[0] && rawRes[0].onboardingCompleted) {
        profileOnboardingDone = true;
      }
    } catch (rawErr) {
      // Ignore if column doesn't exist or query fails
    }
  }

  const derivedOnboardingDone = !!(profile?.targetRole && profile?.college);
  const onboardingCompleted = profileOnboardingDone || derivedOnboardingDone;

  return {
    name,
    githubConnected,
    linkedinConnected,
    resumeUploaded,
    careerTwinGenerated,
    onboardingCompleted
  };
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

// Link GitHub account and trigger automatic analysis upon sign-in
export async function linkGitHubAccountOnSignIn(
  userId: string,
  accessToken: string,
  username: string,
  displayName: string,
  avatarUrl: string
) {
  try {
    console.log(`[linkGitHubAccountOnSignIn] Linking GitHub account for User ID: "${userId}", Username: "${username}"`);

    // 1. Save GitHub account details to database
    await db.saveGitHubAccount(userId, {
      username,
      displayName: displayName || username,
      avatarUrl: avatarUrl || "",
      email: ""
    });

    // 2. Save encrypted access token
    await db.saveOAuthToken(userId, "github", {
      accessToken: encrypt(accessToken),
      scopes: ["read:user", "user:email", "repo", "read:org"]
    });

    // 3. Update profile to set githubUsername
    await db.updateProfile(userId, {
      githubUsername: username
    });

    // 4. Update Firestore connected status
    try {
      const userRef = doc(firestoreDb, "users", userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        await updateDoc(userRef, { githubConnected: true });
      }
    } catch (fErr) {
      console.warn("Firestore update skipped during link (offline/test mode):", fErr);
    }

    // 5. Create sync history log
    await db.createSyncHistory(userId, {
      provider: "github",
      status: "success",
      details: { username, message: "GitHub account linked on sign-in successfully" }
    });

    // 6. Trigger repository analysis in background asynchronously
    import("./github").then(({ analyzeGitHub }) => {
      analyzeGitHub(username).catch(err => console.error("Auto GitHub analysis failed:", err));
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to link GitHub account on sign-in:", error);
    return { success: false, error: error.message };
  }
}

// Disconnect GitHub account and clear references
export async function disconnectGitHub() {
  try {
    const user = await getSessionUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Delete GitHub account, tokens, and analysis from database
    await db.deleteGitHubAccount(user.id);

    // 2. Clear githubUsername from profile so session refresh reflects disconnected state
    try {
      await db.updateProfile(user.id, {
        githubUsername: null
      });
    } catch (profileErr) {
      console.warn("Profile githubUsername clear failed (non-critical):", profileErr);
    }

    // 3. Clear firebase status (best-effort — don't fail if Firestore is offline)
    try {
      const userRef = doc(firestoreDb, "users", user.id);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        await updateDoc(userRef, { githubConnected: false });
      }
    } catch (fErr) {
      console.warn("Firestore update skipped during disconnect (offline/test mode):", fErr);
    }

    // 4. Create sync history log (best-effort)
    try {
      await db.createSyncHistory(user.id, {
        provider: "github",
        status: "failed",
        details: { message: "GitHub account disconnected by user" }
      });
    } catch (logErr) {
      console.warn("Sync history log failed (non-critical):", logErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to disconnect GitHub account:", error);
    return { success: false, error: error.message };
  }
}
