"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserForAction } from "@/lib/access";
import { setActiveCompanyCookie } from "@/server/companies/cookie";
import { createCompanyForUser } from "@/server/companies/create";
import { optionalEmailSchema, optionalText, percentStringSchema, requiredText } from "@/lib/schemas/common";
import { actionError, success } from "@/lib/actions";
import type { ActionState } from "@/lib/types";

const onboardingSchema = z.object({
  name: requiredText(120, "Nama perusahaan"),
  npwp: optionalText(30),
  nib: optionalText(30),
  pkpNumber: optionalText(40),
  address: optionalText(240),
  city: optionalText(80),
  province: optionalText(80),
  postalCode: optionalText(10),
  email: optionalEmailSchema,
  phone: optionalText(30),
  kpp: optionalText(80),
  isPkp: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  ppnRate: percentStringSchema,
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
});

export async function onboardingAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const user = await requireUserForAction();
    const parsed = onboardingSchema.parse(Object.fromEntries(formData));
    const created = await prisma.$transaction((tx) => createCompanyForUser(tx, user.id, parsed));
    await setActiveCompanyCookie(created.companyId);
    revalidatePath("/", "layout");
    return success("Perusahaan berhasil dibuat.", "/dashboard");
  } catch (error) {
    return actionError(error, "Gagal membuat perusahaan.");
  }
}

export async function switchCompanyAction(companyId: string): Promise<ActionState> {
  try {
    const user = await requireUserForAction();
    const membership = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: user.id } },
      select: { id: true },
    });
    if (!membership) return { status: "error", message: "Anda bukan anggota perusahaan ini." };
    await setActiveCompanyCookie(companyId);
    revalidatePath("/", "layout");
    return success("Perusahaan aktif diganti.");
  } catch (error) {
    return actionError(error, "Gagal mengganti perusahaan.");
  }
}
