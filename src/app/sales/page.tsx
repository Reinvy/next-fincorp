'use client';

import { Layout } from '@/components/layout';
import { PageHeader, Button, StatusBadge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';
import Link from 'next/link';

export default function SalesPage() {
  const { salesInvoices } = useApp();
  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Sales"
          description="Kelola faktur penjualan dan piutang pelanggan Anda."
          actions={
            <Link href="/sales/invoice">
              <Button icon="add">Buat Faktur Baru</Button>
            </Link>
          }
        />

        {/* Recent Invoices Table */}
        <div className="glass-card rounded-2xl flex flex-col hover:border-secondary-container/30 transition-colors duration-300 overflow-hidden shadow-sm animate-slide-up">
          <div className="p-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/20">
            <h3 className="font-label-md text-label-md text-primary font-bold tracking-wider">Faktur Penjualan Terbaru</h3>
            <Link href="/sales/invoice" className="text-secondary hover:text-primary transition-colors font-label-md text-label-md">
              Lihat Semua →
            </Link>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-muted/30 border-b border-border-subtle/50 font-label-md text-[10.5px] text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">No. Faktur</th>
                  <th className="py-3 px-4 font-semibold">Tanggal</th>
                  <th className="py-3 px-4 font-semibold">Pelanggan</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Faktur Pajak</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-border-subtle/30">
                {salesInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-container-low/40 transition-colors h-[40px]">
                    <td className="py-2 px-4 text-secondary font-semibold hover:underline cursor-pointer">{inv.invoiceNumber}</td>
                    <td className="py-2 px-4 font-tabular-nums text-on-surface-variant">{inv.date}</td>
                    <td className="py-2 px-4 font-medium text-on-surface">{inv.customerName}</td>
                    <td className="py-2 px-4 text-right font-tabular-nums font-semibold text-primary">{formatCurrency(inv.grandTotal).replace('Rp ', '')}</td>
                    <td className="py-2 px-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-2 px-4 text-center">
                      {inv.hasTaxInvoice ? (
                        <span className="inline-flex items-center gap-1 bg-success-positive/10 border border-success-positive/20 px-2 py-0.5 rounded text-[10.5px] font-tabular-nums text-success-positive font-semibold">
                          {inv.taxInvoiceNumber}
                        </span>
                      ) : (
                        <span className="text-outline text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}