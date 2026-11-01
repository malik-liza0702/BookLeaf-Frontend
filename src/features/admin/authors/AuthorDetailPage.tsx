import { useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Inbox, Mail, MapPin, Phone, CalendarDays, Users } from 'lucide-react';
import { isApiError } from '@/api/client';
import type { AuthorDetail } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookCard } from '@/features/author/books/BookCard';
import { RoyaltySummary } from '@/features/author/books/RoyaltySummary';
import { useAdminAuthor } from '@/hooks/useAdmin';
import { useAdminTickets } from '@/hooks/useTickets';
import { ADMIN_PAGE_SIZE } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { QueueHeader, QueueRow } from '../queue/QueueList';

const AUTHORS_PATH = '/admin/authors';

function ProfileItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="break-words text-sm text-slate-800">{children}</dd>
      </div>
    </div>
  );
}

function Missing() {
  return <span className="italic text-slate-400">Not provided</span>;
}

function ProfileCard({ author }: { author: AuthorDetail }) {
  return (
    <Card>
      <dl className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileItem icon={<Mail className="h-4 w-4" aria-hidden />} label="Email">
          <a href={`mailto:${author.email}`} className="text-brand-700 hover:underline">{author.email}</a>
        </ProfileItem>
        <ProfileItem icon={<Phone className="h-4 w-4" aria-hidden />} label="Phone">
          {author.phone ? <a href={`tel:${author.phone}`} className="text-brand-700 hover:underline">{author.phone}</a> : <Missing />}
        </ProfileItem>
        <ProfileItem icon={<MapPin className="h-4 w-4" aria-hidden />} label="City">
          {author.city ?? <Missing />}
        </ProfileItem>
        <ProfileItem icon={<CalendarDays className="h-4 w-4" aria-hidden />} label="Joined">
          {formatDate(author.joinedDate)}
        </ProfileItem>
      </dl>
    </Card>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold text-slate-900">{children}</h2>;
}

function Publications({ author }: { author: AuthorDetail }) {
  return (
    <section className="space-y-3">
      <SectionTitle>Publications</SectionTitle>
      {author.books.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" aria-hidden />}
          title="No books yet"
          description="This author has no titles registered with BookLeaf."
        />
      ) : (
        <>
          <RoyaltySummary books={author.books} audience="admin" />
          <div className="grid gap-4 xl:grid-cols-2">
            {author.books.map((book) => (
              <BookCard key={book.id} book={book} audience="admin" />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function AuthorTickets({ authorId }: { authorId: string }) {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch, isRefetching, isPlaceholderData } = useAdminTickets({
    authorId,
    page,
    limit: ADMIN_PAGE_SIZE,
  });

  return (
    <section className="space-y-3">
      <SectionTitle>Support tickets{data ? ` (${data.meta.total})` : ''}</SectionTitle>
      {isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : isError ? (
        <ErrorState error={error} title="Could not load tickets" onRetry={() => refetch()} retrying={isRefetching} />
      ) : data.data.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" aria-hidden />}
          title={page > 1 ? 'No tickets on this page' : 'No tickets yet'}
          description={page > 1 ? undefined : "This author hasn't raised any queries."}
        />
      ) : (
        <Card className={isPlaceholderData ? 'overflow-hidden opacity-60 transition-opacity' : 'overflow-hidden'}>
          <QueueHeader />
          <ul className="divide-y divide-slate-100">
            {data.data.map((ticket) => (
              <QueueRow key={ticket.id} ticket={ticket} />
            ))}
          </ul>
          <Pagination page={data.meta.page} limit={data.meta.limit} total={data.meta.total} onPageChange={setPage} />
        </Card>
      )}
    </section>
  );
}

export function AuthorDetailPage() {
  const { authorId = '' } = useParams();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const backTo = from?.startsWith(AUTHORS_PATH) ? from : AUTHORS_PATH;
  const { data: author, isPending, isError, error, refetch, isRefetching } = useAdminAuthor(authorId);

  const back = (
    <Link to={backTo} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back to authors
    </Link>
  );

  if (isPending) {
    return (
      <div role="status" aria-label="Loading author">
        {back}
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        {back}
        {isApiError(error) && error.status === 404 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" aria-hidden />}
            title="Author not found"
            description={`There is no author with the ID ${authorId}.`}
          />
        ) : (
          <ErrorState error={error} title="Could not load this author" onRetry={() => refetch()} retrying={isRefetching} />
        )}
      </div>
    );
  }

  return (
    <div>
      {back}
      <PageHeader title={author.name} description={<span className="font-mono">{author.authorId}</span>} />
      <div className="space-y-8">
        <ProfileCard author={author} />
        <Publications author={author} />
        <AuthorTickets authorId={author.authorId} />
      </div>
    </div>
  );
}
