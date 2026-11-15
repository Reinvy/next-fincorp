"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { actionError, success } from "@/lib/actions";
import { ticketReplySchema, ticketSchema, ticketStatusSchema } from "@/lib/schemas/support";
import { createTicket, replyToTicket, updateTicketStatus } from "@/server/support/tickets";
import type { ActionState, TicketStatus } from "@/lib/types";

function revalidateSupport(ticketId?: string) {
  revalidatePath("/support");
  if (ticketId) revalidatePath(`/support/${ticketId}`);
}

export async function createTicketAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction();
    const parsed = ticketSchema.parse(Object.fromEntries(formData));
    const ticket = await createTicket(actor, parsed);
    revalidateSupport();
    return success(`Tiket ${ticket.number} dibuat.`, `/support/${ticket.id}`);
  } catch (error) {
    return actionError(error, "Gagal membuat tiket.");
  }
}

export async function replyTicketAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction();
    const parsed = ticketReplySchema.parse(Object.fromEntries(formData));
    await replyToTicket(actor, parsed.ticketId, parsed.body);
    revalidateSupport(parsed.ticketId);
    return success("Balasan tersimpan.");
  } catch (error) {
    return actionError(error, "Gagal mengirim balasan.");
  }
}

export async function updateTicketStatusAction(ticketId: string, status: TicketStatus): Promise<ActionState> {
  try {
    const actor = await requireActorForAction();
    const parsed = ticketStatusSchema.parse({ ticketId, status });
    await updateTicketStatus(actor, parsed.ticketId, parsed.status);
    revalidateSupport(parsed.ticketId);
    return success("Status tiket diperbarui.");
  } catch (error) {
    return actionError(error, "Gagal mengubah status tiket.");
  }
}
