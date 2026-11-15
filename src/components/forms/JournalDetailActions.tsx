"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { deleteDraftAction, postDraftAction, voidJournalAction } from "@/actions/journals";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";

export function JournalDetailActions({
  journalId,
  canVoid,
  isDraft,
}: {
  journalId: string;
  canVoid: boolean;
  isDraft: boolean;
}) {
  const [postState, postAction, posting] = useActionState(postDraftAction, IDLE_STATE as ActionState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteDraftAction, IDLE_STATE as ActionState);
  const toast = useToast();
  const router = useRouter();

  if (!isDraft && !canVoid) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FormFeedback state={postState} />
      <FormFeedback state={deleteState} />
      {isDraft ? (
        <>
          <form action={postAction}>
            <input type="hidden" name="journalId" value={journalId} />
            <Button type="submit" disabled={posting}>
              {posting ? "Memposting…" : "Posting jurnal"}
            </Button>
          </form>
          <Link href={`/accounting/journal/new?draft=${journalId}`} className="text-xs text-forest underline underline-offset-4">
            Ubah draf
          </Link>
          <form action={deleteAction}>
            <input type="hidden" name="journalId" value={journalId} />
            <ConfirmButton
              type="submit"
              variant="ghost"
              size="md"
              title="Hapus draf jurnal?"
              description="Draf akan dihapus permanen. Jurnal terposting tidak dapat dihapus."
              confirmLabel="Hapus draf"
              disabled={deleting}
            >
              Hapus draf
            </ConfirmButton>
          </form>
        </>
      ) : null}
      {canVoid ? (
        <ConfirmButton
          title="Batalkan jurnal?"
          description="Jurnal pembalik akan dibuat dengan tanggal hari ini. Jurnal asli tetap tersimpan sebagai riwayat."
          confirmLabel="Batalkan jurnal"
          size="md"
          onConfirm={async () => {
            const result = await voidJournalAction(journalId);
            if (result.status === "error") {
              toast.error(result.message);
              return;
            }
            if (result.status === "success") {
              toast.success(result.message);
              router.refresh();
            }
          }}
        >
          Batalkan
        </ConfirmButton>
      ) : null}
    </div>
  );
}
