'use client';

import { useApp } from '@/context/AppContext';
import { Layout } from '@/components/layout';
import { KPICard, CashFlowChart, Alert, Button } from '@/components/ui';
import { formatCurrency, cashFlowData } from '@/data';
import Link from 'next/link';

export default function DashboardPage() {
  const {
    salesInvoices,
    purchaseInvoices,
    bankAccounts,
    alerts,
    dismissAlert,
    company
  } = useApp();

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate KPIs dynamically
  const totalCashBalance = bankAccounts.reduce((sum, b) => sum + b.balance, 0);
  
  const totalReceivables = salesInvoices
    .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const totalPayables = purchaseInvoices
    .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const ppnOut = salesInvoices
    .filter(inv => inv.hasTaxInvoice && (inv.status === 'PAID' || inv.status === 'UNPAID' || inv.status === 'OVERDUE'))
    .reduce((sum, inv) => sum + inv.ppnAmount, 0);
  
  const ppnIn = purchaseInvoices
    .reduce((sum, inv) => sum + inv.ppnAmount, 0);

  const ppnPayable = Math.max(0, ppnOut - ppnIn);

  // Dynamic KPI Card structures
  const dynamicKpis = [
    {
      id: 'kpi-cash',
      title: 'Total Kas/Bank',
      value: totalCashBalance,
      formattedValue: formatCurrency(totalCashBalance),
      changePercent: 2.4,
      changeDirection: 'up' as const,
      icon: 'account_balance_wallet',
      color: 'default' as const,
      link: '/cash-bank',
    },
    {
      id: 'kpi-receivable',
      title: 'Piutang Usaha',
      value: totalReceivables,
      formattedValue: formatCurrency(totalReceivables),
      changePercent: 12.1,
      changeDirection: 'up' as const,
      icon: 'arrow_downward',
      color: 'danger' as const,
      extraInfo: 'Termasuk PPN Masukan/Keluaran',
      link: '/sales',
    },
    {
      id: 'kpi-payable',
      title: 'Hutang Usaha',
      value: totalPayables,
      formattedValue: formatCurrency(totalPayables),
      changePercent: 5.2,
      changeDirection: 'down' as const,
      icon: 'arrow_upward',
      color: 'success' as const,
      extraInfo: `Menunggu Pembayaran`,
      link: '/purchases',
    },
    {
      id: 'kpi-ppn',
      title: 'PPN Terutang (Kurang Bayar)',
      value: ppnPayable,
      formattedValue: formatCurrency(ppnPayable),
      changePercent: 0,
      changeDirection: 'up' as const,
      icon: 'receipt',
      color: ppnPayable > 0 ? ('danger' as const) : ('success' as const),
      link: '/tax',
    },
  ];

  // Dynamic Laba Rugi calculations
  const totalRevenue = salesInvoices.reduce((sum, inv) => sum + inv.dpp, 0);
  const totalExpenses = purchaseInvoices.reduce((sum, inv) => sum + inv.dpp, 0);
  const netProfit = totalRevenue - totalExpenses;

  const revenuePercent = totalRevenue > 0 ? 100 : 0;
  const expensePercent = totalRevenue > 0 ? Math.min(100, Math.round((totalExpenses / totalRevenue) * 100)) : 0;

  // Unpaid invoices for aging receivables table
  const unpaidInvoices = salesInvoices
    .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE')
    .slice(0, 5);

  const getAgingBadge = (status: string, dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (status === 'OVERDUE' || diffDays > 30) {
      return (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-error-container text-on-error-container">
          &gt;30 Hari
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-surface-container text-on-surface-variant">
        &lt;30 Hari
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-border-subtle/40">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary dark:text-inverse-primary font-headline-md">
              Selamat Datang, Admin {company.name.split(' ')[0]}
            </h2>
            <p className="font-body-md text-on-surface-variant mt-1">
              Ringkasan posisi keuangan per hari ini, {today}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon="download">
              Ekspor PDF
            </Button>
            <Link href="/sales/invoice">
              <Button icon="add">
                Faktur Baru
              </Button>
            </Link>
          </div>
        </div>

        {/* Alert Section */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} data={alert} onDismiss={() => dismissAlert(alert.id)} />
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {dynamicKpis.map((kpi) => (
            <KPICard key={kpi.id} data={kpi} />
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Charts */}
          <div className="xl:col-span-2 space-y-6">
            {/* Cash Flow Chart */}
            <div className="glass-card rounded-2xl p-5 hover:border-secondary-container/50 transition-all duration-300">
              <CashFlowChart data={cashFlowData} height={280} />
            </div>

            {/* Income Summary */}
            <div className="glass-card rounded-2xl p-5 hover:border-secondary-container/50 transition-all duration-300">
              <h3 className="font-headline-sm text-headline-sm text-on-background mb-4 font-semibold">Laba Rugi (YTD)</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-body-sm mb-1.5 font-medium">
                    <span className="text-on-surface-variant">Pendapatan (DPP)</span>
                    <span className="font-tabular-nums text-on-background font-semibold">{formatCurrency(totalRevenue)}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div className="bg-gradient-success-premium h-full rounded-full shadow-[0_0_8px_rgba(26,93,26,0.3)] transition-all duration-500" style={{ width: `${revenuePercent}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-body-sm mb-1.5 font-medium">
                    <span className="text-on-surface-variant">HPP &amp; Biaya Pembelian</span>
                    <span className="font-tabular-nums text-on-background font-semibold">{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div className="bg-gradient-warning-premium h-full rounded-full shadow-[0_0_8px_rgba(180,83,9,0.3)] transition-all duration-500" style={{ width: `${expensePercent}%` }}></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border-subtle/50 flex justify-between items-center">
                  <span className="font-label-md text-label-md text-on-surface font-bold">Laba Bersih</span>
                  <span className="text-2xl font-bold tracking-tight font-tabular-nums text-secondary">
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tables */}
          <div className="xl:col-span-1 space-y-6">
            {/* Aging Receivables */}
            <div className="glass-card rounded-2xl flex flex-col max-h-[400px] hover:border-secondary-container/50 transition-all duration-300">
              <div className="px-5 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/20 shrink-0">
                <h3 className="font-headline-sm text-headline-sm text-on-background font-semibold">Piutang Jatuh Tempo</h3>
                <button className="text-on-surface-variant/60 hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>
              <div className="overflow-y-auto custom-scrollbar p-0">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-surface/90 backdrop-blur-sm z-10 border-b border-border-subtle/50">
                    <tr>
                      <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider">No. Faktur</th>
                      <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider text-right">Jumlah</th>
                      <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm font-tabular-nums divide-y divide-border-subtle/30">
                    {unpaidInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-on-surface-variant text-body-sm">
                          Tidak ada piutang jatuh tempo.
                        </td>
                      </tr>
                    ) : (
                      unpaidInvoices.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-surface-container-low/40 transition-colors cursor-pointer group h-[40px]"
                        >
                          <td className="py-1 px-4 text-on-background whitespace-nowrap">
                            <div className="font-semibold text-secondary hover:underline">{item.invoiceNumber}</div>
                            <div className="text-[11px] text-on-surface-variant truncate max-w-[120px]">{item.customerName}</div>
                          </td>
                          <td className="py-1 px-4 text-right text-danger-liability font-bold">{formatCurrency(item.grandTotal)}</td>
                          <td className="py-1 px-4 text-center">
                            {getAgingBadge(item.status, item.dueDate)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-border-subtle/50 mt-auto bg-surface-muted/10 shrink-0">
                <Link
                  href="/sales"
                  className="font-label-md text-label-md text-secondary hover:text-primary transition-colors text-center block w-full hover:-translate-y-0.5 duration-200"
                >
                  Lihat Semua Penjualan
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}