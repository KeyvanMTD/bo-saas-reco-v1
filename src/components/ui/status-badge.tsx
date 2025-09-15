import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'pending';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

const statusVariants = {
  success: 'bg-success-light text-success border-success/20',
  warning: 'bg-warning-light text-warning border-warning/20',
  error: 'bg-error-light text-error border-error/20',
  pending: 'bg-muted text-muted-foreground border-border',
};

const sizeVariants = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

export function StatusBadge({ status, children, size = 'sm' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        statusVariants[status],
        sizeVariants[size]
      )}
    >
      {children}
    </span>
  );
}