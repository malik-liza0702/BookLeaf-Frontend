import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Mail, User } from 'lucide-react';
import type { AdminTicket, Book } from '@/api/types';
import { BookStatusBadge } from '@/components/BookStatusBadge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBook, useBooks } from '@/hooks/useBooks';
import { productionStage, royaltyTotals } from '@/lib/books';
import { cn } from '@/lib/cn';
import { formatDate, formatINR, formatNumber } from '@/lib/format';

function Fact({ label, children, emphasis }: { label: string; children: ReactNode; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={cn('text-sm tabular-nums', emphasis ? 'font-semibold text-amber-700' : 'text-slate-800')}>{children}</dd>
    </div>
  );
}

function AuthorCard({ ticket }: { ticket: AdminTicket }) {
  const books = useBooks(ticket.authorId);
  const totals = books.data ? royaltyTotals(books.data) : null;

  return (
    <Card>
      <CardHeader
        title={<span className="inline-flex items-center gap-1.5"><User className="h-4 w-4 text-slate-400" aria-hidden />Author</span>}
        action={
          <Link to={`/admin/authors/${encodeURIComponent(ticket.authorId)}`} className="text-xs font-medium text-brand-700 hover:underline">
            View profile
          </Link>
        }
      />
      <div className="space-y-3 p-4">
        <div>
          <p className="font-medium text-slate-900">{ticket.authorName}</p>
          <a href={`mailto:${ticket.authorEmail}`} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
            <Mail className="h-3 w-3" aria-hidden />
            {ticket.authorEmail}
          </a>
        </div>
        {books.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : totals && books.data ? (
          <dl className="grid grid-cols-3 gap-3">
            <Fact label="Books">{books.data.length}</Fact>
            <Fact label="Royalty paid">{formatINR(totals.paid)}</Fact>
            <Fact label="Pending" emphasis={totals.pending > 0}>
              {formatINR(totals.pending)}
            </Fact>
          </dl>
        ) : (
          <p className="text-xs text-slate-400">Account summary unavailable.</p>
        )}
      </div>
    </Card>
  );
}

function BookFacts({ book }: { book: Book }) {
  const stage = productionStage(book);
  if (stage) {
    return (
      <p className="text-sm text-slate-600">
        Not yet published, so there are no sales or royalties yet. Current stage: <strong>{stage}</strong>.
      </p>
    );
  }
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Fact label="Published">{formatDate(book.publicationDate)}</Fact>
      <Fact label="MRP">{formatINR(book.mrp)}</Fact>
      <Fact label="Copies sold">{formatNumber(book.totalCopiesSold)}</Fact>
      <Fact label="Royalty earned">{formatINR(book.totalRoyaltyEarned)}</Fact>
      <Fact label="Royalty paid">{formatINR(book.royaltyPaid)}</Fact>
      <Fact label="Royalty pending" emphasis={book.royaltyPending > 0}>
        {formatINR(book.royaltyPending)}
      </Fact>
      <Fact label="Last payout">{book.lastRoyaltyPayoutDate ? formatDate(book.lastRoyaltyPayoutDate) : 'Never paid'}</Fact>
      <Fact label="Print partner">{book.printPartner ?? 'Not assigned'}</Fact>
      <Fact label="Royalty / copy">{formatINR(book.authorRoyaltyPerCopy)}</Fact>
    </dl>
  );
}

function BookCard({ bookId, fallbackTitle }: { bookId: string; fallbackTitle: string | null }) {
  const book = useBook(bookId);

  return (
    <Card>
      <CardHeader
        title={<span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-slate-400" aria-hidden />Book</span>}
        action={book.data ? <BookStatusBadge book={book.data} /> : undefined}
      />
      <div className="space-y-3 p-4">
        {book.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : book.isError ? (
          <p className="text-sm text-slate-600">
            {fallbackTitle ?? bookId}
            <span className="block text-xs text-slate-400">Book details couldn't be loaded.</span>
          </p>
        ) : (
          <>
            <div>
              <p className="font-medium text-slate-900">{book.data.title}</p>
              <p className="font-mono text-xs text-slate-500">
                {book.data.bookId} · ISBN {book.data.isbn} · {book.data.genre}
              </p>
            </div>
            <BookFacts book={book.data} />
            {book.data.availableOn.length > 0 && (
              <p className="text-xs text-slate-500">Listed on {book.data.availableOn.join(', ')}</p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

/** Who is asking and about what: the facts an admin checks before replying. */
export function RequesterContext({ ticket }: { ticket: AdminTicket }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AuthorCard ticket={ticket} />
      {ticket.bookId ? (
        <BookCard bookId={ticket.bookId} fallbackTitle={ticket.bookTitle} />
      ) : (
        <Card className="flex items-center gap-3 p-4 text-sm text-slate-600">
          <BookOpen className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
          General / account-level query, not linked to a specific book.
        </Card>
      )}
    </div>
  );
}
