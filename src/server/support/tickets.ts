import { prisma, withFinancialTx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { DOCUMENT_KEYS, nextDocumentNumber } from "@/server/accounting/numbering";
import type { Actor, TicketCategory, TicketPriority, TicketStatus } from "@/lib/types";
import type { SupportTicketView } from "@/lib/dto";

export interface CreateTicketInput {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
}

export async function createTicket(actor: Actor, input: CreateTicketInput): Promise<{ id: string; number: string }> {
  const subject = input.subject.trim();
  const description = input.description.trim();
  if (subject.length < 3 || subject.length > 160) throw new DomainError("INVALID_INPUT", "Subjek harus 3–160 karakter.");
  if (description.length < 10 || description.length > 2000) {
    throw new DomainError("INVALID_INPUT", "Deskripsi harus 10–2000 karakter.");
  }
  return withFinancialTx(async (tx) => {
    const number = await nextDocumentNumber(
      tx,
      actor.companyId,
      DOCUMENT_KEYS.SUPPORT_TICKET.key,
      DOCUMENT_KEYS.SUPPORT_TICKET.prefix,
      new Date(),
    );
    const ticket = await tx.supportTicket.create({
      data: {
        companyId: actor.companyId,
        userId: actor.userId,
        number,
        subject,
        category: input.category,
        priority: input.priority,
        description,
      },
      select: { id: true, number: true },
    });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "CREATE",
      entityType: "SupportTicket",
      entityId: ticket.id,
      summary: `Membuka tiket ${number}: ${subject}`,
    });
    return ticket;
  });
}

export async function listTickets(actor: Actor): Promise<SupportTicketView[]> {
  const tickets = await prisma.supportTicket.findMany({
    where: { companyId: actor.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
      _count: { select: { messages: true } },
    },
  });
  return tickets.map((ticket) => ({
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    description: ticket.description,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    userName: ticket.user.name,
    messageCount: ticket._count.messages,
  }));
}

export interface SupportMessageView {
  id: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  number: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
  messages: SupportMessageView[];
}

export async function getTicket(actor: Actor, ticketId: string): Promise<TicketDetail> {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, companyId: actor.companyId },
    include: {
      user: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
    },
  });
  if (!ticket) throw new DomainError("NOT_FOUND", "Tiket tidak ditemukan.");
  return {
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    description: ticket.description,
    userId: ticket.userId,
    userName: ticket.user.name,
    createdAt: ticket.createdAt.toISOString(),
    messages: ticket.messages.map((message) => ({
      id: message.id,
      userId: message.userId,
      userName: message.user.name,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function replyToTicket(actor: Actor, ticketId: string, body: string): Promise<void> {
  const message = body.trim();
  if (message.length < 2 || message.length > 2000) {
    throw new DomainError("INVALID_INPUT", "Pesan harus 2–2000 karakter.");
  }
  await withFinancialTx(async (tx) => {
    const ticket = await tx.supportTicket.findFirst({
      where: { id: ticketId, companyId: actor.companyId },
      select: { id: true, status: true, number: true, userId: true },
    });
    if (!ticket) throw new DomainError("NOT_FOUND", "Tiket tidak ditemukan.");
    if (ticket.status === "CLOSED") throw new DomainError("INVALID_STATUS", "Tiket sudah ditutup.");
    if (actor.role !== "ADMIN" && ticket.userId !== actor.userId) {
      throw new DomainError("FORBIDDEN", "Anda hanya dapat membalas tiket Anda sendiri.");
    }
    await tx.supportMessage.create({
      data: { ticketId: ticket.id, userId: actor.userId, body: message },
    });
    await tx.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "REPLY",
      entityType: "SupportTicket",
      entityId: ticket.id,
      summary: `Membalas tiket ${ticket.number}`,
    });
  });
}

const FLOW: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "OPEN"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

export async function updateTicketStatus(actor: Actor, ticketId: string, next: TicketStatus): Promise<void> {
  await withFinancialTx(async (tx) => {
    const ticket = await tx.supportTicket.findFirst({
      where: { id: ticketId, companyId: actor.companyId },
      select: { id: true, status: true, number: true, userId: true },
    });
    if (!ticket) throw new DomainError("NOT_FOUND", "Tiket tidak ditemukan.");
    if (ticket.status === "CLOSED") throw new DomainError("INVALID_STATUS", "Tiket yang sudah ditutup bersifat final.");
    if (ticket.status === next) return;
    const allowed = FLOW[ticket.status];
    if (!allowed.includes(next)) {
      throw new DomainError("INVALID_STATUS", `Status tidak dapat berubah dari ${ticket.status} ke ${next}.`);
    }
    if (actor.role !== "ADMIN") {
      if (ticket.userId !== actor.userId || next !== "CLOSED") {
        throw new DomainError("FORBIDDEN", "Anggota hanya dapat menutup tiketnya sendiri.");
      }
    }
    await tx.supportTicket.update({ where: { id: ticket.id }, data: { status: next } });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "STATUS",
      entityType: "SupportTicket",
      entityId: ticket.id,
      summary: `Mengubah status tiket ${ticket.number}: ${ticket.status} → ${next}`,
    });
  });
}
