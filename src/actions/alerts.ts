"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { actionError, success } from "@/lib/actions";
import { dismissAlert } from "@/server/accounting/alerts";
import type { ActionState } from "@/lib/types";

export async function dismissAlertAction(alertKey: string): Promise<ActionState> {
  try {
    const actor = await requireActorForAction();
    if (!alertKey) return { status: "error", message: "Peringatan tidak ditemukan." };
    await dismissAlert(actor, actor.userId, alertKey);
    revalidatePath("/dashboard");
    return success("Peringatan disembunyikan.");
  } catch (error) {
    return actionError(error, "Gagal menyembunyikan peringatan.");
  }
}
