import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getFixedAsset } from "@/server/assets/assets";
import { projectDepreciation } from "@/server/assets/depreciation";
import { listBankAccounts } from "@/server/cash/accounts";
import { DomainError } from "@/lib/db-errors";
import { formatDateID, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { DisposalDialog } from "@/components/forms/AssetDialogs";
import { KpiCard, PageHeader, PaperCard, SectionRule, StatusStamp } from "@/components/ui/paper";
import { PrintButton } from "@/components/print/PrintButton";

export const dynamic = "force-dynamic";

export default async function FixedAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireActorPage();
  let asset;
  try {
    asset = await getFixedAsset(actor, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const [banks, acquisitionJournal, disposalJournal] = await Promise.all([
    listBankAccounts(actor),
    prisma.journalEntry.findFirst({
      where: { companyId: actor.companyId, sourceType: "ASSET_ACQUISITION", sourceId: asset.id },
      select: { id: true, number: true, date: true },
    }),
    prisma.journalEntry.findFirst({
      where: { companyId: actor.companyId, sourceType: "ASSET_DISPOSAL", sourceId: asset.id },
      select: { id: true, number: true, date: true },
    }),
  ]);
  const schedule = asset.status === "DISPOSED" ? [] : projectDepreciation(asset, todayISO().slice(0, 7), 24);
  const canEdit = actor.role !== "VIEWER" && asset.status !== "DISPOSED";

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Link href="/fixed-assets" className="text-xs text-ink-soft hover:text-ink">
            ← Kembali ke aset tetap
          </Link>
        }
        eyebrow={asset.category}
        title={`${asset.code} · ${asset.name}`}
        description={`Diperoleh ${formatDateID(asset.purchaseDate)} · ${asset.usefulLifeMonths} bulan · ${asset.method === "STRAIGHT_LINE" ? "garis lurus" : "saldo menurun"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />
            {canEdit ? <DisposalDialog assetId={asset.id} accounts={banks} /> : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Harga perolehan" value={formatIDR(asset.purchasePrice)} note={formatDateID(asset.purchaseDate)} index="01" />
        <KpiCard label="Akumulasi" value={formatIDR(asset.accumulatedDepreciation)} note={`Residu ${formatIDR(asset.residualValue)}`} index="02" tone="mustard" />
        <KpiCard label="Nilai buku" value={formatIDR(asset.bookValue)} note={`${formatIDR(asset.monthlyDepreciation)} / bulan`} index="03" tone="forest" />
        <KpiCard
          label="Status"
          value={asset.status === "ACTIVE" ? "Aktif" : asset.status === "FULLY_DEPRECIATED" ? "Habis susut" : "Dilepas"}
          note={asset.disposalDate ? formatDateID(asset.disposalDate) : asset.location ?? "—"}
          index="04"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusStamp kind="asset" status={asset.status} />
        {asset.method === "DECLINING_BALANCE" ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
            Tarif {asset.annualRate ? `${asset.annualRate}%` : "200% ÷ umur"}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <PaperCard className="overflow-hidden print-sheet">
          <div className="border-b border-rule px-4 py-3">
            <SectionRule label="Proyeksi penyusutan" right={<span className="font-mono text-[10px] text-ink-faint">24 bulan</span>} />
          </div>
          {schedule.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">Aset sudah habis disusutkan; tidak ada proyeksi tersisa.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="ledger-table" style={{ minWidth: 560 }}>
                <caption className="sr-only">Proyeksi penyusutan {asset.name}</caption>
                <thead>
                  <tr>
                    <th scope="col">Periode</th>
                    <th scope="col" className="num">Beban</th>
                    <th scope="col" className="num">Akumulasi</th>
                    <th scope="col" className="num">Nilai buku</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row) => (
                    <tr key={row.period}>
                      <td className="font-mono text-xs">{row.period}</td>
                      <td className="num">{formatIDR(row.amount)}</td>
                      <td className="num">{formatIDR(row.accumulatedAfter)}</td>
                      <td className="num">{formatIDR(row.bookValueAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PaperCard>

        <div className="space-y-4">
          <PaperCard className="p-4">
            <SectionRule label="Jurnal terkait" />
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between gap-2">
                <span className="text-ink-soft">Perolehan</span>
                {acquisitionJournal ? (
                  <Link href={`/accounting/journal/${acquisitionJournal.id}`} className="font-mono text-xs text-forest underline underline-offset-4">
                    {acquisitionJournal.number}
                  </Link>
                ) : (
                  <span className="text-xs text-ink-faint">—</span>
                )}
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-ink-soft">Pelepasan</span>
                {disposalJournal ? (
                  <Link href={`/accounting/journal/${disposalJournal.id}`} className="font-mono text-xs text-forest underline underline-offset-4">
                    {disposalJournal.number}
                  </Link>
                ) : (
                  <span className="text-xs text-ink-faint">—</span>
                )}
              </li>
            </ul>
            {asset.disposalGainLoss !== null ? (
              <p className={`mt-3 border-l-2 px-3 py-2 text-xs ${asset.disposalGainLoss >= 0 ? "border-forest bg-forest-soft text-forest" : "border-vermilion bg-vermilion-soft text-vermilion"}`}>
                {asset.disposalGainLoss >= 0 ? "Keuntungan" : "Kerugian"} pelepasan {formatIDR(Math.abs(asset.disposalGainLoss))}
              </p>
            ) : null}
          </PaperCard>

          <PaperCard className="p-4">
            <SectionRule label="Akun" />
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Aset</dt><dd className="text-right font-mono text-xs">{asset.assetAccountName}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Akumulasi</dt><dd className="text-right font-mono text-xs">{asset.accumulatedAccountName}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Beban</dt><dd className="text-right font-mono text-xs">{asset.depreciationExpenseAccountName}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Pendanaan</dt><dd>{asset.fundingType === "BANK" ? "Bank" : "Kas"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Penanggung jawab</dt><dd>{asset.responsible ?? "—"}</dd></div>
            </dl>
          </PaperCard>
        </div>
      </div>
    </>
  );
}
