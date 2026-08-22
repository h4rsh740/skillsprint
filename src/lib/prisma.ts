import { PrismaClient } from "@prisma/client";

// Note: The Supabase project is hosted on the aws-1 cluster in ap-northeast-2 (Seoul).
// Use the aws-1 pooler host in Vercel settings to avoid tenant/user not found errors.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    let dbUrl = process.env.DATABASE_URL;
    
    // Fix Vercel's injected Supabase connection string for Serverless Pooler
    if (dbUrl && dbUrl.includes("supabase.co") && !dbUrl.includes("pooler")) {
      dbUrl = dbUrl.replace(/db\.[a-z0-9]+\.supabase\.co:5432/i, "aws-1-ap-northeast-2.pooler.supabase.com:6543");
      if (dbUrl.includes("postgresql://postgres:")) {
        dbUrl = dbUrl.replace("postgresql://postgres:", "postgresql://postgres.subsmbukfxmjbqznaokm:");
      }
      if (!dbUrl.includes("pgbouncer=true")) {
        dbUrl += dbUrl.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
      }
    }

    const client = new PrismaClient({
      datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
    client.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (err) {
        (globalThis as any).latestPrismaError = err;
        throw err;
      }
    });
    return client;
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
