import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronRight, MessageCircle, PlusCircle } from 'lucide-react';
import type { AuthorTicket } from '@/api/types';
import { useMyTickets } from '@/hooks/useTickets';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { StatusPill } from '@/components/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkeletonList } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative, pluralize } from '@/lib/format';
import { hasUnseenReplies } from '@/lib/seenReplies';
import { isUnresolved, supportReplyCount } from '@/lib/tickets';

type StatusFilter = 'all' | 'open' | 'resolved';

const STATUS_FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
];

/** "Open" covers Open and In Progress; "Resolved" covers Resolved and Closed. */
function matchesFilter(ticket: AuthorTicket, filter: StatusFilter) {
  if (filter === 'all') return true;
  return isUnresolved(ticket.status) === (filter === 'open');
}

const newQueryLink = (
  <Link
    to="/author/tickets/new"
    className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
  >
    <PlusCircle className="h-4 w-4" aria-hidden />
    Raise a query
  </Link>
);

function TicketRow({ ticket }: { ticket: AuthorTicket }) {
  const responseCount = supportReplyCount(ticket);
  const unseen = hasUnseenReplies(ticket.id, responseCount);

  return (
    <li>
      <Link
        to={`/author/tickets/${ticket.id}`}
        className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none sm:px-5"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={ticket.status} />
            <span className="font-mono text-xs text-slate-400">{ticket.ticketNumber}</span>
            {unseen && <Badge tone="green">New reply</Badge>}
          </div>
          <p className={unseen ? 'truncate font-semibold text-slate-900' : 'truncate font-medium text-slate-800'}>
            {ticket.subject}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" aria-hidden />
              {ticket.bookTitle ?? ticket.queryType ?? 'General'}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3" aria-hidden />
              {responseCount === 0 ? 'Awaiting reply' : pluralize(responseCount, 'reply', 'replies')}
            </span>
            <span title={formatDateTime(ticket.updatedAt)}>Updated {formatRelative(ticket.updatedAt)}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
      </Link>
    </li>
  );
}

interface StatusFilterTabsProps {
  tickets: AuthorTicket[];
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}

function StatusFilterTabs({ tickets, value, onChange }: StatusFilterTabsProps) {
  return (
    <div role="group" aria-label="Filter queries by status" className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
      {STATUS_FILTERS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              selected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {option.label}
            <span className="ml-1.5 text-xs text-slate-500">
              {tickets.filter((ticket) => matchesFilter(ticket, option.value)).length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MyTicketsPage() {
  const { data, isPending, isError, error, refetch, isRefetching } = useMyTickets();
  const tickets = data?.data ?? [];

  // The filter lives in the URL so the back button restores it after opening a
  // query. The author endpoint has no status param, so we filter client-side.
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const filter: StatusFilter = statusParam === 'open' || statusParam === 'resolved' ? statusParam : 'all';
  const setFilter = (value: StatusFilter) =>
    setParams(value === 'all' ? {} : { status: value }, { replace: true });
  const visibleTickets = tickets.filter((ticket) => matchesFilter(ticket, filter));

  return (
    <>
      <PageHeader
        title="My Queries"
        description="Your support queries and our replies. This page refreshes automatically."
        actions={tickets.length > 0 ? newQueryLink : undefined}
      />
      {isPending ? (
        <SkeletonList rows={4} />
      ) : isError ? (
        <ErrorState error={error} title="Could not load your tickets" onRetry={() => refetch()} retrying={isRefetching} />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No queries yet"
          description="Questions about royalties, ISBNs, printing or where your book is listed? Raise a query and our team will reply here."
          action={newQueryLink}
        />
      ) : (
        <>
          <StatusFilterTabs tickets={tickets} value={filter} onChange={setFilter} />
          {visibleTickets.length === 0 ? (
            <EmptyState
              title={filter === 'open' ? 'No open queries' : 'No resolved queries'}
              description={
                filter === 'open'
                  ? 'All of your queries have been resolved.'
                  : 'Queries will appear here once our team has resolved them.'
              }
            />
          ) : (
            <Card>
              <ul className="divide-y divide-slate-100">
                {visibleTickets.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}
