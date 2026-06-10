'use client';

type StatusType = 'DRAFT' | 'POSTED' | 'PAID' | 'UNPAID' | 'OVERDUE' | 'CANCELLED' | 'APPROVED' | 'PENDING' | 'REJECTED';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: 'bg-surface-container-high/60 border-outline-variant/20', text: 'text-on-surface-variant', label: 'DRAFT' },
    POSTED: { bg: 'bg-secondary-container/20 border-secondary-container/40', text: 'text-on-secondary-container', label: 'POSTED' },
    PAID: { bg: 'bg-success-positive/10 border-success-positive/30', text: 'text-success-positive', label: 'LUNAS' },
    UNPAID: { bg: 'bg-warning-deadline/10 border-warning-deadline/30', text: 'text-warning-deadline', label: 'BELUM BAYAR' },
    OVERDUE: { bg: 'bg-error-container/40 border-error-container/90', text: 'text-on-error-container', label: 'LEWAT JATUH TEMPO' },
    CANCELLED: { bg: 'bg-outline-variant/20 border-outline-variant/50', text: 'text-outline', label: 'DIBATALKAN' },
    APPROVED: { bg: 'bg-success-positive/10 border-success-positive/30', text: 'text-success-positive', label: 'APPROVED' },
    PENDING: { bg: 'bg-warning-deadline/10 border-warning-deadline/30', text: 'text-warning-deadline', label: 'PENDING' },
    REJECTED: { bg: 'bg-error-container/40 border-error-container/90', text: 'text-on-error-container', label: 'REJECTED' },
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const sizeClasses = {
    sm: 'text-[9.5px] px-2 py-0.5',
    md: 'text-[10.5px] px-2.5 py-0.5',
    lg: 'text-[11.5px] px-3 py-1',
  };

  const isGlowing = ['PENDING', 'OVERDUE', 'UNPAID'].includes(status);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold tracking-wider border ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      {isGlowing && (
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
          status === 'PENDING' || status === 'UNPAID' ? 'bg-warning-deadline' : 'bg-error'
        }`}></span>
      )}
      {config.label}
    </span>
  );
}