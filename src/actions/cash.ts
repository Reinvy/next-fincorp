"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { actionError, success } from "@/lib/actions";
import { dateFromISO } from "@/lib/dates";
import { bankAccountSchema, cashTransactionSchema, matchStatementSchema, transferSchema } from "@/lib/schemas/cash";
import { createBankAccount, setBankAccountActive } from "@/server/cash/accounts";
import { createBankTransfer, createCashTransaction } from "@/server/cash/transactions";
import {
  autoMatchStatement,
  ignoreStatementLine,
  importBankStatement,
  matchStatementLine,
  unmatchStatementLine,
} from "@/server/cash/reconciliation";
import { DomainError } from "@/lib/db-errors";
import type { ActionState } from "@/lib/types";

function revalidateCash() {
  revalidatePath("/cash-bank");
  revalidatePath("/dashboard");
  revalidatePath("/accounting");
  revalidatePath("/accounting/ledger");
  revalidatePath("/accounting/trial-balance");
}

export async function createBankAccountAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = bankAccountSchema.parse(Object.fromEntries(formData));
    const created = await createBankAccount(actor, {
      ...parsed,
      openingDate: dateFromISO(parsed.openingDate),
    });
    revalidateCash();
    return success(
      created.number
        ? `Rekening ${parsed.name} dibuat dengan jurnal saldo awal ${created.number}.`
        : `Rekening ${parsed.name} dibuat.`,
    );
  } catch (error) {
    return actionError(error, "Gagal membuat rekening.");
  }
}

export async function setBankAccountActiveAction(bankAccountId: string, isActive: boolean): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    await setBankAccountActive(actor, bankAccountId, isActive);
    revalidateCash();
    return success(isActive ? "Rekening diaktifkan." : "Rekening dinonaktifkan.");
  } catch (error) {
    return actionError(error, "Gagal mengubah status rekening.");
  }
}

export async function createCashTransactionAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = cashTransactionSchema.parse(Object.fromEntries(formData));
    const created = await createCashTransaction(actor, {
      ...parsed,
      date: dateFromISO(parsed.date),
    });
    revalidateCash();
    revalidatePath("/accounting/journal");
    return success(`Transaksi kas tercatat pada jurnal ${created.number}.`);
  } catch (error) {
    return actionError(error, "Gagal mencatat transaksi kas.");
  }
}

export async function createTransferAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = transferSchema.parse(Object.fromEntries(formData));
    const created = await createBankTransfer(actor, {
      ...parsed,
      date: dateFromISO(parsed.date),
    });
    revalidateCash();
    revalidatePath("/accounting/journal");
    return success(`Transfer tercatat pada jurnal ${created.number}.`);
  } catch (error) {
    return actionError(error, "Gagal mencatat transfer.");
  }
}

export async function importStatementAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const bankAccountId = String(formData.get("bankAccountId") ?? "");
    if (!bankAccountId) return { status: "error", message: "Pilih rekening terlebih dahulu." };
    const file = formData.get("file");
    let csv = typeof formData.get("csv") === "string" ? String(formData.get("csv")) : "";
    if (file instanceof File && file.size > 0) {
      if (file.size > 2 * 1024 * 1024) return { status: "error", message: "Berkas CSV maksimal 2 MB." };
      csv = await file.text();
    }
    if (!csv.trim()) return { status: "error", message: "Unggah berkas CSV atau tempel isinya." };
    const result = await importBankStatement(actor, { bankAccountId, csv });
    revalidatePath("/cash-bank/reconciliation");
    return success(`${result.imported} baris diimpor, ${result.skipped} duplikat dilewati.`);
  } catch (error) {
    return actionError(error, "Gagal mengimpor mutasi rekening.");
  }
}

export async function autoMatchAction(
  bankAccountId: string,
  fromISO: string,
  toISO: string,
): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const result = await autoMatchStatement(actor, {
      bankAccountId,
      from: dateFromISO(fromISO),
      to: dateFromISO(toISO),
    });
    revalidatePath("/cash-bank/reconciliation");
    return success(`Cocok otomatis: ${result.matched} cocok, ${result.ambiguous} ambigu, ${result.none} tanpa pasangan.`);
  } catch (error) {
    return actionError(error, "Gagal mencocokkan otomatis.");
  }
}

export async function matchStatementAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = matchStatementSchema.parse(Object.fromEntries(formData));
    await matchStatementLine(actor, parsed);
    revalidatePath("/cash-bank/reconciliation");
    return success("Baris berhasil dicocokkan.");
  } catch (error) {
    return actionError(error, "Gagal mencocokkan baris.");
  }
}

export async function unmatchStatementAction(lineId: string): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    if (!lineId) throw new DomainError("INVALID_INPUT", "Baris tidak ditemukan.");
    await unmatchStatementLine(actor, lineId);
    revalidatePath("/cash-bank/reconciliation");
    return success("Kecocokan dilepas.");
  } catch (error) {
    return actionError(error, "Gagal melepas kecocokan.");
  }
}

export async function ignoreStatementAction(lineId: string): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    if (!lineId) throw new DomainError("INVALID_INPUT", "Baris tidak ditemukan.");
    await ignoreStatementLine(actor, lineId);
    revalidatePath("/cash-bank/reconciliation");
    return success("Baris diabaikan.");
  } catch (error) {
    return actionError(error, "Gagal mengabaikan baris.");
  }
}
