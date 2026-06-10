'use client';

import type { CashFlowData } from '@/data/types';

interface CashFlowChartProps {
  data: CashFlowData[];
  height?: number;
}

export default function CashFlowChart({ data, height = 256 }: CashFlowChartProps) {
  const maxValue = Math.max(...data.map(d => Math.max(d.inflow, d.outflow)));
  const chartHeight = height - 60; // Leave space for labels

  const getBarHeight = (value: number) => {
    return (value / maxValue) * chartHeight;
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center bg-surface-muted/50">
        <h3 className="font-headline-sm text-headline-sm text-on-background">Grafik Arus Kas (Inflow vs Outflow)</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-success-positive/80"></span>
            <span className="text-label-md text-on-surface-variant">Inflow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-danger-liability/80"></span>
            <span className="text-label-md text-on-surface-variant">Outflow</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-5 relative" style={{ height: `${height}px` }}>
        {/* Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pt-10 pb-6 px-4 pointer-events-none opacity-20">
          {[1, 2, 3, 4, 5].map((_, i) => (
            <div key={i} className="border-t border-outline w-full" />
          ))}
        </div>

        {/* Bars */}
        <div className="w-full flex justify-between items-end h-48 px-4">
          {data.map((item, index) => (
            <div key={index} className="flex gap-1 w-full justify-center group relative">
              {/* Inflow Bar */}
              <div
                className="w-4 bg-success-positive/80 rounded-t-sm transition-all hover:opacity-80"
                style={{ height: `${getBarHeight(item.inflow)}px` }}
                title={`Inflow: Rp ${(item.inflow / 1000000000).toFixed(1)}B`}
              />
              {/* Outflow Bar */}
              <div
                className="w-4 bg-danger-liability/80 rounded-t-sm transition-all hover:opacity-80"
                style={{ height: `${getBarHeight(item.outflow)}px` }}
                title={`Outflow: Rp ${(item.outflow / 1000000000).toFixed(1)}B`}
              />
              {/* Month Label */}
              <span className="absolute -bottom-6 text-label-md text-on-surface-variant">
                {item.month}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}