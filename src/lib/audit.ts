import type { Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/lib/prisma";

type AuditClient = Pick<Tx, "auditLog">;

export interface AuditEntry {
  companyId?: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

/** Append-only audit trail. Always called inside the same transaction as the mutation. */
export async function writeAudit(client: AuditClient, entry: AuditEntry): Promise<void> {
  await client.auditLog.create({
    data: {
      companyId: entry.companyId ?? null,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
      metadata: entry.metadata,
    },
  });
}
