'use client';

import Link from 'next/link';
import type { KPICard as KPICardType } from '@/data/types';

interface KPICardProps {
  data: KPICardType;
}

export default function KPICard({ data }: KPICardProps) {
  const colorClasses = {
    default: 'bg-surface-container-low text-secondary',
    success: 'bg-success-positive/10 text-success-positive',
    danger: 'bg-danger-liability/10 text-danger-liability',
    warning: 'bg-warning-deadline/10 text-warning-deadline',
  };

  const iconColorClasses = {
    default: 'text-secondary',
    success: 'text-success-positive',
    danger: 'text-danger-liability',
    warning: 'text-warning-deadline',
  };

  const changeColorClasses = {
    up: 'text-success-positive bg-success-positive/10',
    down: 'text-danger-liability bg-danger-liability/10',
  };

  const getChangeIcon = () => {
    if (data.changeDirection === 'up') {
      return data.color === 'danger' ? 'trending_down' : 'trending_up';
    }
    return data.color === 'danger' ? 'trending_up' : 'trending_down';
  };

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between group hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:border-secondary-container/50 transition-all duration-300 relative overflow-hidden animate-slide-up">
      {/* Dynamic bottom accent bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5 ${
        data.color === 'success' ? 'bg-success-positive' :
        data.color === 'danger' ? 'bg-danger-liability' :
        data.color === 'warning' ? 'bg-warning-deadline' : 'bg-secondary'
      }`}></div>

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl ${colorClasses[data.color]} flex items-center justify-center border border-border-subtle/30 shadow-sm`}>
          <span className="material-symbols-outlined">
            {data.icon}
          </span>
        </div>
        {data.changePercent !== 0 && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-md text-[10px] ${changeColorClasses[data.changeDirection]} border border-border-subtle/10`}>
            <span className="material-symbols-outlined text-[12px]">{getChangeIcon()}</span>
            {Math.abs(data.changePercent).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="mb-2">
        <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">
          {data.title}
        </p>
        <h3 className="text-2xl font-bold tracking-tight font-tabular-nums text-primary dark:text-inverse-primary">
          {data.formattedValue}
        </h3>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border-subtle/50 flex justify-between items-center">
        {data.extraInfo && (
          <span className="text-[11px] font-medium text-warning-deadline flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">info</span>
            {data.extraInfo}
          </span>
        )}
        {data.link && (
          <Link
            href={data.link}
            className="font-label-md text-label-md text-secondary hover:text-primary transition-all duration-200 hover:translate-x-0.5"
          >
            Lihat Detail →
          </Link>
        )}
      </div>
    </div>
  );
}