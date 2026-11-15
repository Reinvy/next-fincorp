"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postPurchaseInvoiceAction, voidPurchaseInvoiceAction, voidPurchasePaymentAction } from "@/actions/purchases";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { BankAccountSummary, PurchaseInvoiceDetail } from "@/lib/dto";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";
import { PurchaseDebitNoteDialog, PurchasePaymentDialog } from "@/components/forms/PurchaseDialogs";
import { formatIDR } from "@/lib/money";

export function PurchaseActions({
  invoice,
  accounts,
  today,
}: {
  invoice: PurchaseInvoiceDetail;
  accounts: BankAccountSummary[];
  today: string;
}) {
  const [postState, postAction, posting] = useActionState(postPurchaseInvoiceAction, IDLE_STATE as ActionState);
  const [voidState, voidAction, voiding] = useActionState(voidPurchaseInvoiceAction, IDLE_STATE as ActionState);
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <FormFeedback state={postState} />
      <FormFeedback state={voidState} />
      {invoice.status === "DRAFT" ? (
        <>
          <form action={postAction}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <Button type="submit" disabled={posting}>{posting ? "Memposting…" : "Posting faktur"}</Button>
          </form>
          <form action={voidAction}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <ConfirmButton
              type="submit"
              variant="ghost"
              title="Batalkan draf pembelian?"
              description="Draf akan ditandai batal."
              confirmLabel="Batalkan faktur"
              disabled={voiding}
            >
              Batalkan
            </ConfirmButton>
          </form>
        </>
      ) : null}

      {invoice.canPay ? (
        <PurchasePaymentDialog
          invoiceId={invoice.id}
          outstanding={invoice.outstanding}
          withholdingAmount={invoice.withholdingAmount}
          bankAmountHint={invoice.outstanding - invoice.withholdingAmount}
          accounts={accounts}
          today={today}
        />
      ) : null}

      {invoice.canReturn ? (
        <PurchaseDebitNoteDialog
          invoiceId={invoice.id}
          outstanding={invoice.outstanding}
          today={today}
          items={invoice.items.map((item) => ({
            id: item.id,
            description: item.description,
            accountName: item.accountName ?? "",
            quantity: item.quantity,
            creditedQuantity: item.creditedQuantity ?? 0,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
          }))}
        />
      ) : null}

      {invoice.canVoid && invoice.status !== "DRAFT" ? (
        <form action={voidAction}>
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <ConfirmButton
            type="submit"
            variant="danger"
            title="Batalkan faktur pembelian?"
            description="Jurnal pembalik dibuat dan faktur ditandai batal."
            confirmLabel="Batalkan faktur"
            disabled={voiding}
          >
            Batalkan faktur
          </ConfirmButton>
        </form>
      ) : null}

      {invoice.payments.filter((payment) => !payment.voided).length > 0 ? (
        <details className="group relative">
          <summary className="cursor-pointer list-none rounded-[3px] border border-rule px-2 py-1 text-[11px] text-ink-soft hover:bg-paper-light [&::-webkit-details-marker]:hidden">
            Batalkan pembayaran
          </summary>
          <div className="absolute right-0 z-40 mt-1 w-72 space-y-1 rounded-[3px] border border-rule bg-card p-2 shadow-lg">
            {invoice.payments
              .filter((payment) => !payment.voided)
              .map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    {payment.date} · {formatIDR(payment.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await voidPurchasePaymentAction(payment.id);
                        if (result.status === "error") toast.error(result.message);
                        if (result.status === "success") {
                          toast.success(result.message);
                          router.refresh();
                        }
                      })
                    }
                  >
                    Batalkan
                  </Button>
                </div>
              ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
