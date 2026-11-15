import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActorPage } from "@/lib/access";
import { getTicket } from "@/server/support/tickets";
import { DomainError } from "@/lib/db-errors";
import { formatDateTimeID } from "@/lib/dates";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from "@/lib/constants";
import { PageHeader, PaperCard, SectionRule, StatusStamp } from "@/components/ui/paper";
import { ReplyForm, TicketStatusControls } from "@/components/forms/SupportDialogs";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, user, activeCompany } = await requireActorPage();
  let ticket;
  try {
    ticket = await getTicket(actor, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const isOwner = ticket.userId === user.id;
  const isAdmin = actor.role === "ADMIN";
  const canReply = ticket.status !== "CLOSED" && (isOwner || isAdmin);

  return (
    <>
      <PageHeader
        breadcrumbs={<Link href="/support" className="text-xs text-ink-soft hover:text-ink">← Kembali ke bantuan</Link>}
        eyebrow={`${ticket.number} · ${TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}`}
        title={ticket.subject}
        description={`Dibuka oleh ${ticket.userName} · ${formatDateTimeID(new Date(ticket.createdAt))} · prioritas ${TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp kind="ticket" status={ticket.status} />
            <TicketStatusControls ticketId={ticket.id} status={ticket.status} isAdmin={isAdmin} isOwner={isOwner} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <PaperCard className="p-4 sm:p-5">
          <SectionRule label="Percakapan" />
          <ol className="mt-4 space-y-3">
            <li className="border-l-2 border-forest bg-forest-soft/40 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                {ticket.userName} · pembukaan tiket
              </p>
              <p className="mt-1 whitespace-pre-line text-[13px] text-ink">{ticket.description}</p>
            </li>
            {ticket.messages.map((message) => (
              <li key={message.id} className="border-l-2 border-rule px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                  {message.userName} · {formatDateTimeID(new Date(message.createdAt))}
                </p>
                <p className="mt-1 whitespace-pre-line text-[13px] text-ink">{message.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t border-rule pt-4">
            <ReplyForm ticketId={ticket.id} disabled={!canReply} />
          </div>
        </PaperCard>

        <aside className="space-y-4">
          <PaperCard className="p-4">
            <SectionRule label="Status" />
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Status</dt><dd><StatusStamp kind="ticket" status={ticket.status} /></dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Prioritas</dt><dd>{TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Kategori</dt><dd>{TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Pesan</dt><dd>{ticket.messages.length + 1}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-ink-faint">
              {activeCompany.companyName} · tiket hanya terlihat oleh anggota perusahaan.
            </p>
          </PaperCard>
          <PaperCard className="p-4 text-xs text-ink-soft">
            <p className="font-medium text-ink">Alur status</p>
            <p className="mt-1">Baru → Diproses → Selesai → Ditutup. Admin dapat memundurkan satu langkah; tiket tertutup bersifat final.</p>
          </PaperCard>
        </aside>
      </div>
    </>
  );
}
