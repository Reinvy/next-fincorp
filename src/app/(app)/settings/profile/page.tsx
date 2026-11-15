import { requireActorPage } from "@/lib/access";
import { PageHeader } from "@/components/ui/paper";
import { ProfileForms } from "@/components/forms/ProfileForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil" };

export default async function ProfileSettingsPage() {
  const { user, activeCompany } = await requireActorPage();
  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Profil & Kata Sandi"
        description="Perbarui nama tampilan atau ganti kata sandi. Mengganti kata sandi mengeluarkan sesi lain."
      />
      <ProfileForms name={user.name} email={user.email} />
    </>
  );
}
