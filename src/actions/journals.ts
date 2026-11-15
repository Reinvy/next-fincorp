"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { actionError, success } from "@/lib/actions";
import { journalFormSchema, parseJournalLines } from "@/lib/schemas/accounting";
import { dateFromISO } from "@/lib/dates";
import {
  deleteDraftJournal,
  postDraftJournal,
  saveJournalDraft,
  saveManualJournal,
  voidManualJournal,
} from "@/server/accounting/journals";
import type { ActionState } from "@/lib/types";

function revalidateJournals() {
  revalidatePath("/accounting");
  revalidatePath("/accounting/journal");
  revalidatePath("/accounting/ledger");
  revalidatePath("/accounting/trial-balance");
  revalidatePath("/dashboard");
}

export async function saveJournalAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = journalFormSchema.parse(Object.fromEntries(formData));
    const lines = parseJournalLines(parsed.linesJson);
    const mode = formData.get("mode") === "draft" ? "draft" : "post";
    const draftId = String(formData.get("journalId") ?? "").trim();
    const input = {
      date: dateFromISO(parsed.date),
      description: parsed.description,
      reference: parsed.reference,
      lines,
    };

    if (draftId) {
      if (mode === "draft") {
        await saveJournalDraft(actor, draftId, input);
        revalidateJournals();
        revalidatePath(`/accounting/journal/${draftId}`);
        return success("Draf jurnal diperbarui.", `/accounting/journal/${draftId}`);
      }
      await saveJournalDraft(actor, draftId, input);
      const posted = await postDraftJournal(actor, draftId);
      revalidateJournals();
      return success(`Jurnal ${posted.number} terposting.`, `/accounting/journal/${posted.id}`);
    }

    const saved = await saveManualJournal(actor, input, mode);
    revalidateJournals();
    const message =
      mode === "draft" ? `Draf jurnal ${saved.number} disimpan.` : `Jurnal ${saved.number} terposting.`;
    return success(message, `/accounting/journal/${saved.id}`);
  } catch (error) {
    return actionError(error, "Gagal menyimpan jurnal.");
  }
}

export async function postDraftAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const journalId = String(formData.get("journalId") ?? "");
    if (!journalId) return { status: "error", message: "Jurnal tidak ditemukan." };
    const posted = await postDraftJournal(actor, journalId);
    revalidateJournals();
    revalidatePath(`/accounting/journal/${journalId}`);
    return success(`Jurnal ${posted.number} terposting.`);
  } catch (error) {
    return actionError(error, "Gagal memposting draf jurnal.");
  }
}

export async function deleteDraftAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const journalId = String(formData.get("journalId") ?? "");
    if (!journalId) return { status: "error", message: "Jurnal tidak ditemukan." };
    await deleteDraftJournal(actor, journalId);
    revalidateJournals();
    return success("Draf jurnal dihapus.", "/accounting/journal");
  } catch (error) {
    return actionError(error, "Gagal menghapus draf jurnal.");
  }
}

export async function voidJournalAction(journalId: string): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const reversal = await voidManualJournal(actor, journalId);
    revalidateJournals();
    revalidatePath(`/accounting/journal/${journalId}`);
    return success(`Jurnal dibatalkan dengan pembalik ${reversal.number}.`);
  } catch (error) {
    return actionError(error, "Gagal membatalkan jurnal.");
  }
}
