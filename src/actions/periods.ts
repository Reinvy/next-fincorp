"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { actionError, success } from "@/lib/actions";
import { periodFormSchema } from "@/lib/schemas/accounting";
import { closePeriod, reopenPeriod } from "@/server/accounting/periods";
import type { ActionState } from "@/lib/types";

function revalidatePeriods() {
  revalidatePath("/accounting/closing");
  revalidatePath("/accounting");
  revalidatePath("/dashboard");
  revalidatePath("/deadlines");
}

export async function closePeriodAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN"]);
    const input = periodFormSchema.parse(Object.fromEntries(formData));
    await closePeriod(actor, input);
    revalidatePeriods();
    return success(`Periode ${input.year}-${String(input.month).padStart(2, "0")} ditutup.`);
  } catch (error) {
    return actionError(error, "Gagal menutup periode.");
  }
}

export async function reopenPeriodAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN"]);
    const input = periodFormSchema.parse(Object.fromEntries(formData));
    await reopenPeriod(actor, input);
    revalidatePeriods();
    return success(`Periode ${input.year}-${String(input.month).padStart(2, "0")} dibuka kembali.`);
  } catch (error) {
    return actionError(error, "Gagal membuka periode.");
  }
}
