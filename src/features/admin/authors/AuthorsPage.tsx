import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import type { AuthorSummary } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAdminAuthors } from '@/hooks/useAdmin';
import { cn } from '@/lib/cn';
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { formatINR, formatNumber, pluralize } from '@/lib/format';

const GRID = 'xl:grid xl:grid-cols-[minmax(0,1fr)_170px_80px_100px_100px_90px] xl:items-center xl:gap-4';

function AuthorsHeader() {
  return (
    <div className={cn('hidden border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500', GRID)}>
      <span>Author</span>
      <span>Books</span>
      <span className="text-right">Copies</span>
      <span className="text-right">Earned</span>
      <span className="text-right">Pending</span>
      <span className="text-right">Tickets open / total</span>
    </div>
  );
}

function Metric({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="min-w-0 xl:text-right">
      <span className="block text-xs text-slate-500 xl:hidden">{label}</span>
      <span className={cn('text-sm tabular-nums text-slate-800', className)}>{children}</span>
    </div>
  );
}

function AuthorRow({ author }: { author: AuthorSummary }) {
  const location = useLocation();
  const { totals } = author;

  return (
    <li>
      <Link
        to={`/admin/authors/${encodeURIComponent(author.authorId)}`}
        state={{ from: location.pathname + location.search }}
        className={cn('block space-y-3 px-4 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none xl:space-y-0', GRID)}
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{author.name}</p>
          <p className="truncate text-xs text-slate-500">{author.email}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            <span className="font-mono">{author.authorId}</span>
            {author.city && <> · {author.city}</>}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5 xl:contents">
          <div className="min-w-0">
            <span className="block text-xs text-slate-500 xl:hidden">Books</span>
            <span className="text-sm text-slate-800">{pluralize(totals.books, 'book')}</span>
            {totals.inProduction > 0 && (
              <span className="block text-xs text-slate-500">
                {totals.published} published · {totals.inProduction} in production
              </span>
            )}
          </div>
          <Metric label="Copies">{formatNumber(totals.copiesSold)}</Metric>
          <Metric label="Earned">{formatINR(totals.royaltyEarned)}</Metric>
          <Metric label="Pending" className={totals.royaltyPending > 0 ? 'font-semibold text-amber-700' : undefined}>
            {formatINR(totals.royaltyPending)}
          </Metric>
          <Metric label="Tickets open / total" className={totals.unresolvedTickets > 0 ? 'font-semibold text-slate-900' : 'text-slate-500'}>
            {totals.unresolvedTickets}
            <span className="font-normal text-slate-400"> / {totals.tickets}</span>
          </Metric>
        </div>
      </Link>
    </li>
  );
}

export function AuthorsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const pageParam = Number(params.get('page'));
  const requestedPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const [search, setSearch] = useState(q);
  const lastPushed = useRef(q);
  useEffect(() => {
    if (q !== lastPushed.current) {
      lastPushed.current = q;
      setSearch(q);
    }
  }, [q]);
  useEffect(() => {
    if (search === lastPushed.current) return;
    const id = window.setTimeout(() => {
      lastPushed.current = search;
      setParams(search ? { q: search } : {}, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search, setParams]);

  const setPage = (page: number) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (page === 1) next.delete('page');
        else next.set('page', String(page));
        return next;
      },
      { replace: true },
    );
  };

  const { data, isPending, isError, error, refetch, isRefetching, isPlaceholderData } = useAdminAuthors({
    q: q.trim() || undefined,
    page: requestedPage,
    limit: ADMIN_PAGE_SIZE,
  });
  const authors = data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Authors" description="Every author with their publications, royalties and support history." />

      <div className="relative">
        <label htmlFor="authors-q" className="sr-only">Search authors</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          id="authors-q"
          type="search"
          placeholder="Search by name, email, author ID or city…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isPending ? (
        <Card className="space-y-2 p-4" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </Card>
      ) : isError ? (
        <ErrorState error={error} title="Could not load authors" onRetry={() => refetch()} retrying={isRefetching} />
      ) : authors.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" aria-hidden />}
          title={requestedPage > 1 ? 'No authors on this page' : q ? 'No authors match this search' : 'No authors yet'}
          description={q ? 'Check the spelling, or search by email or author ID instead.' : undefined}
          action={
            requestedPage > 1 ? (
              <Button variant="secondary" onClick={() => setPage(1)}>Go to first page</Button>
            ) : q ? (
              <Button variant="secondary" onClick={() => setSearch('')}>Clear search</Button>
            ) : undefined
          }
        />
      ) : (
        <Card className={isPlaceholderData ? 'overflow-hidden opacity-60 transition-opacity' : 'overflow-hidden'}>
          <AuthorsHeader />
          <ul className="divide-y divide-slate-100">
            {authors.map((author) => (
              <AuthorRow key={author.id} author={author} />
            ))}
          </ul>
          <Pagination page={data.meta.page} limit={data.meta.limit} total={data.meta.total} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}
