import type { TicketStatus } from '@/api/types';
import { Badge, type BadgeTone } from './ui/Badge';

const statusTones: Record<TicketStatus, BadgeTone> = {
  Open: 'blue',
  'In Progress': 'purple',
  Resolved: 'green',
  Closed: 'neutral',
};

export function StatusPill({ status }: { status: TicketStatus }) {
  return (
    <Badge tone={statusTones[status] ?? 'neutral'}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </Badge>
  );
}

