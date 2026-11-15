import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { PAGE_SIZE } from "@/lib/constants";
import type { Actor } from "@/lib/types";
import type { AuditLogView } from "@/lib/dto";

export async function listAuditLogs(
  actor: Actor,
  filters: { q?: string; action?: string; from?: Date; to?: Date; page?: number } = {},
): Promise<{ rows: AuditLogView[]; total: number; page: number; totalPages: number }> {
  if (actor.role !== "ADMIN" && actor.role !== "ACCOUNTANT") {
    throw new DomainError("FORBIDDEN", "Jejak audit hanya untuk admin dan akuntan.");
  }
  const page = Math.max(1, filters.page ?? 1);
  const where = {
    companyId: actor.companyId,
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
    ...(filters.q?.trim()
      ? {
          OR: [
            { summary: { contains: filters.q.trim(), mode: "insensitive" as const } },
            { entityType: { contains: filters.q.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(logs.map((log) => log.userId))) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((user) => [user.id, user.name]));
  return {
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      summary: log.summary,
      userName: nameById.get(log.userId) ?? "—",
      createdAt: log.createdAt.toISOString(),
    })),
  };
}
