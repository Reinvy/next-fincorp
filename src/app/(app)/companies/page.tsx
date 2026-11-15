import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { ROLE_LABELS } from "@/lib/constants";
import { ActionLink, KpiCard, PageHeader, PaperCard, SectionRule, Stamp } from "@/components/ui/paper";
import { CreateCompanyDialog, SwitchCompanyButton } from "@/components/forms/CompanyActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Perusahaan" };

export default async function CompaniesPage() {
  const { user, memberships, activeCompany, actor } = await requireActorPage();

  return (
    <>
      <PageHeader
        eyebrow={`${memberships.length} keanggotaan`}
        title="Perusahaan"
        description={`Halo ${user.name}. Setiap perusahaan memiliki bagan akun, jurnal, dan laporan yang terpisah.`}
        actions={<CreateCompanyDialog hasMemberships={memberships.length > 0} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Perusahaan aktif" value={activeCompany.companyName} note={ROLE_LABELS[activeCompany.role]} index="01" />
        <KpiCard label="Total keanggotaan" value={String(memberships.length)} note="Termasuk peran berbeda" index="02" />
        <KpiCard label="Peran Anda di sini" value={ROLE_LABELS[activeCompany.role]} note={activeCompany.isPkp ? "PKP" : "Non-PKP"} index="03" tone="forest" />
      </div>

      <div className="mt-6">
        <SectionRule label="Daftar perusahaan" />
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {memberships.map((membership) => {
            const active = membership.companyId === activeCompany.companyId;
            return (
              <PaperCard key={membership.companyId} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold text-ink">{membership.companyName}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      {ROLE_LABELS[membership.role]} · {membership.isPkp ? "PKP" : "Non-PKP"}
                    </p>
                  </div>
                  {active ? <Stamp tone="forest">Aktif</Stamp> : null}
                </div>
                <dl className="mt-3 space-y-1 text-xs text-ink-soft">
                  <div className="flex justify-between gap-2"><dt>NPWP</dt><dd className="font-mono">{membership.npwp ?? "—"}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Kota</dt><dd>{membership.city ?? "—"}</dd></div>
                </dl>
                <div className="mt-auto flex items-center gap-2 pt-4">
                  <SwitchCompanyButton companyId={membership.companyId} active={active} />
                  {active && membership.role === "ADMIN" ? (
                    <ActionLink href="/settings/company" variant="ghost" size="sm">Pengaturan</ActionLink>
                  ) : null}
                </div>
              </PaperCard>
            );
          })}
        </div>
      </div>

      <PaperCard className="mt-4 p-4 text-xs text-ink-soft">
        <p>
          Ingin menambah rekan kerja? Buka perusahaan aktif lalu buka{" "}
          <Link href="/settings/team" className="text-forest underline underline-offset-4">Tim</Link>. Hanya admin yang
          dapat mengundang anggota atau mengganti peran.
        </p>
        {actor.role === "VIEWER" ? (
          <p className="mt-2 text-ink-faint">Sebagai pengamat Anda dapat membuat perusahaan baru dan otomatis menjadi admin di sana.</p>
        ) : null}
      </PaperCard>
    </>
  );
}
