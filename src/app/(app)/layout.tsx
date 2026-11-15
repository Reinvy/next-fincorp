import { requireActorPage } from "@/lib/access";
import { AppShell } from "@/components/layout/AppShell";
import { countAlerts } from "@/server/accounting/alerts";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships, activeCompany, actor } = await requireActorPage();
  const notificationCount = await countAlerts(actor, user.id);

  return (
    <AppShell
      user={{ name: user.name, email: user.email }}
      memberships={memberships.map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.companyName,
        role: membership.role,
      }))}
      activeCompanyId={activeCompany.companyId}
      notificationCount={notificationCount}
    >
      {children}
    </AppShell>
  );
}
