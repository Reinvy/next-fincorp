import { requireActorPage } from "@/lib/access";
import { listTeam } from "@/server/companies/team";
import { PageHeader, PaperCard } from "@/components/ui/paper";
import { InviteMemberDialog, TeamMemberRow } from "@/components/forms/TeamDialogs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tim" };

export default async function TeamSettingsPage() {
  const { actor, activeCompany, user } = await requireActorPage();
  if (actor.role !== "ADMIN") {
    return (
      <>
        <PageHeader eyebrow={activeCompany.companyName} title="Tim" />
        <PaperCard className="p-6">
          <p className="text-sm text-ink">Hanya admin yang dapat melihat dan mengelola anggota tim.</p>
        </PaperCard>
      </>
    );
  }
  const members = await listTeam(actor);

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Tim"
        description="Admin mengelola anggota dan peran. Akun dibuat dengan kata sandi sementara yang harus diganti."
        actions={<InviteMemberDialog />}
      />
      <PaperCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 720 }}>
            <caption className="sr-only">Anggota tim</caption>
            <thead>
              <tr>
                <th scope="col">Anggota</th>
                <th scope="col">Peran</th>
                <th scope="col">Bergabung</th>
                <th scope="col" className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <TeamMemberRow key={member.id} member={member} currentUserId={user.id} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-rule px-4 py-2 text-xs text-ink-faint">
          {members.length} anggota. Peran minimum satu admin harus selalu ada.
        </p>
      </PaperCard>
    </>
  );
}
