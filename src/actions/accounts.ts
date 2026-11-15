"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { withFinancialTx } from "@/lib/prisma";
import { actionError, success } from "@/lib/actions";
import { accountFormSchema } from "@/lib/schemas/accounting";
import { createAccount, setAccountActive, updateAccount } from "@/server/accounting/accounts";
import type { ActionState } from "@/lib/types";

function revalidateAccounts() {
  revalidatePath("/accounting/coa");
  revalidatePath("/accounting");
  revalidatePath("/accounting/journal");
}

export async function createAccountAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const input = accountFormSchema.parse(Object.fromEntries(formData));
    const created = await withFinancialTx((tx) => createAccount(tx, actor, input));
    revalidateAccounts();
    return success(`Akun ${created.code} berhasil dibuat.`);
  } catch (error) {
    return actionError(error, "Gagal membuat akun.");
  }
}

export async function updateAccountAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const accountId = String(formData.get("accountId") ?? "");
    if (!accountId) return { status: "error", message: "Akun tidak ditemukan." };
    const input = accountFormSchema.parse(Object.fromEntries(formData));
    await withFinancialTx((tx) => updateAccount(tx, actor, accountId, input));
    revalidateAccounts();
    return success("Akun berhasil diperbarui.");
  } catch (error) {
    return actionError(error, "Gagal memperbarui akun.");
  }
}

export async function setAccountActiveAction(accountId: string, isActive: boolean): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    await withFinancialTx((tx) => setAccountActive(tx, actor, accountId, isActive));
    revalidateAccounts();
    return success(isActive ? "Akun diaktifkan." : "Akun dinonaktifkan.");
  } catch (error) {
    return actionError(error, "Gagal mengubah status akun.");
  }
}
