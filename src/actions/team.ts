"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { actionError, success } from "@/lib/actions";
import { idSchema } from "@/lib/schemas/common";
import { teamInviteSchema, teamRoleSchema } from "@/lib/schemas/settings";
import { inviteMember, removeMember, updateMemberRole } from "@/server/companies/team";
import type { ActionState } from "@/lib/types";

function revalidateTeam() {
  revalidatePath("/settings/team");
  revalidatePath("/companies");
}

export async function inviteMemberAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN"]);
    const parsed = teamInviteSchema.parse(Object.fromEntries(formData));
    const result = await inviteMember(actor, parsed);
    revalidateTeam();
    return success(
      result.createdUser
        ? `Anggota ditambahkan. Kata sandi sementara: ${parsed.password} — sampaikan sekali lalu minta pengguna menggantinya.`
        : "Anggota ditambahkan ke perusahaan menggunakan akun yang sudah ada.",
    );
  } catch (error) {
    return actionError(error, "Gagal menambahkan anggota.");
  }
}

export async function updateMemberRoleAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN"]);
    const parsed = teamRoleSchema.parse(Object.fromEntries(formData));
    await updateMemberRole(actor, parsed.membershipId, parsed.role);
    revalidateTeam();
    return success("Peran anggota diperbarui.");
  } catch (error) {
    return actionError(error, "Gagal memperbarui peran.");
  }
}

export async function removeMemberByIdAction(membershipId: string): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN"]);
    const id = idSchema("Anggota").parse(membershipId);
    await removeMember(actor, id);
    revalidateTeam();
    return success("Anggota dihapus dari perusahaan.");
  } catch (error) {
    return actionError(error, "Gagal menghapus anggota.");
  }
}
