import { Inbox } from 'lucide-react';
import { useAdminTickets } from '@/hooks/useTickets';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { QueueFilters } from './QueueFilters';
import { QueueHeader, QueueRow } from './QueueList';
import { StatsStrip } from './StatsStrip';
import { useQueueFilters } from './useQueueFilters';

export function TicketQueuePage() {
  const { state, apiFilters, update, reset, activeCount } = useQueueFilters();
  const { data, isPending, isError, error, refetch, isRefetching, isPlaceholderData, isFetching } = useAdminTickets(apiFilters);

  const tickets = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const limit = meta?.limit ?? apiFilters.limit ?? 20;
  const page = meta?.page ?? state.page;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ticket Queue"
        description="Sorted by urgency: unresolved first, then priority, then oldest. Updates every 10 seconds."
        actions={
          isFetching && !isPending ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Spinner className="h-3 w-3" /> Refreshing
            </span>
          ) : undefined
        }
      />

      <StatsStrip state={state} onFilter={update} />
      <QueueFilters
        state={state}
        resultCount={isPending || isError ? undefined : total}
        onChange={update}
        onReset={reset}
      />

      {isPending ? (
        <Card className="space-y-2 p-4" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </Card>
      ) : isError ? (
        <ErrorState error={error} title="Could not load tickets" onRetry={() => refetch()} retrying={isRefetching} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" aria-hidden />}
          title={state.page > 1 ? 'No tickets on this page' : activeCount > 0 ? 'No tickets match these filters' : 'The queue is empty'}
          description={activeCount > 0 ? 'Try widening the date range or clearing some filters.' : 'New author queries will appear here automatically.'}
          action={
            state.page > 1 ? (
              <Button variant="secondary" onClick={() => update({ page: 1 })}>Go to first page</Button>
            ) : activeCount > 0 ? (
              <Button variant="secondary" onClick={reset}>Clear filters</Button>
            ) : undefined
          }
        />
      ) : (
        <Card className={isPlaceholderData ? 'overflow-hidden opacity-60 transition-opacity' : 'overflow-hidden'}>
          <QueueHeader />
          <ul className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <QueueRow key={ticket.id} ticket={ticket} />
            ))}
          </ul>
          <Pagination page={page} limit={limit} total={total} onPageChange={(next) => update({ page: next })} />
        </Card>
      )}
    </div>
  );
}
