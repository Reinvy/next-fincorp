"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireActorForAction } from "@/lib/access";
import { auth } from "@/lib/auth";
import { prisma, withFinancialTx } from "@/lib/prisma";
import { actionError, success } from "@/lib/actions";
import { writeAudit } from "@/lib/audit";
import { DomainError } from "@/lib/db-errors";
import { companySettingsSchema, passwordSchema, profileSchema } from "@/lib/schemas/settings";
import { MAX_LOGO_BYTES } from "@/lib/constants";
import { D } from "@/lib/money";
import type { ActionState } from "@/lib/types";

const ALLOWED_LOGO = ["image/png", "image/jpeg", "image/webp"];

export async function updateProfileAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    await requireActorForAction();
    const parsed = profileSchema.parse(Object.fromEntries(formData));
    await auth.api.updateUser({ body: { name: parsed.name }, headers: await headers() });
    revalidatePath("/settings/profile");
    revalidatePath("/", "layout");
    return success("Nama profil diperbarui.");
  } catch (error) {
    return actionError(error, "Gagal memperbarui profil.");
  }
}

export async function changePasswordAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    await requireActorForAction();
    const parsed = passwordSchema.parse(Object.fromEntries(formData));
    try {
      await auth.api.changePassword({
        body: {
          currentPassword: parsed.currentPassword,
          newPassword: parsed.newPassword,
          revokeOtherSessions: true,
        },
        headers: await headers(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      throw new DomainError("INVALID_INPUT", message.includes("Invalid") ? "Kata sandi saat ini salah." : "Gagal mengubah kata sandi.");
    }
    return success("Kata sandi diubah dan sesi lain dikeluarkan.");
  } catch (error) {
    return actionError(error, "Gagal mengubah kata sandi.");
  }
}

export async function updateCompanySettingsAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN"]);
    const parsed = companySettingsSchema.parse(Object.fromEntries(formData));
    const logo = formData.get("logo");
    let logoDataUrl: string | undefined;
    if (logo instanceof File && logo.size > 0) {
      if (logo.size > MAX_LOGO_BYTES) {
        throw new DomainError("INVALID_INPUT", "Logo maksimal 512 KB.");
      }
      if (!ALLOWED_LOGO.includes(logo.type)) {
        throw new DomainError("INVALID_INPUT", "Logo harus PNG, JPEG, atau WebP.");
      }
      const buffer = Buffer.from(await logo.arrayBuffer());
      logoDataUrl = `data:${logo.type};base64,${buffer.toString("base64")}`;
    }

    await withFinancialTx(async (tx) => {
      await tx.company.update({
        where: { id: actor.companyId },
        data: {
          name: parsed.name,
          npwp: parsed.npwp ?? null,
          nib: parsed.nib ?? null,
          pkpNumber: parsed.pkpNumber ?? null,
          kpp: parsed.kpp ?? null,
          address: parsed.address ?? null,
          city: parsed.city ?? null,
          province: parsed.province ?? null,
          postalCode: parsed.postalCode ?? null,
          email: parsed.email ?? null,
          phone: parsed.phone ?? null,
          isPkp: parsed.isPkp,
          ppnRate: D(parsed.ppnRate).toFixed(2),
          fiscalYearStartMonth: parsed.fiscalYearStartMonth,
          ...(logoDataUrl ? { logoDataUrl } : {}),
        },
      });
      await writeAudit(tx, {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "UPDATE",
        entityType: "Company",
        entityId: actor.companyId,
        summary: `Memperbarui profil perusahaan ${parsed.name}`,
      });
    });
    revalidatePath("/settings/company");
    revalidatePath("/", "layout");
    return success("Pengaturan perusahaan disimpan.");
  } catch (error) {
    return actionError(error, "Gagal menyimpan pengaturan perusahaan.");
  }
}

export async function removeCompanyLogoAction(): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN"]);
    await withFinancialTx(async (tx) => {
      await tx.company.update({ where: { id: actor.companyId }, data: { logoDataUrl: null } });
      await writeAudit(tx, {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "UPDATE",
        entityType: "Company",
        entityId: actor.companyId,
        summary: "Menghapus logo perusahaan",
      });
    });
    revalidatePath("/settings/company");
    return success("Logo dihapus.");
  } catch (error) {
    return actionError(error, "Gagal menghapus logo.");
  }
}
