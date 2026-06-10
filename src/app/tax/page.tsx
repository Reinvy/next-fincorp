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

  // Calculate relative percentages for comparison chart
  const maxPpn = Math.max(ppnOut, ppnIn, 1);
  const ppnOutPct = (ppnOut / maxPpn) * 100;
  const ppnInPct = (ppnIn / maxPpn) * 100;

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up">
        {/* Page Header */}
        <PageHeader
          title="Modul Pajak (Tax)"
          description="Ringkasan PPN Masukan, PPN Keluaran, dan monitoring kepatuhan SPT Masa perpajakan Indonesia."
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                icon="sync"
                className="hover:bg-primary/5 transition-all"
              >
                Sync e-Faktur
              </Button>
              <Button 
                icon="file_download"
                className="bg-gradient-secondary-premium hover:shadow-lg hover:shadow-secondary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                Export CSV
              </Button>
            </div>
          }
        />

        {/* PPN Summary Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* PPN Keluaran */}
          <div className="glass-card p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-t-4 border-t-secondary min-h-[140px]">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-container/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary">upload</span>
                <span className="font-label-md text-label-md">PPN KELUARAN (OUT)</span>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-surface-container-high/60 text-primary">
                {ppnOutCount} FAKTUR
              </span>
            </div>
            <div className="relative z-10">
              <div className="font-tabular-nums text-headline-sm font-bold text-on-surface">{formatCurrency(ppnOut)}</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">DPP: {formatCurrency(ppnOutDpp)}</div>
            </div>
          </div>

          {/* PPN Masukan */}
          <div className="glass-card p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-t-4 border-t-success-positive min-h-[140px]">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-success-positive/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-success-positive">download</span>
                <span className="font-label-md text-label-md">PPN MASUKAN (IN)</span>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-surface-container-high/60 text-primary">
                {ppnInCount} FAKTUR
              </span>
            </div>
            <div className="relative z-10">
              <div className="font-tabular-nums text-headline-sm font-bold text-on-surface">{formatCurrency(ppnIn)}</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">DPP: {formatCurrency(ppnInDpp)}</div>
            </div>
          </div>

          {/* Diagram Perbandingan PPN (Out vs In) - Glow bar chart */}
          <div className="glass-card p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-t-4 border-t-secondary-container min-h-[140px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '16px' }}>bar_chart</span>
                KOMPARASI PPN
              </span>
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Proporsi</span>
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {/* PPN Out Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-tabular-nums text-on-surface-variant">
                  <span>Out (Keluaran)</span>
                  <span className="font-semibold">{formatCurrency(ppnOut).replace('Rp ', '')}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-black/35 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-secondary-container to-secondary h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(67,93,149,0.3)]" 
                    style={{ width: `${ppnOutPct}%` }}
                  ></div>
                </div>
              </div>
              {/* PPN In Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-tabular-nums text-on-surface-variant">
                  <span>In (Masukan)</span>
                  <span className="font-semibold">{formatCurrency(ppnIn).replace('Rp ', '')}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-black/35 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-success-positive/40 to-success-positive h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(26,93,26,0.3)]" 
                    style={{ width: `${ppnInPct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Kurang Bayar */}
          <div className="glass-card p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-t-4 border-t-danger-liability bg-gradient-to-br from-white/80 via-white/80 to-danger-liability/[0.02] dark:from-primary-container/20 dark:to-danger-liability/[0.02] min-h-[140px]">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-danger-liability/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2 text-danger-liability">
                <span className="material-symbols-outlined">warning</span>
                <span className="font-label-md text-label-md">KURANG BAYAR</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ppnPayable > 0 ? 'bg-error-container text-on-error-container' : 'bg-success-positive/10 text-success-positive'} border border-border-subtle/50`}>
                {ppnPayable > 0 ? 'BELUM LUNAS' : 'NIHIL / LUNAS'}
              </span>
            </div>
            <div className="relative z-10">
              <div className="font-tabular-nums text-headline-md font-bold text-danger-liability">{formatCurrency(ppnPayable)}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="font-body-sm text-body-sm text-on-surface-variant">Jatuh Tempo: 31 Okt 2026</div>
                {ppnPayable > 0 && (
                  <button className="text-secondary font-label-md text-label-md hover:underline font-bold transition-all duration-200">Buat ID Billing</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Data Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area: Daftar Faktur Pajak */}
          <div className="lg:col-span-2 glass-card rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Daftar Faktur Pajak Keluaran</h3>
              <div className="flex gap-2">
                <button className="p-1.5 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors border border-transparent hover:border-border-subtle/50">
                  <span className="material-symbols-outlined text-[20px]">filter_list</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50 border-b border-border-subtle/50 font-label-md text-label-md text-on-surface-variant">
                    <th className="py-2 px-4 whitespace-nowrap font-semibold tracking-wider text-[11px] uppercase">No. Faktur Pajak</th>
                    <th className="py-2 px-4 whitespace-nowrap font-semibold tracking-wider text-[11px] uppercase">Tanggal</th>
                    <th className="py-2 px-4 whitespace-nowrap font-semibold tracking-wider text-[11px] uppercase">Lawan Transaksi</th>
                    <th className="py-2 px-4 text-right whitespace-nowrap font-semibold tracking-wider text-[11px] uppercase">DPP (Rp)</th>
                    <th className="py-2 px-4 text-right whitespace-nowrap font-semibold tracking-wider text-[11px] uppercase">PPN (Rp)</th>
                    <th className="py-2 px-4 text-center whitespace-nowrap font-semibold tracking-wider text-[11px] uppercase">Status Approval</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-on-surface">
                  {ppnOutInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                        Belum ada faktur pajak keluaran yang diterbitkan.
                      </td>
                    </tr>
                  ) : (
                    ppnOutInvoices.map((inv, index) => (
                      <tr key={inv.id} className={`border-b border-border-subtle/30 hover:bg-primary/5 dark:hover:bg-white/5 transition-colors h-[40px] ${index % 2 === 1 ? 'bg-surface-muted/10' : ''}`}>
                        <td className="py-1 px-4 font-tabular-nums text-secondary font-semibold">{inv.taxInvoiceNumber}</td>
                        <td className="py-1 px-4 font-tabular-nums text-on-surface-variant">{inv.date}</td>
                        <td className="py-1 px-4 truncate max-w-[150px] font-medium">{inv.customerName}</td>
                        <td className="py-1 px-4 text-right font-tabular-nums">{formatCurrency(inv.dpp).replace('Rp ', '')}</td>
                        <td className="py-1 px-4 text-right font-tabular-nums font-semibold">{formatCurrency(inv.ppnAmount).replace('Rp ', '')}</td>
                        <td className="py-1 px-4 text-center">
                          <StatusBadge status={inv.status === 'DRAFT' ? 'DRAFT' : inv.status === 'PAID' ? 'POSTED' : 'PENDING'} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-border-subtle/50 bg-surface-muted/30 text-center">
              <span className="text-on-surface-variant font-label-md text-label-md">Menampilkan semua faktur pajak keluaran terdaftar</span>
            </div>
          </div>

          {/* Side Panel: Status SPT & PPh */}
          <div className="flex flex-col gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            {/* Status SPT Masa PPN */}
            <div className="glass-card p-5 rounded-2xl">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-4">Status SPT Masa PPN</h3>
              <div className="relative pl-1">
                {/* Glowing Dashed Vertical Line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-[2px] border-l-2 border-dashed border-secondary/40 dark:border-secondary-container/40"></div>
                {sptTimeline.map((step, idx) => {
                  const isCompleted = step.status === 'completed';
                  const isCurrent = step.status === 'current';
                  
                  return (
                    <div key={step.id} className="flex gap-4 mb-5 relative z-10 group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 relative ${
                        isCompleted
                          ? 'border-2 border-success-positive/50 bg-success-positive/10 text-success-positive shadow-[0_0_8px_rgba(26,93,26,0.15)]'
                          : isCurrent
                          ? 'border-4 border-secondary/40 bg-white dark:bg-primary-container text-secondary font-bold shadow-[0_0_12px_rgba(67,93,149,0.3)]'
                          : 'border-2 border-border-subtle/70 bg-surface-container-lowest text-outline'
                      }`}>
                        {isCompleted ? (
                          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                        ) : (
                          <span className="text-[11px] font-bold text-on-surface-variant/75">{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
                          {step.label}
                          {isCurrent && (
                            <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                          )}
                        </div>
                        {step.completedAt && (
                          <div className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">Selesai ({step.completedAt})</div>
                        )}
                        {step.dueDate && (
                          <div className="font-body-sm text-[12px] text-danger-liability font-semibold mt-0.5">Batas: {step.dueDate}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ringkasan PPh */}
            <div className="glass-card p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">PPh Pot/Put</h3>
                <button className="text-secondary font-label-md text-[10px] hover:underline font-bold">e-Bupot Unifikasi</button>
              </div>
              <div className="space-y-3">
                {pphSummary.map((pph, index) => (
                  <div key={index} className={`flex justify-between items-end ${index < pphSummary.length - 1 ? 'border-b border-border-subtle/30 pb-2.5' : 'pb-1'}`}>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface-variant font-medium">{pph.type}</div>
                      <div className="font-body-sm text-[11px] text-outline mt-0.5">{pph.description}</div>
                    </div>
                    <div className="font-tabular-nums text-body-md font-semibold text-on-surface text-right">
                      {formatCurrency(pph.amount).replace('Rp ', '')}
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