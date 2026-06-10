'use client';

import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { reportCategories } from '@/data';

export default function ReportsListPage() {
  const getCategoryColor = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-primary-fixed';
      case 'secondary':
        return 'bg-secondary-fixed';
      case 'danger':
        return 'bg-error-container/40';
      default:
        return 'bg-surface-container';
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'primary':
        return 'text-on-primary-fixed';
      case 'secondary':
        return 'text-on-secondary-fixed';
      case 'danger':
        return 'text-danger-liability';
      default:
        return 'text-primary';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Daftar Laporan"
          description="Akses dan kelola seluruh laporan keuangan, operasional, dan perpajakan Anda dalam satu pusat kendali."
          actions={
            <>
              <Button variant="outline" icon="filter_list">Filter Laporan</Button>
              <Button icon="calendar_today">Periode: Okt 2023</Button>
            </>
          }
        />

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCategories.map((category) => (
            <div
              key={category.id}
              className="bg-surface-container-lowest border border-border-subtle rounded-xl overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Category Header */}
              <div className={`p-6 border-b border-border-subtle flex items-start gap-4 ${getCategoryColor(category.color)}`}>
                <div className={`w-12 h-12 rounded flex items-center justify-center shrink-0 ${category.color === 'danger' ? 'bg-surface-container-lowest border border-border-subtle' : ''}`}>
                  <span className={`material-symbols-outlined ${getIconColor(category.color)}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {category.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-1">{category.name}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {category.id === 'financial' && 'Ringkasan performa finansial dan posisi kas perusahaan secara menyeluruh.'}
                    {category.id === 'operational' && 'Analisis transaksi komersial, umur piutang, dan histori vendor.'}
                    {category.id === 'tax' && 'Ekspor data sesuai standar e-Faktur dan pelaporan DJP.'}
                  </p>
                </div>
              </div>

              {/* Report Items */}
              <div className="p-0 flex-1 flex flex-col">
                {category.reports.map((report, index) => (
                  <div
                    key={report.id}
                    className={`p-4 hover:bg-surface-muted transition-colors flex items-center justify-between group ${index < category.reports.length - 1 ? 'border-b border-border-subtle' : ''}`}
                  >
                    <div className="pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-tabular-nums text-tabular-nums text-primary">{report.name}</h4>
                        {report.isPremium && (
                          <span className="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[10px] rounded uppercase font-bold tracking-wider">Premium</span>
                        )}
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">{report.description}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-8 h-8 rounded border border-border-subtle bg-surface flex items-center justify-center text-primary hover:bg-surface-variant" title="Lihat">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                      </button>
                      <button className="w-8 h-8 rounded bg-secondary text-on-secondary flex items-center justify-center hover:bg-secondary/90" title="Unduh PDF">
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