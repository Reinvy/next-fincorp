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
        <div className="bg-surface border border-border-subtle rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface-muted">
            <h3 className="font-label-md text-label-md text-on-surface">Faktur Penjualan Terbaru</h3>
            <Link href="/sales/invoice" className="text-secondary hover:text-primary transition-colors font-label-md text-label-md">
              Lihat Semua →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted border-b border-border-subtle font-label-md text-label-md text-on-surface-variant">
                  <th className="py-3 px-4 font-medium">No. Faktur</th>
                  <th className="py-3 px-4 font-medium">Tanggal</th>
                  <th className="py-3 px-4 font-medium">Pelanggan</th>
                  <th className="py-3 px-4 font-medium text-right">Total</th>
                  <th className="py-3 px-4 font-medium text-center">Status</th>
                  <th className="py-3 px-4 font-medium text-center">Faktur Pajak</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-border-subtle">
                {salesInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-muted transition-colors h-[40px]">
                    <td className="py-2 px-4 text-secondary font-medium">{inv.invoiceNumber}</td>
                    <td className="py-2 px-4">{inv.date}</td>
                    <td className="py-2 px-4">{inv.customerName}</td>
                    <td className="py-2 px-4 text-right font-tabular-nums">{formatCurrency(inv.grandTotal)}</td>
                    <td className="py-2 px-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-2 px-4 text-center">
                      {inv.hasTaxInvoice ? (
                        <span className="text-success-positive text-xs">{inv.taxInvoiceNumber}</span>
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