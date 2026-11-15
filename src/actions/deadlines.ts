"use server";

import { revalidatePath } from "next/cache";
import { withFinancialTx } from "@/lib/prisma";
import { requireActorForAction } from "@/lib/access";
import { actionError, success } from "@/lib/actions";
import { writeAudit } from "@/lib/audit";
import { dateFromISO } from "@/lib/dates";
import { idSchema } from "@/lib/schemas/common";
import { manualDeadlineSchema } from "@/lib/schemas/tax";
import { DomainError } from "@/lib/db-errors";
import type { ActionState } from "@/lib/types";

function revalidateDeadlines() {
  revalidatePath("/deadlines");
  revalidatePath("/dashboard");
}

export async function createDeadlineAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = manualDeadlineSchema.parse(Object.fromEntries(formData));
    await withFinancialTx(async (tx) => {
      const deadline = await tx.companyDeadline.create({
        data: {
          companyId: actor.companyId,
          title: parsed.title,
          dueDate: dateFromISO(parsed.dueDate),
          category: parsed.category,
          amount: parsed.amount ? Number(parsed.amount).toFixed(2) : null,
          notes: parsed.notes?.trim() || null,
          createdById: actor.userId,
        },
        select: { id: true },
      });
      await writeAudit(tx, {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "CREATE",
        entityType: "CompanyDeadline",
        entityId: deadline.id,
        summary: `Menambah tenggat ${parsed.title} (${parsed.dueDate})`,
      });
    });
    revalidateDeadlines();
    return success("Tenggat berhasil ditambahkan.");
  } catch (error) {
    return actionError(error, "Gagal menambah tenggat.");
  }
}

export async function updateDeadlineAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const deadlineId = idSchema("Tenggat").parse(formData.get("deadlineId"));
    const parsed = manualDeadlineSchema.parse(Object.fromEntries(formData));
    await withFinancialTx(async (tx) => {
      const existing = await tx.companyDeadline.findFirst({
        where: { id: deadlineId, companyId: actor.companyId },
        select: { id: true },
      });
      if (!existing) throw new DomainError("NOT_FOUND", "Tenggat tidak ditemukan.");
      await tx.companyDeadline.update({
        where: { id: deadlineId },
        data: {
          title: parsed.title,
          dueDate: dateFromISO(parsed.dueDate),
          category: parsed.category,
          amount: parsed.amount ? Number(parsed.amount).toFixed(2) : null,
          notes: parsed.notes?.trim() || null,
        },
      });
      await writeAudit(tx, {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "UPDATE",
        entityType: "CompanyDeadline",
        entityId: deadlineId,
        summary: `Mengubah tenggat ${parsed.title}`,
      });
    });
    revalidateDeadlines();
    return success("Tenggat diperbarui.");
  } catch (error) {
    return actionError(error, "Gagal memperbarui tenggat.");
  }
}

export async function toggleDeadlineAction(deadlineId: string, completed: boolean): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    await withFinancialTx(async (tx) => {
      const existing = await tx.companyDeadline.findFirst({
        where: { id: deadlineId, companyId: actor.companyId },
        select: { id: true, title: true },
      });
      if (!existing) throw new DomainError("NOT_FOUND", "Tenggat tidak ditemukan.");
      await tx.companyDeadline.update({
        where: { id: deadlineId },
        data: { completedAt: completed ? new Date() : null },
      });
      await writeAudit(tx, {
        companyId: actor.companyId,
        userId: actor.userId,
        action: completed ? "COMPLETE" : "REOPEN",
        entityType: "CompanyDeadline",
        entityId: deadlineId,
        summary: `${completed ? "Menyelesaikan" : "Membuka"} tenggat ${existing.title}`,
      });
    });
    revalidateDeadlines();
    return success(completed ? "Tenggat ditandai selesai." : "Tenggat dibuka kembali.");
  } catch (error) {
    return actionError(error, "Gagal mengubah status tenggat.");
  }
}

export async function deleteDeadlineAction(deadlineId: string): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    await withFinancialTx(async (tx) => {
      const existing = await tx.companyDeadline.findFirst({
        where: { id: deadlineId, companyId: actor.companyId },
        select: { id: true, title: true },
      });
      if (!existing) throw new DomainError("NOT_FOUND", "Tenggat tidak ditemukan.");
      await tx.companyDeadline.delete({ where: { id: deadlineId } });
      await writeAudit(tx, {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "DELETE",
        entityType: "CompanyDeadline",
        entityId: deadlineId,
        summary: `Menghapus tenggat ${existing.title}`,
      });
    });
    revalidateDeadlines();
    return success("Tenggat dihapus.");
  } catch (error) {
    return actionError(error, "Gagal menghapus tenggat.");
  }
}
