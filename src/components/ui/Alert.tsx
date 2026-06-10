'use client';

import Link from 'next/link';
import type { AlertItem } from '@/data/types';

interface AlertProps {
  data: AlertItem;
  onDismiss?: () => void;
}

export default function Alert({ data, onDismiss }: AlertProps) {
  const configs = {
    warning: {
      border: 'border-warning-deadline/20',
      bg: 'bg-warning-deadline/[0.03] dark:bg-warning-deadline/[0.015]',
      leftBar: 'bg-warning-deadline',
      glow: 'shadow-[0_8px_30px_rgba(180,83,9,0.04)]',
      textColor: 'text-warning-deadline',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-warning-deadline shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 22H22L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 9V14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="18" r="1.2" fill="currentColor" />
        </svg>
      ),
    },
    error: {
      border: 'border-error/20',
      bg: 'bg-error/[0.03] dark:bg-error/[0.015]',
      leftBar: 'bg-error',
      glow: 'shadow-[0_8px_30px_rgba(186,26,26,0.04)]',
      textColor: 'text-error',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-error shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    info: {
      border: 'border-secondary/20',
      bg: 'bg-secondary/[0.03] dark:bg-secondary/[0.015]',
      leftBar: 'bg-secondary',
      glow: 'shadow-[0_8px_30px_rgba(67,93,149,0.04)]',
      textColor: 'text-secondary',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-secondary shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
    },
  };

  const style = configs[data.type] || configs.info;

  return (
    <div
      className={`
        relative overflow-hidden pl-6 pr-4 py-4 border rounded-2xl flex items-start gap-3.5
        ${style.border} ${style.bg} ${style.glow} backdrop-blur-md transition-all duration-300
        hover:-translate-y-0.5 hover:shadow-md animate-slide-up w-full
      `}
    >
      {/* Vertical left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.leftBar} shadow-[0_0_8px_currentColor] opacity-90`} />

      {style.icon}

      <div className="flex-1 min-w-0">
        <h4 className={`text-[12.5px] font-bold ${style.textColor} uppercase tracking-wider leading-none mb-1`}>
          {data.title}
        </h4>
        <p className="text-[12.5px] font-medium text-on-surface-variant leading-relaxed">
          {data.message}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 ml-1 mt-0.5">
        {data.link && (
          <Link
            href={data.link}
            className={`
              font-label-md text-[10.5px] font-bold text-secondary hover:underline flex items-center gap-0.5
              transition-all hover:translate-x-0.5 duration-200
            `}
          >
            Lihat Detail <span className="text-[12px] font-normal">&rarr;</span>
          </Link>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container/60 p-1 rounded-full transition-all cursor-pointer"
            aria-label="Tutup"
          >
            <span className="material-symbols-outlined text-[16px] block">close</span>
          </button>
        )}
      </div>
    </div>
  );
}