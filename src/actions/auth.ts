"use server";

import { db } from "@/lib/db";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";

// Sync OAuth User from Supabase client to PostgreSQL via Prisma
export async function syncOAuthUser(supabaseUserId: string, email: string, role: "STUDENT" | "RECRUITER" = "STUDENT") {
  try {
    let user = await db.findUserByEmail(email);

    if (!user) {
      user = await db.createUser({
        id: supabaseUserId, // use the same UUID from Supabase auth for matching consistency
        email,
        role: role === "STUDENT" ? "STUDENT" : "RECRUITER",
      });
    }

    const cookieStore = await cookies();
    cookieStore.set("session_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return { success: true, user: { id: user.id, email: user.email, role: user.role } };
  } catch (error: any) {
    console.error("Error syncing OAuth user:", error);
    return { success: false, error: error.message };
  }
}

// Standard Email/Password Sign Up
export async function signUpUser(email: string, passwordHash: string, role: "STUDENT" | "RECRUITER") {
  try {
    const existing = await db.findUserByEmail(email);
    if (existing) {
      return { success: false, error: "User already exists" };
    }

    const user = await db.createUser({
      email,
      passwordHash, // Store password hash
      role: role === "STUDENT" ? "STUDENT" : "RECRUITER",
    });

    const cookieStore = await cookies();
    cookieStore.set("session_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return { success: true, user: { id: user.id, email: user.email, role: user.role } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Standard Email/Password Sign In
export async function signInUser(email: string, passwordHash: string) {
  try {
    const user = await db.findUserByEmail(email);

    if (!user || user.passwordHash !== passwordHash) {
      return { success: false, error: "Invalid email or password" };
    }

    const cookieStore = await cookies();
    cookieStore.set("session_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return { success: true, user: { id: user.id, email: user.email, role: user.role } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get the currently authenticated session user
export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_user_id")?.value;
    if (!userId) return null;

    const user = await db.findUserById(userId);

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
    };
  } catch (e) {
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

