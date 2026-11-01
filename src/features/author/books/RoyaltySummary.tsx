import type { Book } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { formatINR, formatNumber, pluralize } from '@/lib/format';
import { royaltyTotals } from '@/lib/books';
import { cn } from '@/lib/cn';

export function RoyaltySummary({ books, audience = 'author' }: { books: Book[]; audience?: 'author' | 'admin' }) {
  const totals = royaltyTotals(books);
  const published = books.filter((b) => !b.isInProduction).length;
  const inProduction = books.length - published;

  const tiles = [
    { label: 'Total royalty earned', value: formatINR(totals.earned), sub: `${formatNumber(totals.copies)} copies sold` },
    { label: 'Royalty paid', value: formatINR(totals.paid), sub: audience === 'author' ? 'Paid out to you so far' : 'Paid out so far' },
    {
      label: 'Pending payout',
      value: formatINR(totals.pending),
      sub: totals.pending > 0 ? 'Due in upcoming payout cycles' : 'All paid up',
      highlight: totals.pending > 0,
    },
    {
      label: 'Titles',
      value: String(books.length),
      sub: inProduction > 0 ? `${published} published · ${inProduction} in production` : pluralize(published, 'published title'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label} className={cn('p-4', tile.highlight && 'border-amber-200 bg-amber-50/50')}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tile.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">{tile.value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{tile.sub}</p>
        </Card>
      ))}
    </div>
  );
}
