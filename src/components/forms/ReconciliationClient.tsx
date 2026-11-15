"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  autoMatchAction,
  ignoreStatementAction,
  importStatementAction,
  matchStatementAction,
  unmatchStatementAction,
} from "@/actions/cash";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { CandidateLine, ReconciliationData, StatementLineView } from "@/server/cash/reconciliation";
import { formatDateID } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Stamp, StatusStamp } from "@/components/ui/paper";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";

function StatementRow({
  line,
  candidates,
  canEdit,
}: {
  line: StatementLineView;
  candidates: CandidateLine[];
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(matchStatementAction, IDLE_STATE as ActionState);
  const toast = useToast();
  const router = useRouter();
  const [rowPending, startTransition] = useTransition();
  const exact = candidates.filter((candidate) => candidate.amount === line.amount);

  function run(action: (lineId: string) => Promise<ActionState>) {
    startTransition(async () => {
      const result = await action(line.id);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  return (
    <tr>
      <td className="font-mono text-xs">{formatDateID(line.date)}</td>
      <td>
        <p className="text-ink">{line.description}</p>
        {line.reference ? <p className="font-mono text-[10px] text-ink-faint">{line.reference}</p> : null}
      </td>
      <td className={`num ${line.amount < 0 ? "text-vermilion" : "text-forest"}`}>{formatIDR(line.amount)}</td>
      <td>
        <StatusStamp
          kind="period"
          status={line.status === "MATCHED" ? "OPEN" : line.status === "IGNORED" ? "CLOSED" : "CLOSED"}
          label={line.status === "MATCHED" ? "Cocok" : line.status === "IGNORED" ? "Diabaikan" : "Belum"}
        />
      </td>
      <td>
        {line.status === "MATCHED" ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">{line.matchedJournalNumber}</span>
            {canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={rowPending}
                onClick={() => run(unmatchStatementAction)}
              >
                Lepas
              </Button>
            ) : null}
          </div>
        ) : line.status === "IGNORED" ? (
          <span className="text-xs text-ink-faint">Tidak dicocokkan</span>
        ) : canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <FormFeedback state={state} />
            <form action={formAction} className="flex items-center gap-1.5">
              <input type="hidden" name="lineId" value={line.id} />
              <label htmlFor={`match-${line.id}`} className="sr-only">
                Pilih jurnal untuk {line.description}
              </label>
              <select
                id={`match-${line.id}`}
                name="journalLineId"
                className="h-8 max-w-[220px] rounded-[3px] border border-rule bg-paper-light px-2 font-mono text-[11px]"
                defaultValue={exact[0]?.id ?? ""}
                disabled={exact.length === 0 || pending}
              >
                {exact.length === 0 ? <option value="">Tidak ada kandidat</option> : null}
                {exact.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {formatDateID(candidate.date)} · {candidate.number} · {formatIDR(candidate.amount)}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="secondary" disabled={exact.length === 0 || pending}>
                Cocokkan
              </Button>
            </form>
            <Button variant="ghost" size="sm" disabled={rowPending} onClick={() => run(ignoreStatementAction)}>
              Abaikan
            </Button>
          </div>
        ) : (
          <span className="text-xs text-ink-faint">—</span>
        )}
      </td>
    </tr>
  );
}

export function ReconciliationClient({
  data,
  canEdit,
  fromISO,
  toISO,
}: {
  data: ReconciliationData;
  canEdit: boolean;
  fromISO: string;
  toISO: string;
}) {
  const [importState, importAction, importing] = useActionState(importStatementAction, IDLE_STATE as ActionState);
  const toast = useToast();
  const router = useRouter();
  const [autoPending, startAuto] = useTransition();

  function autoMatch() {
    startAuto(async () => {
      const result = await autoMatchAction(data.account.id, fromISO, toISO);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="paper-sheet px-4 py-3">
          <p className="eyebrow">Total mutasi bank</p>
          <p className="mt-1 font-mono text-lg">{formatIDR(data.summary.statementTotal)}</p>
          <p className="mt-1 text-xs text-ink-faint">{data.summary.matched} cocok · {data.summary.unmatched} belum</p>
        </div>
        <div className="paper-sheet px-4 py-3">
          <p className="eyebrow">Total buku rekening</p>
          <p className="mt-1 font-mono text-lg">{formatIDR(data.summary.ledgerTotal)}</p>
          <p className="mt-1 text-xs text-ink-faint">Jurnal terposting periode ini</p>
        </div>
        <div className="paper-sheet px-4 py-3">
          <p className="eyebrow">Selisih</p>
          <p className={`mt-1 font-mono text-lg ${data.summary.difference === 0 ? "text-forest" : "text-vermilion"}`}>
            {formatIDR(data.summary.difference)}
          </p>
          <p className="mt-1 text-xs text-ink-faint">Mutasi bank − buku</p>
        </div>
        <div className="paper-sheet px-4 py-3">
          <p className="eyebrow">Status</p>
          <div className="mt-2">{data.summary.done ? <Stamp tone="forest">Selesai</Stamp> : <Stamp tone="mustard">Belum selesai</Stamp>}</div>
          <p className="mt-1 text-xs text-ink-faint">{data.summary.ignored} diabaikan</p>
        </div>
      </div>

      {canEdit ? (
        <section className="paper-sheet p-4">
          <h2 className="font-display text-lg font-semibold text-ink">Impor mutasi rekening</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Header wajib: <span className="font-mono">date,description,reference,amount</span>. Tanggal YYYY-MM-DD,
            nominal positif untuk dana masuk dan negatif untuk keluar. Maksimal 2.000 baris.
          </p>
          <FormFeedback state={importState} />
          <form action={importAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <input type="hidden" name="bankAccountId" value={data.account.id} />
            <Field label="Berkas CSV" htmlFor="statement-file">
              <Input id="statement-file" name="file" type="file" accept=".csv,text/csv" className="h-[38px] py-1.5" />
            </Field>
            <Field label="Atau tempel CSV" htmlFor="statement-csv">
              <Textarea id="statement-csv" name="csv" rows={2} placeholder="date,description,reference,amount" />
            </Field>
            <Button type="submit" disabled={importing}>
              {importing ? "Mengimpor…" : "Impor"}
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" disabled={autoPending || data.summary.unmatched === 0} onClick={autoMatch}>
              {autoPending ? "Mencocokkan…" : "Cocokkan otomatis"}
            </Button>
            <span className="text-xs text-ink-faint">
              Cocok otomatis memakai nominal sama dan tanggal ±3 hari; nominal ganda harus dicocokkan manual.
            </span>
          </div>
        </section>
      ) : null}

      <section className="paper-sheet overflow-hidden">
        <div className="border-b border-rule px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-ink">Baris mutasi</h2>
          <p className="text-xs text-ink-faint">
            {data.account.name} · {formatDateID(fromISO)} – {formatDateID(toISO)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 860 }}>
            <caption className="sr-only">Baris mutasi rekening yang diimpor</caption>
            <thead>
              <tr>
                <th scope="col">Tanggal</th>
                <th scope="col">Keterangan</th>
                <th scope="col" className="num">Nominal</th>
                <th scope="col">Status</th>
                <th scope="col">Jurnal</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="!h-24 text-center text-sm text-ink-soft">
                    Belum ada mutasi diimpor untuk periode ini.
                  </td>
                </tr>
              ) : (
                data.lines.map((line) => (
                  <StatementRow
                    key={line.id}
                    line={line}
                    candidates={data.candidates}
                    canEdit={canEdit}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-ink-faint">
        Selisih nol berarti seluruh mutasi bank periode ini sudah tercatat di buku. Baris yang tidak relevan dapat
        diabaikan tanpa memengaruhi jurnal.
      </p>
    </div>
  );
}
