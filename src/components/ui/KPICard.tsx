'use client';

import Link from 'next/link';
import type { KPICard as KPICardType } from '@/data/types';

interface KPICardProps {
  data: KPICardType;
}

export default function KPICard({ data }: KPICardProps) {
  const colorClasses = {
    default: 'bg-surface-container-low',
    success: 'bg-success-positive/10',
    danger: 'bg-danger-liability/10',
    warning: 'bg-warning-deadline/10',
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
    <div className="bg-surface-container-lowest rounded-xl p-5 border border-border-subtle shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between group hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[data.color]} flex items-center justify-center`}>
          <span className={`material-symbols-outlined ${iconColorClasses[data.color]}`}>
            {data.icon}
          </span>
        </div>
        {data.changePercent !== 0 && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-md text-label-md ${changeColorClasses[data.changeDirection]}`}>
            <span className="material-symbols-outlined text-[14px]">{getChangeIcon()}</span>
            {Math.abs(data.changePercent).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Content */}
      <div>
        <p className="font-label-md text-label-md text-on-surface-variant mb-1 uppercase tracking-wider">
          {data.title}
        </p>
        <h3 className="font-headline-md text-headline-md font-tabular-nums text-on-background">
          {data.formattedValue}
        </h3>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border-subtle flex justify-between items-center">
        {data.extraInfo && (
          <span className="text-body-sm text-warning-deadline">{data.extraInfo}</span>
        )}
        {data.link && (
          <Link
            href={data.link}
            className="font-label-md text-label-md text-secondary hover:text-primary transition-colors"
          >
            Lihat Detail →
          </Link>
        )}
      </div>
    </div>
  );
}