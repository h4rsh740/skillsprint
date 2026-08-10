import type { PrismaClient } from "@prisma/client";

// Note: The Supabase project is hosted on the aws-1 cluster in ap-northeast-2 (Seoul).
// Use the aws-1 pooler host in Vercel settings to avoid tenant/user not found errors.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Safely load PrismaClient on server only to prevent browser client bundle evaluation errors
let PrismaClientClass: any = null;
if (typeof window === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PrismaClientClass = require("@prisma/client").PrismaClient;
  } catch (_) {}
}

export const prisma: PrismaClient =
  typeof window === "undefined" && PrismaClientClass
    ? (globalForPrisma.prisma ??
        (() => {
          const client = new PrismaClientClass({
            log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
          });
          if (client && typeof client.$use === "function") {
            client.$use(async (params: any, next: any) => {
              try {
                return await next(params);
              } catch (err) {
                (globalThis as any).latestPrismaError = err;
                throw err;
              }
            });
          }
          return client;
        })())
    : (null as unknown as PrismaClient);

if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
