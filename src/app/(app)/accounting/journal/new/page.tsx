import { notFound } from "next/navigation";
import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { listLeafAccounts } from "@/server/accounting/accounts";
import { todayISO } from "@/lib/dates";
import { AccountingTabs } from "@/components/layout/AccountingTabs";
import { JournalForm, type JournalDraftData } from "@/components/forms/JournalForm";
import { PageHeader } from "@/components/ui/paper";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jurnal Baru" };

export default async function NewJournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const draftId = typeof params.draft === "string" ? params.draft : undefined;
  const { actor, activeCompany } = await requireActorPage();
  const accounts = await listLeafAccounts(actor);

  let draft: JournalDraftData | undefined;
  if (draftId) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: draftId, companyId: actor.companyId, status: "DRAFT", sourceType: "MANUAL" },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });
    if (!entry) notFound();
    draft = {
      id: entry.id,
      date: entry.date.toISOString().slice(0, 10),
      description: entry.description,
      reference: entry.reference,
      lines: entry.lines.map((line) => ({
        accountId: line.accountId,
        description: line.description,
        debit: Number(line.debit),
        credit: Number(line.credit),
      })),
    };
  }

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title={draft ? `Ubah draf ${draft.date}` : "Jurnal Baru"}
        description="Debit dan kredit harus seimbang. Jurnal terposting langsung memengaruhi buku besar dan laporan."
      />
      <AccountingTabs />
      <JournalForm accounts={accounts} today={todayISO()} draft={draft} />
    </>
  );
}
