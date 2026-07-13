import { PrismaClient } from "@prisma/client";
import { env } from "./config.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const buildDatabaseUrl = () => {
  try {
    const url = new URL(env.DATABASE_URL);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", String(env.DATABASE_CONNECTION_LIMIT));
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", String(env.DATABASE_POOL_TIMEOUT));
    }
    return url.toString();
  } catch {
    return env.DATABASE_URL;
  }
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: buildDatabaseUrl()
      }
    },
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}