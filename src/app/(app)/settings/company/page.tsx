import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { D } from "@/lib/money";
import { PageHeader } from "@/components/ui/paper";
import { CompanySettingsForm } from "@/components/forms/CompanySettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan Perusahaan" };

export default async function CompanySettingsPage() {
  const { actor, activeCompany } = await requireActorPage();
  const company = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: {
      name: true,
      npwp: true,
      nib: true,
      pkpNumber: true,
      kpp: true,
      address: true,
      city: true,
      province: true,
      postalCode: true,
      email: true,
      phone: true,
      isPkp: true,
      ppnRate: true,
      fiscalYearStartMonth: true,
      logoDataUrl: true,
    },
  });
  if (!company) return null;
  const canEdit = actor.role === "ADMIN";

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Pengaturan Perusahaan"
        description="Identitas pada kop cetak, status PKP, tarif PPN, dan awal tahun buku."
      />
      <CompanySettingsForm
        company={{
          ...company,
          ppnRate: D(company.ppnRate).toFixed(2),
        }}
        canEdit={canEdit}
      />
    </>
  );
}
