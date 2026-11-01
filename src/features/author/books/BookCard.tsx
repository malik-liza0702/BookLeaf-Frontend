import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MessageSquarePlus } from 'lucide-react';
import type { Book } from '@/api/types';
import { BookStatusBadge } from '@/components/BookStatusBadge';
import { Card } from '@/components/ui/Card';
import { EMPTY, formatDate, formatINR, formatNumber } from '@/lib/format';

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="font-normal italic text-slate-400">{children}</span>;
}

function PendingRoyalty({ book }: { book: Book }) {
  if (book.isInProduction) return <Muted>{EMPTY}</Muted>;
  if (book.royaltyPending > 0) return <span className="text-amber-700">{formatINR(book.royaltyPending)}</span>;
  if (book.totalRoyaltyEarned > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        All paid up
      </span>
    );
  }
  return <Muted>Nothing pending</Muted>;
}

export function BookCard({ book, audience = 'author' }: { book: Book; audience?: 'author' | 'admin' }) {
  const inProduction = book.isInProduction;

  return (
    <Card className="flex flex-col">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-snug text-slate-900">{book.title}</h2>
          <BookStatusBadge book={book} />
        </div>
        <p className="text-xs text-slate-500">
          <span className="font-mono">{book.bookId}</span>
          <span className="mx-1.5">·</span>
          ISBN <span className="font-mono">{book.isbn || EMPTY}</span>
          <span className="mx-1.5">·</span>
          {book.genre || EMPTY}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4">
        <Stat label="Published">{book.publicationDate ? formatDate(book.publicationDate) : <Muted>Not yet published</Muted>}</Stat>
        <Stat label="MRP">{book.mrp != null ? formatINR(book.mrp) : <Muted>{EMPTY}</Muted>}</Stat>
        <Stat label="Royalty / copy">
          {book.authorRoyaltyPerCopy != null ? formatINR(book.authorRoyaltyPerCopy) : <Muted>{EMPTY}</Muted>}
        </Stat>
        <Stat label="Copies sold">{inProduction ? <Muted>{EMPTY}</Muted> : formatNumber(book.totalCopiesSold)}</Stat>
      </dl>

      <div className="mx-4 rounded-md bg-slate-50 p-3">
        {inProduction ? (
          <p className="text-sm text-slate-600">
            {audience === 'author'
              ? "Royalties start once your book is published and on sale. We'll show earnings and payouts here."
              : 'Not yet published, so there are no sales or royalties yet.'}
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Stat label="Royalty earned">{formatINR(book.totalRoyaltyEarned)}</Stat>
            <Stat label="Royalty paid">
              {book.royaltyPaid > 0 ? formatINR(book.royaltyPaid) : <Muted>No payouts yet</Muted>}
            </Stat>
            <Stat label="Pending">
              <PendingRoyalty book={book} />
            </Stat>
            <Stat label="Last payout">
              {book.lastRoyaltyPayoutDate ? formatDate(book.lastRoyaltyPayoutDate) : <Muted>No payouts yet</Muted>}
            </Stat>
          </dl>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="mb-1.5 text-xs text-slate-500">Available on</p>
          {book.availableOn.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {book.availableOn.map((platform) => (
                <li key={platform} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
                  {platform}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-slate-400">
              {inProduction ? 'Listings go live after publication' : 'Not listed on any platform yet'}
            </p>
          )}
        </div>
        {book.printPartner && (
          <p className="text-xs text-slate-500">
            Print partner: <span className="text-slate-700">{book.printPartner}</span>
          </p>
        )}
        {audience === 'author' && (
          <div className="mt-auto pt-1">
            <Link
              to="/author/tickets/new"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-600 hover:underline"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden />
              Raise a query
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
