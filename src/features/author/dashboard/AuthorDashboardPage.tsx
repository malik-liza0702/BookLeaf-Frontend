import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  IndianRupee,
  Inbox,
  MessageCircle,
  PlusCircle,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import type { AuthorTicket, Book } from '@/api/types';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useBooks } from '@/hooks/useBooks';
import { useMyTickets } from '@/hooks/useTickets';
import { BookStatusBadge } from '@/components/BookStatusBadge';
import { PageHeader } from '@/components/PageHeader';
import { StatusPill } from '@/components/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { royaltyTotals } from '@/lib/books';
import { cn } from '@/lib/cn';
import { EMPTY, formatDateTime, formatINR, formatNumber, formatRelative, pluralize } from '@/lib/format';
import { hasUnseenReplies } from '@/lib/seenReplies';
import { isUnresolved, supportReplyCount } from '@/lib/tickets';

const PANEL_ROWS = 4;

const raiseQueryLink = (
  <Link
    to="/author/tickets/new"
    className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
  >
    <PlusCircle className="h-4 w-4" aria-hidden />
    Raise a query
  </Link>
);

interface TileProps {
  label: string;
  icon: ReactNode;
  value: ReactNode;
  sub: ReactNode;
  loading: boolean;
  highlight?: boolean;
}

function StatTile({ label, icon, value, sub, loading, highlight }: TileProps) {
  return (
    <Card className={cn('p-4', highlight && 'border-amber-200 bg-amber-50/50')}>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        <span aria-hidden>{icon}</span>
        {label}
      </p>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-7 w-24" />
          <Skeleton className="mt-1.5 h-3 w-32" />
        </>
      ) : (
        <>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">{value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
        </>
      )}
    </Card>
  );
}

function SummaryTiles({
  books,
  tickets,
  booksPending,
  ticketsPending,
}: {
  books: Book[] | undefined;
  tickets: AuthorTicket[] | undefined;
  booksPending: boolean;
  ticketsPending: boolean;
}) {
  const totals = books ? royaltyTotals(books) : null;
  const published = books?.filter((b) => !b.isInProduction).length ?? 0;
  const inProduction = (books?.length ?? 0) - published;
  const openQueries = tickets?.filter((t) => isUnresolved(t.status)).length ?? 0;
  const unseen = tickets?.filter((t) => hasUnseenReplies(t.id, supportReplyCount(t))).length ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Titles"
        icon={<BookOpen className="h-3.5 w-3.5" />}
        loading={booksPending}
        value={books ? String(books.length) : EMPTY}
        sub={
          !books
            ? 'Unavailable'
            : inProduction > 0
              ? `${published} published · ${inProduction} in production`
              : pluralize(published, 'published title')
        }
      />
      <StatTile
        label="Royalty earned"
        icon={<IndianRupee className="h-3.5 w-3.5" />}
        loading={booksPending}
        value={formatINR(totals?.earned)}
        sub={totals ? `${formatNumber(totals.copies)} copies sold` : 'Unavailable'}
      />
      <StatTile
        label="Pending payout"
        icon={<Wallet className="h-3.5 w-3.5" />}
        loading={booksPending}
        value={formatINR(totals?.pending)}
        sub={!totals ? 'Unavailable' : totals.pending > 0 ? 'Due in upcoming payout cycles' : 'All paid up'}
        highlight={(totals?.pending ?? 0) > 0}
      />
      <StatTile
        label="Open queries"
        icon={<Inbox className="h-3.5 w-3.5" />}
        loading={ticketsPending}
        value={tickets ? String(openQueries) : EMPTY}
        sub={
          !tickets ? 'Unavailable' : unseen > 0 ? `${pluralize(unseen, 'new reply', 'new replies')} to read` : 'No new replies'
        }
        highlight={unseen > 0}
      />
    </div>
  );
}

function Panel({
  icon,
  title,
  description,
  viewAllTo,
  viewAllLabel,
  footer,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  viewAllTo?: string;
  viewAllLabel?: string;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{icon}</div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-600 hover:underline"
          >
            {viewAllLabel ?? 'View all'}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div className="flex-1">{children}</div>
      {footer && <div className="border-t border-slate-100 px-4 py-3">{footer}</div>}
    </Card>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3 p-4" role="status" aria-label="Loading">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function PanelError({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2 p-4" role="alert">
      <p className="text-sm text-red-700">{errorMessage(error)}</p>
      <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Try again
      </Button>
    </div>
  );
}

