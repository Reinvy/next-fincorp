import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL belum diset. Salin .env.example menjadi .env dan jalankan database Postgres (podman-compose up -d db).",
  );
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export type Tx = Prisma.TransactionClient;
export type { PrismaClient };

const globalForPrisma = globalThis as unknown as { fincorpPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.fincorpPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.fincorpPrisma = prisma;
}

/**
 * Every financial mutation runs serializable; a single serialization conflict is
 * retried once, then surfaced.
 */
export async function withFinancialTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 20_000,
      });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (retryable && attempt === 0) continue;
      throw error;
    }
  }
}
