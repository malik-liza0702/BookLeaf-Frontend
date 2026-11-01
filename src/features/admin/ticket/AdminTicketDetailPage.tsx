import { Link, useLocation, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BookOpen, Tag, User } from 'lucide-react';
import { isApiError } from '@/api/client';
import type { AdminTicket } from '@/api/types';
import { AgeIndicator } from '@/components/AgeIndicator';
import { ClassifyingLabel } from '@/components/ClassificationState';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PriorityBadge } from '@/components/PriorityBadge';
import { StatusPill } from '@/components/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAdminTicket } from '@/hooks/useTickets';
import { AGE_WARNING_HOURS } from '@/lib/constants';
import { hoursSince } from '@/lib/format';
import { isUnresolved } from '@/lib/tickets';
import { InternalNoteForm } from './InternalNoteForm';
import { ManagementPanel } from './ManagementPanel';
import { ReplyComposer } from './ReplyComposer';
import { RequesterContext } from './RequesterContext';
import { TicketTimeline } from './TicketTimeline';

const QUEUE_PATH = '/admin/tickets';

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" role="status" aria-label="Loading ticket">
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function TicketHeading({ ticket }: { ticket: AdminTicket }) {
  const unresolved = isUnresolved(ticket.status);
  const overdue = unresolved && hoursSince(ticket.createdAt) >= AGE_WARNING_HOURS;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-slate-400">{ticket.ticketNumber}</span>
        <StatusPill status={ticket.status} />
        {ticket.aiStatus === 'pending' ? <ClassifyingLabel /> : <PriorityBadge priority={ticket.priority} />}
        {ticket.aiStatus !== 'pending' && (
          <Badge tone="neutral" icon={<Tag className="h-3 w-3" aria-hidden />}>
            {ticket.category}
          </Badge>
        )}
        {overdue && (
          <Badge tone="red" icon={<AlertTriangle className="h-3 w-3" aria-hidden />} title="Unresolved for more than 48 hours">
            Overdue
          </Badge>
        )}
        <AgeIndicator since={ticket.createdAt} unresolved={unresolved} />
      </div>
      <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900">{ticket.subject}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5" aria-hidden />
          {ticket.authorName}
        </span>
        <span className="inline-flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          {ticket.bookTitle ?? ticket.queryType ?? 'General / Account Level'}
        </span>
        <span>{ticket.assignedTo ? `Assigned to ${ticket.assignedTo.name}` : 'Unassigned'}</span>
      </p>
    </div>
  );
}

/**
 * Admin ticket workspace. The ticket polls (POLL_ADMIN_MS) so new author
 * activity and colleagues' changes appear live. The composer keeps its own
 * local state, so a refetch never touches unsent text.
 */
export function AdminTicketDetailPage() {
  const { ticketId = '' } = useParams();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const fromAuthor = from?.startsWith('/admin/authors') ?? false;
  const backTo = from && (fromAuthor || from.startsWith(QUEUE_PATH)) ? from : QUEUE_PATH;
  const { data: ticket, isPending, isError, error, refetch, isRefetching } = useAdminTicket(ticketId);

  const back = (
    <Link to={backTo} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {fromAuthor ? 'Back to author' : 'Back to queue'}
    </Link>
  );

  if (isPending) {
    return (
      <div>
        {back}
        <DetailSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl">
        {back}
        {isApiError(error) && error.status === 404 ? (
          <EmptyState
            title="Ticket not found"
            description="It may have been removed, or the link is wrong."
            action={<Link to={QUEUE_PATH} className="text-sm font-medium text-brand-700 hover:underline">Go to the queue</Link>}
          />
        ) : (
          <ErrorState error={error} title="Could not load this ticket" onRetry={() => refetch()} retrying={isRefetching} />
        )}
      </div>
    );
  }

  return (
    <div>
      {back}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <TicketHeading ticket={ticket} />
          <RequesterContext ticket={ticket} />
          <TicketTimeline ticket={ticket} />
          {/* Keyed by ticket so switching tickets starts a fresh composer. */}
          <ReplyComposer key={ticket.id} ticket={ticket} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Ticket management">
          {/* Keyed by ticket so unsaved edits never carry over to another ticket. */}
          <ManagementPanel key={ticket.id} ticket={ticket} />
          <InternalNoteForm ticketId={ticket.id} />
        </aside>
      </div>
    </div>
  );
}
