import { Link } from 'react-router-dom';
import { BookOpen, PlusCircle } from 'lucide-react';
import { useBooks } from '@/hooks/useBooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookCard } from './BookCard';
import { RoyaltySummary } from './RoyaltySummary';

function BooksSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading books">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  );
}

export function MyBooksPage() {
  const { data: books, isPending, isError, error, refetch, isRefetching } = useBooks();

  return (
    <>
      <PageHeader
        title="My Books"
        description="Sales, royalties and availability for each of your titles."
        actions={
          <Link
            to="/author/tickets/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Raise a query
          </Link>
        }
      />
      {isPending ? (
        <BooksSkeleton />
      ) : isError ? (
        <ErrorState error={error} title="Could not load your books" onRetry={() => refetch()} retrying={isRefetching} />
      ) : books.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" aria-hidden />}
          title="No books yet"
          description="Once a title is registered with BookLeaf it will appear here with sales and royalty details."
        />
      ) : (
        <div className="space-y-6">
          <RoyaltySummary books={books} />
          <div className="grid gap-4 lg:grid-cols-2">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
