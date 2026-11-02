import type { ReactNode } from 'react';
import { AlertTriangle, CircleDot, Clock, Loader, UserX } from 'lucide-react';
import { useAdminStats } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/Skeleton';
import { AGE_DANGER_HOURS, AGE_WARNING_HOURS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { formatAge, formatDateTime, hoursSince } from '@/lib/format';
import type { QueueFilterState } from './useQueueFilters';

interface Tile {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: 'neutral' | 'red' | 'amber';
  title?: string;
  filter: Partial<QueueFilterState>;
  clear: Partial<QueueFilterState>;
}

const toneClasses = {
  neutral: 'border-slate-200 bg-white',
  amber: 'border-amber-200 bg-amber-50',
  red: 'border-red-200 bg-red-50',
};

interface StatsStripProps {
  state: QueueFilterState;
  onFilter: (patch: Partial<QueueFilterState>) => void;
}

function isFilterOn(state: QueueFilterState, filter: Partial<QueueFilterState>) {
  return (Object.keys(filter) as Array<keyof QueueFilterState>).every((key) => state[key] === filter[key]);
}

export function StatsStrip({ state, onFilter }: StatsStripProps) {
  const { data: stats, isPending, isError } = useAdminStats();

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="status" aria-label="Loading stats">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[74px]" />
        ))}
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-slate-500">Queue stats are unavailable right now.</p>;
  }

  const oldestHours = hoursSince(stats.oldestOpenAt);
  const tiles: Tile[] = [
    { label: 'Open', value: stats.open, icon: <CircleDot className="h-4 w-4" />, tone: 'neutral', filter: { status: 'Open' }, clear: { status: '' } },
    { label: 'In progress', value: stats.inProgress, icon: <Loader className="h-4 w-4" />, tone: 'neutral', filter: { status: 'In Progress' }, clear: { status: '' } },
    {
      label: 'Critical',
      value: stats.critical,
      icon: <AlertTriangle className="h-4 w-4" />,
      tone: stats.critical > 0 ? 'red' : 'neutral',
      filter: { priority: 'Critical' },
      clear: { priority: '' },
    },
    {
      label: 'Unassigned',
      value: stats.unassigned,
      icon: <UserX className="h-4 w-4" />,
      tone: stats.unassigned > 0 ? 'amber' : 'neutral',
      filter: { assignedTo: 'unassigned' },
      clear: { assignedTo: '' },
    },
    {
      label: 'Oldest open',
      value: stats.oldestOpenAt ? formatAge(stats.oldestOpenAt) : 'None',
      icon: <Clock className="h-4 w-4" />,
      tone: oldestHours >= AGE_DANGER_HOURS ? 'red' : oldestHours >= AGE_WARNING_HOURS ? 'amber' : 'neutral',
      title: stats.oldestOpenAt ? `Opened ${formatDateTime(stats.oldestOpenAt)}` : undefined,
      filter: { sort: 'oldest' },
      clear: { sort: 'urgency' },
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => {
        const on = isFilterOn(state, tile.filter);
        return (
          <button
            key={tile.label}
            type="button"
            aria-pressed={on}
            title={tile.title ?? `${on ? 'Remove filter' : 'Filter queue'}: ${tile.label}`}
            onClick={() => onFilter(on ? tile.clear : tile.filter)}
            className={cn(
              'rounded-lg border p-3 text-left shadow-sm transition hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600',
              toneClasses[tile.tone],
              on && 'ring-2 ring-brand-500',
            )}
          >
            <span
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide',
                tile.tone === 'red' ? 'text-red-700' : tile.tone === 'amber' ? 'text-amber-700' : 'text-slate-500',
              )}
            >
              <span aria-hidden>{tile.icon}</span>
              {tile.label}
            </span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums text-slate-900">{tile.value}</span>
          </button>
        );
      })}
    </div>
  );
}
