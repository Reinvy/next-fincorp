'use client';

import Link from 'next/link';
import type { AlertItem } from '@/data/types';

interface AlertProps {
  data: AlertItem;
  onDismiss?: () => void;
}

export default function Alert({ data, onDismiss }: AlertProps) {
  const config = {
    warning: {
      bg: 'bg-warning-deadline/5 border-warning-deadline/20',
      leftBar: 'bg-warning-deadline',
      icon: 'warning',
      iconColor: 'text-warning-deadline',
      textColor: 'text-on-surface',
    },
    error: {
      bg: 'bg-error-container/15 border-error-container/40',
      leftBar: 'bg-error',
      icon: 'error',
      iconColor: 'text-error',
      textColor: 'text-on-surface',
    },
    info: {
      bg: 'bg-secondary/5 border-secondary/15',
      leftBar: 'bg-secondary',
      icon: 'info',
      iconColor: 'text-secondary',
      textColor: 'text-on-surface',
    },
  };

  const style = config[data.type] || config.info;

  return (
    <div className={`${style.bg} border rounded-2xl p-4 flex items-start gap-4 shadow-sm relative overflow-hidden pl-5 animate-slide-up`}>
      {/* Vertical left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.leftBar}`}></div>

      <span className={`material-symbols-outlined fill ${style.iconColor} text-[20px] mt-0.5`}>
        {style.icon}
      </span>
      <div className="flex-1">
        <h4 className={`font-label-md text-[12.5px] ${style.textColor} font-semibold`}>{data.title}</h4>
        <p className={`font-body-sm opacity-80 mt-0.5 ${style.textColor}`}>{data.message}</p>
      </div>
      {data.link && (
        <Link
          href={data.link}
          className="text-secondary font-label-md text-[11px] hover:underline shrink-0 mr-1 mt-0.5"
        >
          Lihat Detail →
        </Link>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container/40 p-1 rounded-full transition-all shrink-0 mt-0.5"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}