'use client';

import { Layout } from '@/components/layout';
import { PageHeader, Button, StatusBadge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency, pphSummary, sptTimeline } from '@/data';

export default function TaxPage() {
  const { salesInvoices, purchaseInvoices } = useApp();

  // Dynamic calculations
  const ppnOutInvoices = salesInvoices.filter(inv => inv.hasTaxInvoice);
  const ppnOutDpp = ppnOutInvoices.reduce((sum, inv) => sum + inv.dpp, 0);
  const ppnOut = ppnOutInvoices.reduce((sum, inv) => sum + inv.ppnAmount, 0);
  const ppnOutCount = ppnOutInvoices.length;

  const ppnInDpp = purchaseInvoices.reduce((sum, inv) => sum + inv.dpp, 0);
  const ppnIn = purchaseInvoices.reduce((sum, inv) => sum + inv.ppnAmount, 0);
  const ppnInCount = purchaseInvoices.length;

  const ppnPayable = Math.max(0, ppnOut - ppnIn);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Tax Module (Modul Pajak)"
          description="Ringkasan PPN Masukan, PPN Keluaran, dan monitoring kepatuhan SPT Masa perpajakan Indonesia."
          actions={
            <>
              <Button variant="outline" icon="sync">Sync e-Faktur</Button>
              <Button icon="file_download">Export CSV</Button>
            </>
          }
        />

        {/* PPN Summary Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* PPN Keluaran */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary">upload</span>
                <span className="font-label-md text-label-md">PPN KELUARAN (OUT)</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-primary">
                {ppnOutCount} FAKTUR
              </span>
            </div>
            <div>
              <div className="font-tabular-nums text-headline-sm font-bold text-on-surface">{formatCurrency(ppnOut)}</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">DPP: {formatCurrency(ppnOutDpp)}</div>
            </div>
          </div>

          {/* PPN Masukan */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary">download</span>
                <span className="font-label-md text-label-md">PPN MASUKAN (IN)</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-primary">
                {ppnInCount} FAKTUR
              </span>
            </div>
            <div>
              <div className="font-tabular-nums text-headline-sm font-bold text-on-surface">{formatCurrency(ppnIn)}</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">DPP: {formatCurrency(ppnInDpp)}</div>
            </div>
          </div>

          {/* Status Kurang Bayar */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 w-2 h-full bg-danger-liability"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-danger-liability">
                <span className="material-symbols-outlined">warning</span>
                <span className="font-label-md text-label-md">PPN KURANG BAYAR</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ppnPayable > 0 ? 'bg-error-container text-on-error-container' : 'bg-success-positive/10 text-success-positive'} border border-border-subtle`}>
                {ppnPayable > 0 ? 'BELUM LUNAS' : 'NIHIL / LUNAS'}
              </span>
            </div>
            <div>
              <div className="font-tabular-nums text-headline-md font-bold text-danger-liability">{formatCurrency(ppnPayable)}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="font-body-sm text-body-sm text-on-surface-variant">Jatuh Tempo: 31 Oktober 2026</div>
                {ppnPayable > 0 && (
                  <button className="text-secondary font-label-md text-label-md hover:underline">Buat ID Billing</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Data Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area: Daftar Faktur Pajak */}
          <div className="lg:col-span-2 bg-surface-container-lowest border border-border-subtle rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface-muted/50">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Daftar Faktur Pajak Keluaran</h3>
              <div className="flex gap-2">
                <button className="p-1.5 text-on-surface-variant hover:bg-surface-container-low rounded">
                  <span className="material-symbols-outlined text-[20px]">filter_list</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-muted border-b border-border-subtle font-label-md text-label-md text-on-surface-variant">
                    <th className="py-2 px-4 whitespace-nowrap">No. Faktur Pajak</th>
                    <th className="py-2 px-4 whitespace-nowrap">Tanggal</th>
                    <th className="py-2 px-4 whitespace-nowrap">Lawan Transaksi</th>
                    <th className="py-2 px-4 text-right whitespace-nowrap">DPP (Rp)</th>
                    <th className="py-2 px-4 text-right whitespace-nowrap">PPN (Rp)</th>
                    <th className="py-2 px-4 text-center whitespace-nowrap">Status Approval</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface">
                  {ppnOutInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                        Belum ada faktur pajak keluaran yang diterbitkan.
                      </td>
                    </tr>
                  ) : (
                    ppnOutInvoices.map((inv, index) => (
                      <tr key={inv.id} className={`border-b border-border-subtle hover:bg-surface-container-low transition-colors h-[40px] ${index % 2 === 1 ? 'bg-surface-muted/30' : ''}`}>
                        <td className="py-1 px-4 font-tabular-nums text-secondary font-medium">{inv.taxInvoiceNumber}</td>
                        <td className="py-1 px-4 font-tabular-nums">{inv.date}</td>
                        <td className="py-1 px-4 truncate max-w-[150px]">{inv.customerName}</td>
                        <td className="py-1 px-4 text-right font-tabular-nums">{formatCurrency(inv.dpp).replace('Rp ', '')}</td>
                        <td className="py-1 px-4 text-right font-tabular-nums">{formatCurrency(inv.ppnAmount).replace('Rp ', '')}</td>
                        <td className="py-1 px-4 text-center">
                          <StatusBadge status={inv.status === 'DRAFT' ? 'DRAFT' : inv.status === 'PAID' ? 'POSTED' : 'PENDING'} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-border-subtle bg-surface-muted text-center">
              <span className="text-on-surface-variant font-label-md text-label-md">Menampilkan semua faktur pajak keluaran terdaftar</span>
            </div>
          </div>

          {/* Side Panel: Status SPT & PPh */}
          <div className="flex flex-col gap-6">
            {/* Status SPT Masa PPN */}
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-4">Status SPT Masa PPN</h3>
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border-subtle"></div>
                {sptTimeline.map((step) => (
                  <div key={step.id} className="flex gap-4 mb-4 relative z-10">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.status === 'completed'
                        ? 'bg-success-positive text-white'
                        : step.status === 'current'
                        ? 'bg-surface-container-high border-2 border-primary text-primary'
                        : 'bg-surface border border-border-subtle'
                    }`}>
                      {step.status === 'completed' ? (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      ) : step.status === 'current' ? (
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                      ) : null}
                    </div>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface">{step.label}</div>
                      {step.completedAt && (
                        <div className="font-body-sm text-body-sm text-on-surface-variant">Selesai ({step.completedAt})</div>
                      )}
                      {step.dueDate && (
                        <div className="font-body-sm text-body-sm text-danger-liability">Batas: {step.dueDate}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ringkasan PPh */}
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">PPh Pot/Put</h3>
                <button className="text-secondary font-label-md text-[10px] hover:underline">e-Bupot Unifikasi</button>
              </div>
              <div className="space-y-3">
                {pphSummary.map((pph, index) => (
                  <div key={index} className={`flex justify-between items-end ${index < pphSummary.length - 1 ? 'border-b border-border-subtle pb-2' : 'pb-1'}`}>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface-variant">{pph.type}</div>
                      <div className="font-body-sm text-[11px] text-outline">{pph.description}</div>
                    </div>
                    <div className="font-tabular-nums text-body-md font-medium text-on-surface text-right">
                      {formatCurrency(pph.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}