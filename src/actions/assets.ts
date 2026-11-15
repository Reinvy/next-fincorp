"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { actionError, success } from "@/lib/actions";
import { dateFromISO } from "@/lib/dates";
import { assetSchema, depreciationRunSchema, disposeAssetSchema } from "@/lib/schemas/assets";
import { createFixedAsset } from "@/server/assets/assets";
import { runDepreciation } from "@/server/assets/depreciation";
import { disposeFixedAsset } from "@/server/assets/disposal";
import type { ActionState } from "@/lib/types";

function revalidateAssets() {
  revalidatePath("/fixed-assets");
  revalidatePath("/dashboard");
  revalidatePath("/accounting");
  revalidatePath("/accounting/journal");
  revalidatePath("/accounting/ledger");
  revalidatePath("/accounting/trial-balance");
  revalidatePath("/reports");
}

export async function createAssetAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = assetSchema.parse(Object.fromEntries(formData));
    const asset = await createFixedAsset(actor, {
      code: parsed.code,
      name: parsed.name,
      category: parsed.category,
      purchaseDate: dateFromISO(parsed.purchaseDate),
      purchasePrice: parsed.purchasePrice,
      residualValue: parsed.residualValue,
      usefulLifeMonths: parsed.usefulLifeMonths,
      method: parsed.method,
      annualRate: parsed.annualRate,
      assetAccountId: parsed.assetAccountId,
      accumulatedAccountId: parsed.accumulatedAccountId,
      depreciationExpenseAccountId: parsed.depreciationExpenseAccountId,
      fundingType: parsed.fundingType,
      fundingAccountId: parsed.fundingAccountId,
      location: parsed.location,
      responsible: parsed.responsible,
    });
    revalidateAssets();
    return success(`Aset ${asset.code} berhasil dicatat beserta jurnal perolehannya.`, `/fixed-assets/${asset.id}`);
  } catch (error) {
    return actionError(error, "Gagal mencatat aset.");
  }
}

export async function runDepreciationAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = depreciationRunSchema.parse(Object.fromEntries(formData));
    const result = await runDepreciation(actor, parsed.period);
    revalidateAssets();
    return success(
      `Penyusutan ${parsed.period} dijalankan: ${result.assets} aset, jurnal ${result.journalNumber}.`,
    );
  } catch (error) {
    return actionError(error, "Gagal menjalankan penyusutan.");
  }
}

export async function disposeAssetAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = disposeAssetSchema.parse(Object.fromEntries(formData));
    const result = await disposeFixedAsset(actor, {
      assetId: parsed.assetId,
      date: dateFromISO(parsed.date),
      proceeds: parsed.proceeds,
      bankAccountId: parsed.bankAccountId,
      note: parsed.note,
    });
    revalidateAssets();
    revalidatePath(`/fixed-assets/${parsed.assetId}`);
    return success(
      `Aset dilepas pada jurnal ${result.number} dengan ${result.gainLoss >= 0 ? "keuntungan" : "kerugian"} Rp ${Math.abs(result.gainLoss).toLocaleString("id-ID")}.`,
    );
  } catch (error) {
    return actionError(error, "Gagal melepas aset.");
  }
}