function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="p-4 text-sm text-slate-500">{children}</p>;
}

function BooksPanel({ query }: { query: ReturnType<typeof useBooks> }) {
  const { data: books, isPending, isError, error, refetch, isRefetching } = query;

  return (
    <Panel
      icon={<BookOpen className="h-4 w-4" aria-hidden />}
      title="My Books"
      description="Your publications, sales and royalties"
      viewAllTo="/author/books"
    >
      {isPending ? (
        <PanelSkeleton />
      ) : isError ? (
        <PanelError error={error} onRetry={() => refetch()} retrying={isRefetching} />
      ) : books.length === 0 ? (
        <PanelEmpty>No books yet. Once a title is registered with BookLeaf it will appear here.</PanelEmpty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {books.slice(0, PANEL_ROWS).map((book) => (
            <li key={book.id}>
              <Link to="/author/books" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium text-slate-900">{book.title}</p>
                  <BookStatusBadge book={book} />
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium tabular-nums text-slate-900">
                    {book.isInProduction ? EMPTY : formatNumber(book.totalCopiesSold)}
                  </p>
                  <p className="text-xs text-slate-500">copies sold</p>
                </div>
              </Link>
            </li>
          ))}
          {books.length > PANEL_ROWS && (
            <li className="px-4 py-2 text-xs text-slate-500">+ {pluralize(books.length - PANEL_ROWS, 'more title')}</li>
          )}
        </ul>
      )}
    </Panel>
  );
}

function sortForDashboard(tickets: AuthorTicket[]): AuthorTicket[] {
  const unseen = (t: AuthorTicket) => (hasUnseenReplies(t.id, supportReplyCount(t)) ? 1 : 0);
  return [...tickets].sort(
    (a, b) => unseen(b) - unseen(a) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function QueriesPanel({ query }: { query: ReturnType<typeof useMyTickets> }) {
  const { data, isPending, isError, error, refetch, isRefetching } = query;
  const tickets = data?.data ?? [];

  return (
    <Panel
      icon={<MessageCircle className="h-4 w-4" aria-hidden />}
      title="Queries"
      description="Support questions and our replies"
      viewAllTo="/author/tickets"
      footer={
        <Link
          to="/author/tickets/new"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-600 hover:underline"
        >
          <PlusCircle className="h-4 w-4" aria-hidden />
          Raise a new query
        </Link>
      }
    >
      {isPending ? (
        <PanelSkeleton />
      ) : isError ? (
        <PanelError error={error} onRetry={() => refetch()} retrying={isRefetching} />
      ) : tickets.length === 0 ? (
        <PanelEmpty>No queries yet. Questions about royalties, ISBNs, printing or listings? Raise one and we'll reply here.</PanelEmpty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sortForDashboard(tickets)
            .slice(0, PANEL_ROWS)
            .map((ticket) => {
              const unseen = hasUnseenReplies(ticket.id, supportReplyCount(ticket));
              return (
                <li key={ticket.id}>
                  <Link
                    to={`/author/tickets/${ticket.id}`}
                    className="block space-y-1 px-4 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={ticket.status} />
                      <span className="font-mono text-xs text-slate-400">{ticket.ticketNumber}</span>
                      {unseen && <Badge tone="green">New reply</Badge>}
                    </div>
                    <p className={cn('truncate text-sm', unseen ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-slate-500" title={formatDateTime(ticket.updatedAt)}>
                      {ticket.bookTitle ?? ticket.queryType ?? 'General'} · Updated {formatRelative(ticket.updatedAt)}
                    </p>
                  </Link>
                </li>
              );
            })}
        </ul>
      )}
    </Panel>
  );
}

export function AuthorDashboardPage() {
  const { user } = useAuth();
  const booksQuery = useBooks();
  const ticketsQuery = useMyTickets();
  const firstName = user?.name.trim().split(/\s+/)[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
        description="A quick look at your books, royalties and support queries."
        actions={raiseQueryLink}
      />
      <div className="space-y-6">
        <SummaryTiles
          books={booksQuery.data}
          tickets={ticketsQuery.data?.data}
          booksPending={booksQuery.isPending}
          ticketsPending={ticketsQuery.isPending}
        />
        <div className="grid gap-6 md:grid-cols-2">
          <BooksPanel query={booksQuery} />
          <QueriesPanel query={ticketsQuery} />
        </div>
      </div>
    </>
  );
}
