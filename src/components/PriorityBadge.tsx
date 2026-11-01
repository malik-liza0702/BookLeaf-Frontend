import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { TicketPriority } from '@/api/types';
import { Badge, type BadgeTone } from './ui/Badge';

const priorityTones: Record<TicketPriority, BadgeTone> = {
  Critical: 'red',
  High: 'orange',
  Medium: 'amber',
  Low: 'neutral',
};

const icons: Record<TicketPriority, JSX.Element> = {
  Critical: <AlertTriangle className="h-3 w-3" aria-hidden />,
  High: <ArrowUp className="h-3 w-3" aria-hidden />,
  Medium: <Minus className="h-3 w-3" aria-hidden />,
  Low: <ArrowDown className="h-3 w-3" aria-hidden />,
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge tone={priorityTones[priority] ?? 'neutral'} icon={icons[priority]}>
      {priority}
    </Badge>
  );
}
