import { requireActorPage } from "@/lib/access";
import { listBankAccounts } from "@/server/cash/accounts";
import { getReconciliation } from "@/server/cash/reconciliation";
import { dateFromISO, monthBounds, todayISO } from "@/lib/dates";
import { firstValue } from "@/lib/params";
import { PageHeader, PaperCard, EmptyState, ActionLink } from "@/components/ui/paper";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { ReconciliationClient } from "@/components/forms/ReconciliationClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rekonsiliasi Bank" };

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor, activeCompany } = await requireActorPage();
  const accounts = (await listBankAccounts(actor)).filter((account) => account.isActive);
  const today = dateFromISO(todayISO());
  const defaults = monthBounds(today.toISOString().slice(0, 7));
  const rawAccount = firstValue(params.account);
  const account = accounts.find((entry) => entry.id === rawAccount) ?? accounts[0];
  const rawFrom = firstValue(params.from);
  const rawTo = firstValue(params.to);
  const from = rawFrom ? dateFromISO(rawFrom) : defaults.start;
  const to = rawTo ? dateFromISO(rawTo) : defaults.end;
  const canEdit = actor.role !== "VIEWER";
  const data = account ? await getReconciliation(actor, { bankAccountId: account.id, from, to }) : null;

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Rekonsiliasi Bank"
        description="Bandingkan mutasi rekening yang diimpor dengan jurnal buku besar pada akun bank yang sama."
        actions={<ActionLink href="/cash-bank" variant="secondary">Kembali ke kas &amp; bank</ActionLink>}
      />

      {!account ? (
        <PaperCard>
          <EmptyState
            title="Belum ada rekening aktif"
            description="Tambahkan rekening bank terlebih dahulu untuk memulai rekonsiliasi."
            action={<ActionLink href="/cash-bank">Buka kas &amp; bank</ActionLink>}
          />
        </PaperCard>
      ) : (
        <>
          <PaperCard className="mb-4 overflow-hidden">
            <SearchFilterBar action="/cash-bank/reconciliation" resetHref="/cash-bank/reconciliation">
              <Field label="Rekening" htmlFor="account">
                <Select id="account" name="account" defaultValue={account.id} className="h-9 min-w-[220px]">
                  {accounts.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} · {entry.coaCode}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Dari" htmlFor="from">
                <Input id="from" name="from" type="date" defaultValue={from.toISOString().slice(0, 10)} className="h-9" />
              </Field>
              <Field label="Sampai" htmlFor="to">
                <Input id="to" name="to" type="date" defaultValue={to.toISOString().slice(0, 10)} className="h-9" />
              </Field>
            </SearchFilterBar>
          </PaperCard>

          {data ? (
            <ReconciliationClient
              data={data}
              canEdit={canEdit}
              fromISO={from.toISOString().slice(0, 10)}
              toISO={to.toISOString().slice(0, 10)}
            />
          ) : null}
        </>
      )}
    </>
  );
}
