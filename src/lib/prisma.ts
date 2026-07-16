import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const client = new PrismaClient({
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
