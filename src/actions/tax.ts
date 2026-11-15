"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { actionError, success } from "@/lib/actions";
import { dateFromISO } from "@/lib/dates";
import { payTaxSchema, settlePpnSchema } from "@/lib/schemas/tax";
import { payWithholdingTax, settlePpn } from "@/server/tax/tax";
import type { ActionState } from "@/lib/types";

function revalidateTax() {
  revalidatePath("/tax");
  revalidatePath("/tax/efaktur");
  revalidatePath("/deadlines");
  revalidatePath("/accounting");
  revalidatePath("/accounting/journal");
  revalidatePath("/accounting/trial-balance");
  revalidatePath("/dashboard");
}

export async function settlePpnAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = settlePpnSchema.parse(Object.fromEntries(formData));
    const result = await settlePpn(actor, {
      period: parsed.period,
      bankAccountId: parsed.bankAccountId,
      paymentDate: parsed.paymentDate ? dateFromISO(parsed.paymentDate) : null,
    });
    revalidateTax();
    return success(
      result.paymentJournal
        ? `PPN diselesaikan (${result.settlementJournal}) dan dibayar (${result.paymentJournal}).`
        : `PPN diselesaikan dengan kompensasi lebih bayar (${result.settlementJournal}).`,
    );
  } catch (error) {
    return actionError(error, "Gagal menyelesaikan PPN.");
  }
}

export async function payTaxAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = payTaxSchema.parse(Object.fromEntries(formData));
    const result = await payWithholdingTax(actor, {
      type: parsed.type,
      period: parsed.period,
      amount: parsed.amount,
      bankAccountId: parsed.bankAccountId,
      paymentDate: parsed.paymentDate ? dateFromISO(parsed.paymentDate) : null,
      billingId: parsed.billingId,
      ntpN: parsed.ntpN,
    });
    revalidateTax();
    return success(`Pembayaran pajak tercatat pada jurnal ${result.number}.`);
  } catch (error) {
    return actionError(error, "Gagal mencatat pembayaran pajak.");
  }
}
