import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";

export interface CredentialUserInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Create a Better Auth-compatible credential user outside the HTTP API.
 * Used by the seed and by admin-managed team invitations.
 */
export async function createCredentialUser(
  client: Tx,
  input: CredentialUserInput,
): Promise<{ id: string; name: string; email: string }> {
  const email = input.email.trim().toLowerCase();
  const existing = await client.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new DomainError("DUPLICATE", "Email sudah terdaftar. Tambahkan sebagai anggota langsung.");

  const userId = randomUUID();
  const hashed = await hashPassword(input.password);
  const now = new Date();

  await client.user.create({
    data: {
      id: userId,
      name: input.name.trim(),
      email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: hashed,
          createdAt: now,
          updatedAt: now,
        },
      },
    },
  });

  return { id: userId, name: input.name.trim(), email };
}

/** Find an existing user or create one with a credential account. */
export async function ensureCredentialUser(
  client: Tx,
  input: CredentialUserInput,
): Promise<{ id: string; name: string; email: string; created: boolean }> {
  const email = input.email.trim().toLowerCase();
  const existing = await client.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (existing) return { ...existing, created: false };
  const created = await createCredentialUser(client, { ...input, email });
  return { ...created, created: true };
}
