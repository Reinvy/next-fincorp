'use client';

import { ToastItem } from '@/context/AppContext';

interface ToastProps {
  toast: ToastItem;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const configs = {
    success: {
      border: 'border-success-positive/30',
      bg: 'bg-surface/90 dark:bg-surface-muted/90',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-success-positive shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M8.5 12.5L11 15L16 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      glow: 'shadow-[0_8px_30px_rgba(74,222,128,0.15)]',
      textColor: 'text-success-positive',
      defaultTitle: 'Berhasil',
    },
    error: {
      border: 'border-error/30',
      bg: 'bg-surface/90 dark:bg-surface-muted/90',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-error shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      glow: 'shadow-[0_8px_30px_rgba(239,68,68,0.15)]',
      textColor: 'text-error',
      defaultTitle: 'Kesalahan',
    },
    warning: {
      border: 'border-warning-deadline/30',
      bg: 'bg-surface/90 dark:bg-surface-muted/90',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-warning-deadline shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 22H22L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 9V14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="18" r="1" fill="currentColor" />
        </svg>
      ),
      glow: 'shadow-[0_8px_30px_rgba(245,158,11,0.15)]',
      textColor: 'text-warning-deadline',
      defaultTitle: 'Peringatan',
    },
    info: {
      border: 'border-secondary/30',
      bg: 'bg-surface/90 dark:bg-surface-muted/90',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-secondary shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
      glow: 'shadow-[0_8px_30px_rgba(59,130,246,0.15)]',
      textColor: 'text-secondary',
      defaultTitle: 'Informasi',
    },
  };

  const style = configs[toast.type] || configs.info;
  const title = toast.title || style.defaultTitle;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-2xl border ${style.border} ${style.bg} ${style.glow}
        backdrop-blur-md transition-all duration-300 w-80 pointer-events-auto
        animate-slide-up relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md
      `}
      role="alert"
    >
      {/* Glow vertical line inside toast */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        toast.type === 'success' ? 'bg-success-positive' :
        toast.type === 'error' ? 'bg-error' :
        toast.type === 'warning' ? 'bg-warning-deadline' : 'bg-secondary'
      }`} />

      {style.icon}

      <div className="flex-1 min-w-0 pr-1">
        <h5 className={`text-xs font-bold ${style.textColor} uppercase tracking-wider leading-none mb-1`}>
          {title}
        </h5>
        <p className="text-[12px] font-medium text-on-surface-variant leading-relaxed">
          {toast.message}
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container/60 p-1 rounded-full transition-all shrink-0 -mt-1 -mr-1 cursor-pointer"
        aria-label="Close"
      >
        <span className="material-symbols-outlined text-[16px] block">close</span>
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[99] flex flex-col gap-3 pointer-events-none max-w-full w-80 max-sm:bottom-4 max-sm:left-4 max-sm:right-4 max-sm:top-auto max-sm:mx-auto">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}
