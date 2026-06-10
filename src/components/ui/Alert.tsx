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
      bg: 'bg-error-container border-error/20',
      icon: 'warning',
      iconColor: 'text-on-error-container',
      textColor: 'text-on-error-container',
    },
    error: {
      bg: 'bg-error-container border-danger-liability/30',
      icon: 'error',
      iconColor: 'text-danger-liability',
      textColor: 'text-danger-liability',
    },
    info: {
      bg: 'bg-surface-container-high border-secondary/20',
      icon: 'info',
      iconColor: 'text-secondary',
      textColor: 'text-on-surface',
    },
  };

  const style = config[data.type] || config.info;

  return (
    <div className={`${style.bg} border rounded-xl p-4 flex items-start gap-3 shadow-sm`}>
      <span className={`material-symbols-outlined fill ${style.iconColor}`}>
        {style.icon}
      </span>
      <div className="flex-1">
        <h4 className={`font-label-md text-label-md ${style.textColor}`}>{data.title}</h4>
        <p className={`font-body-sm opacity-85 mt-0.5 ${style.textColor}`}>{data.message}</p>
      </div>
      {data.link && (
        <Link
          href={data.link}
          className={`${style.textColor} font-label-md text-label-md hover:underline shrink-0 mr-1`}
        >
          Lihat Detail
        </Link>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`${style.textColor} opacity-60 hover:opacity-100 transition-opacity shrink-0`}
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}