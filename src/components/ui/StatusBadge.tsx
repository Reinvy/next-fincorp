'use client';

type StatusType = 'DRAFT' | 'POSTED' | 'PAID' | 'UNPAID' | 'OVERDUE' | 'CANCELLED' | 'APPROVED' | 'PENDING' | 'REJECTED';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: 'bg-surface-variant', text: 'text-on-surface-variant', label: 'DRAFT' },
    POSTED: { bg: 'bg-secondary-fixed/50', text: 'text-secondary', label: 'POSTED' },
    PAID: { bg: 'bg-success-positive/10', text: 'text-success-positive', label: 'LUNAS' },
    UNPAID: { bg: 'bg-warning-deadline/10', text: 'text-warning-deadline', label: 'BELUM BAYAR' },
    OVERDUE: { bg: 'bg-error-container', text: 'text-on-error-container', label: 'LEWAT JATUH TEMPO' },
    CANCELLED: { bg: 'bg-outline-variant', text: 'text-outline', label: 'DIBATALKAN' },
    APPROVED: { bg: 'bg-success-positive/10', text: 'text-success-positive', label: 'APPROVED' },
    PENDING: { bg: 'bg-warning-deadline/10', text: 'text-warning-deadline', label: 'PENDING' },
    REJECTED: { bg: 'bg-error-container', text: 'text-on-error-container', label: 'REJECTED' },
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-[11px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-bold tracking-wide ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  );
}