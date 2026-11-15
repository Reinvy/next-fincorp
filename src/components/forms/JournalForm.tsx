"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveJournalAction } from "@/actions/journals";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { AccountOption } from "@/lib/dto";
import { formatIDR, formatNumberID } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { SectionRule, Stamp } from "@/components/ui/paper";

interface LineState {
  key: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

export interface JournalDraftData {
  id: string;
  date: string;
  description: string;
  reference: string | null;
  lines: Array<{ accountId: string; description: string | null; debit: number; credit: number }>;
}

let lineCounter = 0;
function newLine(): LineState {
  lineCounter += 1;
  return { key: `line-${lineCounter}`, accountId: "", description: "", debit: "", credit: "" };
}

export function JournalForm({
  accounts,
  today,
  draft,
}: {
  accounts: AccountOption[];
  today: string;
  draft?: JournalDraftData;
}) {
  const [lines, setLines] = useState<LineState[]>(() =>
    draft
      ? draft.lines.map((line) => {
          lineCounter += 1;
          return {
            key: `line-${lineCounter}`,
            accountId: line.accountId,
            description: line.description ?? "",
            debit: line.debit ? String(Math.round(line.debit)) : "",
            credit: line.credit ? String(Math.round(line.credit)) : "",
          };
        })
      : [newLine(), newLine()],
  );
  const [state, formAction, pending] = useActionState(saveJournalAction, IDLE_STATE as ActionState);

  const totals = useMemo(() => {
    const debit = lines.reduce((acc, line) => acc + (line.debit ? Number(line.debit) : 0), 0);
    const credit = lines.reduce((acc, line) => acc + (line.credit ? Number(line.credit) : 0), 0);
    return { debit, credit, difference: debit - credit };
  }, [lines]);
  const balanced = totals.difference === 0 && totals.debit > 0;

  function updateLine(key: string, patch: Partial<LineState>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: string) {
    setLines((current) => (current.length <= 2 ? current : current.filter((line) => line.key !== key)));
  }

  const linesJson = JSON.stringify(
    lines.map((line) => ({
      accountId: line.accountId,
      description: line.description,
      debit: line.debit || "0",
      credit: line.credit || "0",
    })),
  );

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-6">
      <FormFeedback state={state} />
      {draft ? <input type="hidden" name="journalId" value={draft.id} /> : null}
      <input type="hidden" name="linesJson" value={linesJson} />

      <section className="paper-sheet p-4 sm:p-5">
        <SectionRule label="Keterangan jurnal" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Tanggal" htmlFor="journal-date" required error={fieldErrors.date}>
            <DateInput id="journal-date" name="date" required defaultValue={draft?.date ?? today} />
          </Field>
          <Field label="Referensi" htmlFor="journal-reference" error={fieldErrors.reference}>
            <Input id="journal-reference" name="reference" maxLength={80} defaultValue={draft?.reference ?? ""} />
          </Field>
          <div className="sm:col-span-1">
            <Field label="Status keseimbangan">
              <div className="flex h-[38px] items-center rounded-[3px] border border-rule bg-paper-light px-3">
                {balanced ? (
                  <Stamp tone="forest">Seimbang</Stamp>
                ) : (
                  <span className="font-mono text-[11px] text-vermilion">
                    Selisih {formatIDR(Math.abs(totals.difference))}
                  </span>
                )}
              </div>
            </Field>
          </div>
        </div>
        <div className="mt-4">
          <Field label="Keterangan" htmlFor="journal-description" required error={fieldErrors.description}>
            <Input
              id="journal-description"
              name="description"
              required
              maxLength={240}
              minLength={3}
              defaultValue={draft?.description}
              placeholder="Contoh: Penyesuaian beban sewa bulan November"
            />
          </Field>
        </div>
      </section>

      <section className="paper-sheet overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <div>
            <h2 className="font-display text-[22px] font-semibold leading-tight text-ink">Baris jurnal</h2>
            <p className="text-xs text-ink-faint">Setiap baris hanya boleh memiliki debit atau kredit.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setLines((current) => [...current, newLine()])}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Baris
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 880 }}>
            <caption className="sr-only">Baris jurnal manual</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: "30%" }}>
                  Akun
                </th>
                <th scope="col">Keterangan</th>
                <th scope="col" className="num" style={{ width: 150 }}>
                  Debit
                </th>
                <th scope="col" className="num" style={{ width: 150 }}>
                  Kredit
                </th>
                <th scope="col" style={{ width: 44 }}>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.key}>
                  <td>
                    <label htmlFor={`account-${line.key}`} className="sr-only">
                      Akun baris {index + 1}
                    </label>
                    <Select
                      id={`account-${line.key}`}
                      value={line.accountId}
                      onChange={(event) => updateLine(line.key, { accountId: event.target.value })}
                      className="h-9 text-[12px]"
                    >
                      <option value="">Pilih akun…</option>
                      {accounts.map((account) => (
                        <option key={account.value} value={account.value}>
                          {account.code} · {account.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <label htmlFor={`desc-${line.key}`} className="sr-only">
                      Keterangan baris {index + 1}
                    </label>
                    <Input
                      id={`desc-${line.key}`}
                      value={line.description}
                      maxLength={200}
                      onChange={(event) => updateLine(line.key, { description: event.target.value })}
                      className="h-9 text-[12px]"
                    />
                  </td>
                  <td>
                    <MoneyInput
                      name={`debit-${line.key}`}
                      value={line.debit}
                      onValueChange={(digits) => updateLine(line.key, { debit: digits, credit: digits ? "" : line.credit })}
                      className="h-9"
                    />
                  </td>
                  <td>
                    <MoneyInput
                      name={`credit-${line.key}`}
                      value={line.credit}
                      onValueChange={(digits) => updateLine(line.key, { credit: digits, debit: digits ? "" : line.debit })}
                      className="h-9"
                    />
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus baris ${index + 1}`}
                      disabled={lines.length <= 2}
                      onClick={() => removeLine(line.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-rule-strong bg-paper-light">
                <td colSpan={2} className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  Total
                </td>
                <td className="num px-3 py-2 font-medium">{formatIDR(totals.debit)}</td>
                <td className="num px-3 py-2 font-medium">{formatIDR(totals.credit)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {state.status === "error" ? (
        <p role="alert" className="border-l-2 border-vermilion bg-vermilion-soft px-3 py-2 text-[13px] text-vermilion">
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-ink-faint">
            {balanced ? "Jurnal seimbang" : `Belum seimbang · selisih ${formatNumberID(Math.abs(totals.difference))}`}
          </p>
          <div className="flex items-center gap-2">
            <Button type="submit" name="mode" value="draft" variant="secondary" disabled={pending || !balanced}>
              {pending ? "Memproses…" : "Simpan draf"}
            </Button>
            <Button type="submit" name="mode" value="post" disabled={pending || !balanced}>
              {pending ? "Memproses…" : "Posting jurnal"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
