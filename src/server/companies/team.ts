import { withFinancialTx } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { ensureCredentialUser } from "@/lib/password";
import type { Actor, Role } from "@/lib/types";
import type { TeamMemberView } from "@/lib/dto";

function requireAdmin(actor: Actor): void {
  if (actor.role !== "ADMIN") throw new DomainError("FORBIDDEN", "Hanya admin yang dapat mengelola tim.");
}

export async function listTeam(actor: Actor): Promise<TeamMemberView[]> {
  requireAdmin(actor);
  const members = await prisma.companyMember.findMany({
    where: { companyId: actor.companyId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, email: true } } },
  });
  return members.map((member) => ({
    id: member.id,
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
  }));
}

export interface InviteMemberInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export async function inviteMember(actor: Actor, input: InviteMemberInput): Promise<{ createdUser: boolean }> {
  requireAdmin(actor);
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) throw new DomainError("INVALID_INPUT", "Nama anggota wajib diisi.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new DomainError("INVALID_INPUT", "Email tidak valid.");
  if (input.password.length < 8) throw new DomainError("INVALID_INPUT", "Kata sandi sementara minimal 8 karakter.");
  if (input.role === "ADMIN" && actor.role !== "ADMIN") throw new DomainError("FORBIDDEN", "Hanya admin yang dapat menambah admin.");

  return withFinancialTx(async (tx) => {
    const existingMembership = await tx.companyMember.findFirst({
      where: { companyId: actor.companyId, user: { email } },
      select: { id: true },
    });
    if (existingMembership) throw new DomainError("DUPLICATE", "Pengguna ini sudah menjadi anggota perusahaan.");
    const user = await ensureCredentialUser(tx, { name, email, password: input.password });
    await tx.companyMember.create({
      data: { companyId: actor.companyId, userId: user.id, role: input.role },
    });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "INVITE",
      entityType: "CompanyMember",
      entityId: user.id,
      summary: `Menambahkan ${user.email} sebagai ${input.role}`,
    });
    return { createdUser: user.created };
  });
}

export async function updateMemberRole(actor: Actor, membershipId: string, role: Role): Promise<void> {
  requireAdmin(actor);
  await withFinancialTx(async (tx) => {
    const member = await tx.companyMember.findFirst({
      where: { id: membershipId, companyId: actor.companyId },
      include: { user: { select: { email: true } } },
    });
    if (!member) throw new DomainError("NOT_FOUND", "Anggota tidak ditemukan.");
    if (member.role === role) return;
    if (member.role === "ADMIN" && role !== "ADMIN") {
      const admins = await tx.companyMember.count({ where: { companyId: actor.companyId, role: "ADMIN" } });
      if (admins <= 1) throw new DomainError("INVALID_STATUS", "Tidak dapat menurunkan admin terakhir.");
    }
    await tx.companyMember.update({ where: { id: member.id }, data: { role } });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "UPDATE_ROLE",
      entityType: "CompanyMember",
      entityId: member.id,
      summary: `Mengubah peran ${member.user.email} menjadi ${role}`,
    });
  });
}

export async function removeMember(actor: Actor, membershipId: string): Promise<void> {
  requireAdmin(actor);
  await withFinancialTx(async (tx) => {
    const member = await tx.companyMember.findFirst({
      where: { id: membershipId, companyId: actor.companyId },
      include: { user: { select: { email: true } } },
    });
    if (!member) throw new DomainError("NOT_FOUND", "Anggota tidak ditemukan.");
    if (member.role === "ADMIN") {
      const admins = await tx.companyMember.count({ where: { companyId: actor.companyId, role: "ADMIN" } });
      if (admins <= 1) throw new DomainError("INVALID_STATUS", "Tidak dapat menghapus admin terakhir.");
    }
    await tx.companyMember.delete({ where: { id: member.id } });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "REMOVE_MEMBER",
      entityType: "CompanyMember",
      entityId: member.id,
      summary: `Menghapus ${member.user.email} dari perusahaan`,
    });
  });
}
