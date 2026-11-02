import { Clock } from 'lucide-react';
import { AGE_DANGER_HOURS, AGE_WARNING_HOURS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative, hoursSince } from '@/lib/format';

export function AgeIndicator({ since, unresolved }: { since: string; unresolved: boolean }) {
  const hours = hoursSince(since);
  const level = !unresolved ? 'none' : hours >= AGE_DANGER_HOURS ? 'danger' : hours >= AGE_WARNING_HOURS ? 'warning' : 'none';
  return (
    <span
      title={`Created ${formatDateTime(since)}`}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap text-xs tabular-nums',
        level === 'danger' && 'font-semibold text-red-600',
        level === 'warning' && 'font-medium text-amber-600',
        level === 'none' && 'text-slate-500',
      )}
    >
      <Clock className="h-3 w-3" aria-hidden />
      {formatRelative(since)}
      {level !== 'none' && <span className="sr-only">(overdue)</span>}
    </span>
  );
}
