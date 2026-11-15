import { requireActorPage } from "@/lib/access";
import { AppShell } from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships, activeCompany } = await requireActorPage();

  return (
    <AppShell
      user={{ name: user.name, email: user.email }}
      memberships={memberships.map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.companyName,
        role: membership.role,
      }))}
      activeCompanyId={activeCompany.companyId}
      notificationCount={0}
    >
      {children}
    </AppShell>
  );
}
