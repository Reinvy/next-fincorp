import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getJournalDetail } from "@/server/accounting/journals";
import { DomainError } from "@/lib/db-errors";
import { formatDateID, formatDateTimeID, formatMonthID } from "@/lib/dates";
import { JOURNAL_TYPE_LABELS } from "@/lib/constants";
import { formatIDR } from "@/lib/money";
import { PageHeader, PaperCard, Stamp, StatusStamp } from "@/components/ui/paper";
import { PrintButton } from "@/components/print/PrintButton";
import { PrintHeader } from "@/components/print/PrintHeader";
import { JournalDetailActions } from "@/components/forms/JournalDetailActions";

export const dynamic = "force-dynamic";

export default async function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireActorPage();
  let detail;
  try {
    detail = await getJournalDetail(actor, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const company = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: {
      name: true,
      address: true,
      city: true,
      province: true,
      postalCode: true,
      npwp: true,
      email: true,
      phone: true,
      logoDataUrl: true,
    },
  });
  if (!company) notFound();

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Link href="/accounting/journal" className="text-xs text-ink-soft hover:text-ink">
            ← Kembali ke jurnal
          </Link>
        }
        eyebrow={`Jurnal ${JOURNAL_TYPE_LABELS[detail.type] ?? detail.type}`}
        title={detail.number}
        description={detail.description}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />
            <JournalDetailActions journalId={detail.id} canVoid={detail.canVoid} isDraft={detail.status === "DRAFT"} />
          </div>
        }
      />

      <PaperCard className="print-sheet p-4 sm:p-6">
        <PrintHeader
          company={company}
          title="Jurnal Umum"
          subtitle={detail.number}
          meta={
            <span>
              {formatDateID(detail.date)} · {formatMonthID(detail.date.slice(0, 7))}
            </span>
          }
        />

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="min-w-0">
            <div className="overflow-x-auto">
              <table className="ledger-table" style={{ minWidth: 560 }}>
                <caption className="sr-only">Baris jurnal {detail.number}</caption>
                <thead>
                  <tr>
                    <th scope="col">Akun</th>
                    <th scope="col">Keterangan</th>
                    <th scope="col" className="num">
                      Debit
                    </th>
                    <th scope="col" className="num">
                      Kredit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <span className="font-mono text-[11px] text-ink-faint">{line.accountCode}</span>
                        <span className="ml-2 text-ink">{line.accountName}</span>
                      </td>
                      <td className="text-ink-soft">{line.description ?? "—"}</td>
                      <td className="num">{line.debit ? formatIDR(line.debit) : "—"}</td>
                      <td className="num">{line.credit ? formatIDR(line.credit) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="double-rule">
                    <td colSpan={2} className="px-3 py-3 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                      Total
                    </td>
                    <td className="num px-3 py-3 font-medium">{formatIDR(detail.totalDebit)}</td>
                    <td className="num px-3 py-3 font-medium">{formatIDR(detail.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <aside className="space-y-3 text-sm">
            <div className="border-b border-rule pb-3">
              <p className="eyebrow">Status</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusStamp kind="journal" status={detail.status} />
                {detail.voided ? <Stamp tone="vermilion">Dibatalkan</Stamp> : null}
              </div>
            </div>
            <dl className="space-y-2">
              <div>
                <dt className="eyebrow">Tanggal</dt>
                <dd className="money mt-0.5">{formatDateID(detail.date)}</dd>
              </div>
              <div>
                <dt className="eyebrow">Referensi</dt>
                <dd className="mt-0.5">{detail.reference ?? "—"}</dd>
              </div>
              <div>
                <dt className="eyebrow">Sumber</dt>
                <dd className="mt-0.5">
                  {detail.sourceKind && detail.sourceId ? (
                    <Link href={detail.sourceId} className="text-forest underline underline-offset-4">
                      {detail.sourceKind}
                    </Link>
                  ) : (
                    "Input manual"
                  )}
                </dd>
              </div>
              {detail.postedAt ? (
                <div>
                  <dt className="eyebrow">Diposting</dt>
                  <dd className="mt-0.5 text-xs text-ink-soft">{formatDateTimeID(new Date(detail.postedAt))}</dd>
                </div>
              ) : null}
            </dl>
            {detail.voided ? (
              <p className="border-l-2 border-vermilion bg-vermilion-soft px-3 py-2 text-xs text-vermilion">
                Jurnal ini telah dibalik. Saldo efeknya dihilangkan oleh jurnal pembalik.
              </p>
            ) : null}
            {detail.status === "DRAFT" ? (
              <p className="border-l-2 border-mustard bg-mustard-soft px-3 py-2 text-xs text-ink-soft">
                Draf belum memengaruhi laporan sampai diposting.
              </p>
            ) : null}
          </aside>
        </div>
      </PaperCard>
    </>
  );
}
