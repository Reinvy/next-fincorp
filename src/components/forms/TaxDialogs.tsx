"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { payTaxAction, settlePpnAction } from "@/actions/tax";
import { toggleDeadlineAction } from "@/actions/deadlines";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { BankAccountSummary, DeadlineView } from "@/lib/dto";
import { formatIDR } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";

export function SettlePpnDialog({
  period,
  net,
  banks,
}: {
  period: string;
  net: number;
  banks: BankAccountSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(settlePpnAction, IDLE_STATE as ActionState);
  const available = banks.filter((bank) => bank.isActive);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Selesaikan PPN</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Selesaikan PPN ${period}`}
        description={
          net > 0
            ? `Kurang bayar ${formatIDR(net)}. Jurnal kompensasi dan pembayaran dibuat terpisah.`
            : "Posisi lebih bayar akan dikompensasi ke PPN Lebih Bayar tanpa pembayaran kas."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="settle-ppn-form" disabled={pending}>
              {pending ? "Memproses…" : "Selesaikan"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="settle-ppn-form" action={formAction} className="space-y-4">
          <input type="hidden" name="period" value={period} />
          {net > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rekening pembayar" htmlFor="settle-bank" required>
                <Select id="settle-bank" name="bankAccountId" required defaultValue={available[0]?.id ?? ""}>
                  {available.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} · saldo {formatIDR(bank.balance)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tanggal bayar" htmlFor="settle-date" required>
                <Input id="settle-date" name="paymentDate" type="date" required defaultValue={todayISO()} />
              </Field>
            </div>
          ) : (
            <p className="border-l-2 border-sky bg-sky-soft px-3 py-2 text-xs text-ink-soft">
              Tidak ada pembayaran kas untuk posisi ini.
            </p>
          )}
          <p className="text-xs text-ink-faint">
            Periode yang sudah ditutup tidak dapat diselesaikan. Buka kembali periode bila perlu.
          </p>
        </form>
      </Dialog>
    </>
  );
}

export function PayTaxDialog({
  period,
  banks,
  rows,
}: {
  period: string;
  banks: BankAccountSummary[];
  rows: Array<{ type: string; label: string; liability: number }>;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(rows.find((row) => row.liability > 0)?.type ?? rows[0]?.type ?? "PPH23");
  const [state, formAction, pending] = useActionState(payTaxAction, IDLE_STATE as ActionState);
  const available = banks.filter((bank) => bank.isActive);
  const selected = rows.find((row) => row.type === type);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Bayar pajak</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Pembayaran pajak"
        description="Pembayaran hanya sebesar saldo liabilitas yang sudah tercatat. PPh 21 memerlukan jurnal liabilitas manual."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="pay-tax-form" disabled={pending}>
              {pending ? "Memproses…" : "Bayar"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="pay-tax-form" action={formAction} className="space-y-4">
          <input type="hidden" name="period" value={period} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis pajak" htmlFor="pay-tax-type" required>
              <Select id="pay-tax-type" name="type" value={type} onChange={(event) => setType(event.target.value)}>
                {rows.map((row) => (
                  <option key={row.type} value={row.type}>{row.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Saldo liabilitas" htmlFor="pay-tax-liability">
              <Input id="pay-tax-liability" value={formatIDR(selected?.liability ?? 0)} readOnly className="font-mono" />
            </Field>
            <Field label="Nominal" htmlFor="pay-tax-amount" required>
              <MoneyInput name="amount" defaultValue={Math.max(0, Math.floor(selected?.liability ?? 0))} required />
            </Field>
            <Field label="Tanggal bayar" htmlFor="pay-tax-date" required>
              <Input id="pay-tax-date" name="paymentDate" type="date" required defaultValue={todayISO()} />
            </Field>
            <Field label="Rekening" htmlFor="pay-tax-bank" required>
              <Select id="pay-tax-bank" name="bankAccountId" required defaultValue={available[0]?.id ?? ""}>
                {available.map((bank) => (
                  <option key={bank.id} value={bank.id}>{bank.name} · {formatIDR(bank.balance)}</option>
                ))}
              </Select>
            </Field>
            <Field label="ID billing" htmlFor="pay-tax-billing">
              <Input id="pay-tax-billing" name="billingId" maxLength={60} />
            </Field>
            <Field label="NTPN" htmlFor="pay-tax-ntpn">
              <Input id="pay-tax-ntpn" name="ntpN" maxLength={40} />
            </Field>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function DeadlineCompleteButton({ deadline }: { deadline: DeadlineView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const completed = deadline.status === "done";
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleDeadlineAction(deadline.id, !completed);
          if (result.status === "error") toast.error(result.message);
          if (result.status === "success") {
            toast.success(result.message);
            router.refresh();
          }
        })
      }
    >
      {pending ? "…" : completed ? "Buka" : "Selesai"}
    </Button>
  );
}
