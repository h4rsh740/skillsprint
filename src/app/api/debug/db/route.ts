import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    databaseConnection: "checking",
    errors: [],
    details: {}
  };

  // 1. Check environment variables (safely)
  const dbUrl = process.env.DATABASE_URL || "";
  diagnostics.details.env = {
    DATABASE_URL_set: !!dbUrl,
    DATABASE_URL_length: dbUrl.length,
    DATABASE_URL_protocol: dbUrl.split(":")[0] || "none",
    DATABASE_URL_host: dbUrl.includes("@") ? dbUrl.split("@")[1].split("/")[0] : "none",
    DIRECT_URL_set: !!process.env.DIRECT_URL,
  };

  // 2. Query Prisma
  try {
    const start = Date.now();
    
    // Quick test query
    const userCount = await prisma.user.count();
    const duration = Date.now() - start;
    
    diagnostics.databaseConnection = "success";
    diagnostics.details.queryDurationMs = duration;
    diagnostics.details.counts = {
      users: userCount,
      profiles: await prisma.profile.count().catch(e => {
        diagnostics.errors.push(`Profiles count failed: ${e.message}`);
        return -1;
      }),
      jobs: await prisma.job.count().catch(e => {
        diagnostics.errors.push(`Jobs count failed: ${e.message}`);
        return -1;
      }),
      hackathons: await prisma.hackathon.count().catch(e => {
        diagnostics.errors.push(`Hackathons count failed: ${e.message}`);
        return -1;
      }),
    };

    // Test querying onboardingCompleted column specifically
    try {
      const firstProfile = await prisma.profile.findFirst();
      diagnostics.details.profileSchema = {
        hasRecord: !!firstProfile,
        fieldsAvailable: firstProfile ? Object.keys(firstProfile) : [],
        onboardingCompletedFieldType: firstProfile ? typeof (firstProfile as any).onboardingCompleted : "unknown"
      };
    } catch (profileErr: any) {
      diagnostics.errors.push(`Profile query failed: ${profileErr.message}`);
    }

  } catch (err: any) {
    diagnostics.databaseConnection = "failed";
    diagnostics.errors.push(`Database connection failed: ${err.message}`);
    if (err.code) diagnostics.details.prismaErrorCode = err.code;
    if (err.meta) diagnostics.details.prismaErrorMeta = err.meta;
  }

  // 3. Fallback error capture (global error listener in prisma.ts)
  const latestGlobalError = (globalThis as any).latestPrismaError;
  if (latestGlobalError) {
    diagnostics.details.latestGlobalPrismaError = {
      message: latestGlobalError.message,
      code: latestGlobalError.code,
      meta: latestGlobalError.meta
    };
  }

  return NextResponse.json(diagnostics, { status: diagnostics.errors.length > 0 ? 500 : 200 });
}
