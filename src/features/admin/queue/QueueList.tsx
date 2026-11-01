import { Link, useLocation } from 'react-router-dom';
import { BookOpen, MessageCircle, User } from 'lucide-react';
import type { AdminTicket } from '@/api/types';
import { AgeIndicator } from '@/components/AgeIndicator';
import { ClassificationHint, ClassifyingLabel } from '@/components/ClassificationState';
import { PriorityBadge } from '@/components/PriorityBadge';
import { StatusPill } from '@/components/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { isUnresolved } from '@/lib/tickets';

const GRID = 'xl:grid xl:grid-cols-[96px_minmax(0,1fr)_190px_110px_130px_84px] xl:items-center xl:gap-4';

export function QueueHeader() {
  return (
    <div className={cn('hidden border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500', GRID)}>
      <span>Priority</span>
      <span>Ticket</span>
      <span>Category</span>
      <span>Status</span>
      <span>Assignee</span>
      <span className="text-right">Age</span>
    </div>
  );
}

export function QueueRow({ ticket }: { ticket: AdminTicket }) {
  const location = useLocation();
  const pending = ticket.aiStatus === 'pending';
  const unresolved = isUnresolved(ticket.status);
  const critical = ticket.priority === 'Critical' && !pending && unresolved;
  const responseCount = ticket.responses?.length ?? 0;

  return (
    <li>
      <Link
        to={`/admin/tickets/${ticket.id}`}
        // Remember the filtered queue URL so "Back to queue" restores it.
        state={{ from: location.pathname + location.search }}
        className={cn(
          'block space-y-2 border-l-4 px-4 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none xl:space-y-0',
          GRID,
          critical ? 'border-l-red-500 bg-red-50/40' : 'border-l-transparent',
          !unresolved && 'opacity-75',
        )}
      >
        <div className="flex flex-wrap items-center gap-2 xl:block">
          {pending ? <ClassifyingLabel /> : <PriorityBadge priority={ticket.priority} />}
          {ticket.needsReply && <Badge tone="amber" className="xl:mt-1">Needs reply</Badge>}
          <span className="xl:hidden">
            <StatusPill status={ticket.status} />
          </span>
          <span className="ml-auto xl:hidden">
            <AgeIndicator since={ticket.createdAt} unresolved={unresolved} />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono text-xs text-slate-400">{ticket.ticketNumber}</span>
            <span className="truncate font-medium text-slate-900">{ticket.subject}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" aria-hidden />
              {ticket.authorName}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{ticket.bookTitle ?? ticket.queryType ?? 'General'}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3" aria-hidden />
              {responseCount}
            </span>
            <span>Updated {formatRelative(ticket.updatedAt)}</span>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 text-xs xl:flex-col xl:items-start xl:gap-0.5">
          {pending ? (
            <span className="text-slate-400">Awaiting triage</span>
          ) : (
            <>
              <span className="truncate text-slate-700">{ticket.category}</span>
              <ClassificationHint aiStatus={ticket.aiStatus} />
            </>
          )}
        </div>

        <div className="hidden xl:block">
          <StatusPill status={ticket.status} />
        </div>

        <div className="truncate text-xs">
          {ticket.assignedTo ? (
            <span className="text-slate-700">
              <span className="xl:hidden">Assigned to </span>
              {ticket.assignedTo.name}
            </span>
          ) : (
            <span className="italic text-amber-700">Unassigned</span>
          )}
        </div>

        <div className="hidden text-right xl:block">
          <AgeIndicator since={ticket.createdAt} unresolved={unresolved} />
        </div>
      </Link>
    </li>
  );
}
