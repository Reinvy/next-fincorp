import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY_COOKIE } from "@/lib/constants";
import { DomainError } from "@/lib/db-errors";
import type { Actor, Role, SessionUser } from "@/lib/types";

export interface MembershipSummary {
  membershipId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  isPkp: boolean;
  npwp: string | null;
  city: string | null;
  logoDataUrl: string | null;
  role: Role;
}

export interface ActorContext {
  user: SessionUser;
  memberships: MembershipSummary[];
  activeCompany: MembershipSummary | null;
  actor: Actor | null;
}

async function loadSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Per-request cached Better Auth session. */
export const getSession = cache(loadSession);

async function loadActorContext(): Promise<ActorContext | null> {
  const session = await loadSession();
  if (!session?.user) return null;

  const rows = await prisma.companyMember.findMany({
    where: { userId: session.user.id },
    include: {
      company: {
        select: { id: true, name: true, slug: true, isPkp: true, npwp: true, city: true, logoDataUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const memberships: MembershipSummary[] = rows.map((row) => ({
    membershipId: row.id,
    companyId: row.companyId,
    companyName: row.company.name,
    companySlug: row.company.slug,
    isPkp: row.company.isPkp,
    npwp: row.company.npwp,
    city: row.company.city,
    logoDataUrl: row.company.logoDataUrl,
    role: row.role,
  }));

  const cookieStore = await cookies();
  const cookieCompanyId = cookieStore.get(COMPANY_COOKIE)?.value;
  const activeCompany =
    memberships.find((membership) => membership.companyId === cookieCompanyId) ?? memberships[0] ?? null;

  const user: SessionUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };

  const actor: Actor | null = activeCompany
    ? { userId: user.id, companyId: activeCompany.companyId, role: activeCompany.role }
    : null;

  return { user, memberships, activeCompany, actor };
}

/** Per-request cached session + membership + active company. */
export const getActorContext = cache(loadActorContext);

/** Session only — used by onboarding and company creation. */
export async function requireUser(): Promise<SessionUser> {
  const session = await loadSession();
  if (!session?.user) redirect("/login");
  return { id: session.user.id, name: session.user.name, email: session.user.email };
}

export async function requireUserForAction(): Promise<SessionUser> {
  const session = await loadSession();
  if (!session?.user) throw new DomainError("UNAUTHORIZED", "Sesi berakhir. Silakan masuk kembali.");
  return { id: session.user.id, name: session.user.name, email: session.user.email };
}

/** Page guard: login + active company membership. */
export async function requireActorPage(): Promise<ActorContext & { actor: Actor; activeCompany: MembershipSummary }> {
  const context = await getActorContext();
  if (!context) redirect("/login");
  if (!context.actor || !context.activeCompany) redirect("/onboarding");
  return { ...context, actor: context.actor, activeCompany: context.activeCompany };
}

/** Action guard: never redirects, throws domain errors the action maps to state. */
export async function requireActorForAction(roles?: Role[]): Promise<Actor> {
  const context = await loadActorContext();
  if (!context) throw new DomainError("UNAUTHORIZED", "Sesi berakhir. Silakan masuk kembali.");
  if (!context.actor) throw new DomainError("FORBIDDEN", "Pilih perusahaan terlebih dahulu.");
  assertRole(context.actor, roles);
  return context.actor;
}

export function assertRole(actor: Actor, roles?: Role[]): void {
  if (!roles || roles.length === 0) return;
  if (!roles.includes(actor.role)) {
    throw new DomainError("FORBIDDEN", "Peran Anda tidak memiliki akses untuk tindakan ini.");
  }
}

export function requireRole(actor: Actor, roles: Role[]): void {
  assertRole(actor, roles);
}

/** Used when a mutation targets another company (must be a member there too). */
export async function assertMembership(userId: string, companyId: string): Promise<Role> {
  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId } },
    select: { role: true },
  });
  if (!membership) throw new DomainError("FORBIDDEN", "Anda bukan anggota perusahaan ini.");
  return membership.role;
}
