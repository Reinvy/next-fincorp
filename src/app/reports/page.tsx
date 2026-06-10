'use client';

import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { reportCategories } from '@/data';

export default function ReportsListPage() {
  const getCategoryGradient = (color: string) => {
    switch (color) {
      case 'primary': // financial
        return 'bg-gradient-to-br from-indigo-500/5 via-white/70 to-transparent dark:from-indigo-500/15 dark:to-transparent';
      case 'secondary': // operational
        return 'bg-gradient-to-br from-teal-500/5 via-white/70 to-transparent dark:from-teal-500/15 dark:to-transparent';
      case 'danger': // tax
        return 'bg-gradient-to-br from-amber-500/5 via-white/70 to-transparent dark:from-amber-500/15 dark:to-transparent';
      default:
        return 'bg-surface-muted/30';
    }
  };

  const getIconContainerStyle = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30';
      case 'secondary':
        return 'bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-100 dark:border-teal-500/30';
      case 'danger':
        return 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-100 dark:border-amber-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up">
        {/* Page Header */}
        <PageHeader
          title="Daftar Laporan"
          description="Akses dan kelola seluruh laporan keuangan, operasional, dan perpajakan Anda dalam satu pusat kendali."
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                icon="filter_list"
                className="hover:bg-primary/5 transition-all"
              >
                Filter Laporan
              </Button>
              <Button 
                icon="calendar_today"
                className="bg-gradient-secondary-premium hover:shadow-lg hover:shadow-secondary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                Periode: Okt 2023
              </Button>
            </div>
          }
        />

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCategories.map((category) => (
            <div
              key={category.id}
              className="glass-card rounded-2xl overflow-hidden flex flex-col h-full shadow-sm hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 border border-border-subtle/50"
            >
              {/* Category Header */}
              <div className={`p-6 border-b border-border-subtle/50 flex items-start gap-4 ${getCategoryGradient(category.color)}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${getIconContainerStyle(category.color)}`}>
                  <span className="material-symbols-outlined font-bold text-[24px]">
                    {category.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-1">{category.name}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px] leading-relaxed">
                    {category.id === 'financial' && 'Ringkasan performa finansial dan posisi kas perusahaan secara menyeluruh.'}
                    {category.id === 'operational' && 'Analisis transaksi komersial, umur piutang, dan histori vendor.'}
                    {category.id === 'tax' && 'Ekspor data sesuai standar e-Faktur dan pelaporan DJP.'}
                  </p>
                </div>
              </div>

              {/* Report Items */}
              <div className="p-0 flex-1 flex flex-col divide-y divide-border-subtle/30">
                {category.reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 hover:bg-primary/[0.02] dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group"
                  >
                    <div className="pr-4 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 
                          onClick={() => {
                            if (report.id === 'laba-rugi') {
                              window.location.href = '/reports/laba-rugi';
                            }
                          }}
                          className={`font-tabular-nums text-tabular-nums text-primary dark:text-secondary-container font-semibold transition-all ${
                            report.id === 'laba-rugi' 
                              ? 'cursor-pointer hover:text-secondary hover:underline' 
                              : ''
                          }`}
                        >
                          {report.name}
                        </h4>
                        {report.isPremium && (
                          <span className="px-2 py-0.5 bg-secondary/10 text-secondary dark:text-secondary-container text-[9px] rounded-full uppercase font-bold tracking-wider">Premium</span>
                        )}
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">{report.description}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          if (report.id === 'laba-rugi') {
                            window.location.href = '/reports/laba-rugi';
                          } else {
                            alert(`Membuka laporan: ${report.name}`);
                          }
                        }}
                        className="w-8 h-8 rounded-lg border border-border-subtle/70 bg-white/80 dark:bg-black/35 flex items-center justify-center text-primary dark:text-secondary-container hover:bg-primary/10 dark:hover:bg-white/10 hover:shadow-sm cursor-pointer transition-all" 
                        title="Lihat"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                      </button>
                      <button 
                        onClick={() => alert(`Mengunduh PDF: ${report.name}`)}
                        className="w-8 h-8 rounded-lg bg-gradient-secondary-premium text-white flex items-center justify-center hover:shadow-lg hover:shadow-secondary/20 cursor-pointer transition-all" 
                        title="Unduh PDF"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}