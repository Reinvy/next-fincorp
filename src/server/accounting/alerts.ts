import { prisma } from "@/lib/prisma";
import { dateFromISO, todayISO } from "@/lib/dates";
import { getDeadlines } from "@/server/accounting/deadlines";
import type { Actor } from "@/lib/types";

export interface AlertItem {
  key: string;
  title: string;
  description: string;
  tone: "danger" | "warning";
  href: string;
}

export async function getAlerts(actor: Actor, userId: string): Promise<AlertItem[]> {
  const month = todayISO().slice(0, 7);
  const today = dateFromISO(todayISO());
  const [deadlines, dismissals, overdueSales, overduePurchases] = await Promise.all([
    getDeadlines(actor, month),
    prisma.alertDismissal.findMany({
      where: { companyId: actor.companyId, userId },
      select: { alertKey: true },
    }),
    prisma.salesInvoice.findMany({
      where: { companyId: actor.companyId, status: { in: ["UNPAID", "PARTIAL"] }, dueDate: { lt: today } },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId: actor.companyId, status: { in: ["UNPAID", "PARTIAL"] }, dueDate: { lt: today } },
      include: { vendor: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
  ]);
  const dismissed = new Set(dismissals.map((row) => row.alertKey));
  const alerts: AlertItem[] = [];

  for (const invoice of overdueSales) {
    const key = `invoice-overdue:${invoice.id}`;
    if (dismissed.has(key)) continue;
    alerts.push({
      key,
      title: `Piutang ${invoice.number} lewat jatuh tempo`,
      description: `${invoice.customer.name} · jatuh tempo ${invoice.dueDate.toISOString().slice(0, 10)}`,
      tone: "danger",
      href: `/sales/${invoice.id}`,
    });
  }
  for (const invoice of overduePurchases) {
    const key = `invoice-overdue:${invoice.id}`;
    if (dismissed.has(key)) continue;
    alerts.push({
      key,
      title: `Utang ${invoice.number} lewat jatuh tempo`,
      description: `${invoice.vendor.name} · jatuh tempo ${invoice.dueDate.toISOString().slice(0, 10)}`,
      tone: "danger",
      href: `/purchases/${invoice.id}`,
    });
  }
  for (const deadline of deadlines) {
    if (deadline.status !== "overdue" && deadline.status !== "soon") continue;
    if (deadline.category === "TAX") {
      const key = `tax-due:${deadline.id.replace(/^tax-due-/, "")}`;
      if (dismissed.has(key)) continue;
      alerts.push({
        key,
        title: deadline.title,
        description: `Jatuh tempo ${deadline.dueDate}`,
        tone: deadline.status === "overdue" ? "danger" : "warning",
        href: deadline.href ?? "/tax",
      });
    }
    if (deadline.category === "CLOSING") {
      const key = `period-close:${deadline.id.replace(/^period-close-/, "")}`;
      if (dismissed.has(key)) continue;
      alerts.push({
        key,
        title: deadline.title,
        description: `Batas internal ${deadline.dueDate}`,
        tone: deadline.status === "overdue" ? "danger" : "warning",
        href: "/accounting/closing",
      });
    }
  }

  const weight = (key: string): number => {
    if (key.startsWith("period-close:")) return 0;
    if (key.startsWith("tax-due:")) return 1;
    return 2;
  };
  return alerts.sort((a, b) => weight(a.key) - weight(b.key)).slice(0, 8);
}

export async function countAlerts(actor: Actor, userId: string): Promise<number> {
  return (await getAlerts(actor, userId)).length;
}

export async function dismissAlert(actor: Actor, userId: string, alertKey: string): Promise<void> {
  await prisma.alertDismissal.upsert({
    where: { companyId_userId_alertKey: { companyId: actor.companyId, userId, alertKey } },
    create: { companyId: actor.companyId, userId, alertKey },
    update: { dismissedAt: new Date() },
  });
}
