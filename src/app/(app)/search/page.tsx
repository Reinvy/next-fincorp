import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { searchCompany } from "@/server/accounting/search";
import { firstValue } from "@/lib/params";
import { PageHeader, PaperCard } from "@/components/ui/paper";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pencarian" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q)?.trim() ?? "";
  const { actor, activeCompany } = await requireActorPage();
  const groups = await searchCompany(actor, q);
  const total = groups.reduce((acc, group) => acc + group.items.length, 0);

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Pencarian"
        description={q ? `Hasil untuk “${q}” · ${total} item` : "Cari nomor faktur, pelanggan, jurnal, akun, atau aset."}
      />
      <PaperCard className="overflow-hidden">
        <SearchFilterBar action="/search" resetHref="/search" submitLabel="Cari">
          <Field label="Kata kunci" htmlFor="q">
            <Input id="q" name="q" defaultValue={q} placeholder="Minimal 2 karakter" className="h-9 min-w-[280px]" />
          </Field>
        </SearchFilterBar>
        {q.length < 2 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-soft">Masukkan minimal dua karakter untuk mencari.</p>
        ) : groups.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-soft">Tidak ada hasil pada perusahaan ini.</p>
        ) : (
          <div className="divide-y divide-rule">
            {groups.map((group) => (
              <section key={group.key} className="px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{group.label}</p>
                <ul className="mt-1.5 space-y-1">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} className="flex items-baseline justify-between gap-3 rounded-[2px] px-1 py-1 hover:bg-paper-light">
                        <span className="text-[13px] text-ink">{item.title}</span>
                        <span className="truncate text-[11px] text-ink-faint">{item.subtitle}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PaperCard>
    </>
  );
}
