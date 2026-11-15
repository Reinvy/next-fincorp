import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { listTickets } from "@/server/support/tickets";
import { formatDateTimeID } from "@/lib/dates";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from "@/lib/constants";
import { PageHeader, PaperCard, SectionRule, StatusStamp } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { SupportFaq } from "@/components/domain/SupportFaq";
import { CreateTicketDialog } from "@/components/forms/SupportDialogs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bantuan" };

export default async function SupportPage() {
  const { actor, activeCompany } = await requireActorPage();
  const tickets = await listTickets(actor);

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Bantuan"
        description="Pertanyaan umum dan tiket dukungan. Tiket hanya terlihat oleh anggota perusahaan ini."
        actions={<CreateTicketDialog />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <PaperCard className="overflow-hidden">
          <div className="border-b border-rule px-4 py-3">
            <SectionRule label="Tiket saya & tim" right={<span className="font-mono text-[10px] text-ink-faint">{tickets.length} tiket</span>} />
          </div>
          <DataTable
            caption="Daftar tiket bantuan"
            rows={tickets}
            getRowKey={(row) => row.id}
            rowHref={(row) => `/support/${row.id}`}
            minWidth={620}
            empty={<div className="px-6 py-10 text-center text-sm text-ink-soft">Belum ada tiket. Buka tiket bila ada kendala.</div>}
            columns={[
              { key: "number", header: "Nomor", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
              { key: "subject", header: "Subjek", render: (row) => <span className="block max-w-[260px] truncate">{row.subject}</span> },
              { key: "category", header: "Kategori", render: (row) => TICKET_CATEGORY_LABELS[row.category] ?? row.category },
              {
                key: "priority",
                header: "Prioritas",
                render: (row) => (
                  <span className={`font-mono text-[10px] uppercase tracking-[0.08em] ${row.priority === "URGENT" ? "text-vermilion" : row.priority === "HIGH" ? "text-mustard" : "text-ink-soft"}`}>
                    {TICKET_PRIORITY_LABELS[row.priority] ?? row.priority}
                  </span>
                ),
              },
              { key: "status", header: "Status", render: (row) => <StatusStamp kind="ticket" status={row.status} /> },
              {
                key: "updated",
                header: "Diperbarui",
                render: (row) => <span className="font-mono text-[10px] text-ink-faint">{formatDateTimeID(new Date(row.updatedAt))}</span>,
              },
            ]}
          />
        </PaperCard>

        <div className="space-y-4">
          <SupportFaq />
          <PaperCard className="p-4 text-xs text-ink-soft">
            <p className="font-medium text-ink">Batasan bantuan</p>
            <p className="mt-1">
              Tim dukungan tidak mengubah jurnal atas nama Anda. Untuk koreksi, gunakan jurnal pembalik atau batalkan
              dokumen sumber agar jejak audit tetap utuh.
            </p>
            <Link href="/support" className="mt-2 inline-block text-forest underline underline-offset-4">
              Muat ulang daftar tiket
            </Link>
          </PaperCard>
        </div>
      </div>
    </>
  );
}
