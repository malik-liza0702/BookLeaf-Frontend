import { CheckCircle2, Hammer } from 'lucide-react';
import type { Book } from '@/api/types';
import { productionStage } from '@/lib/books';
import { Badge } from './ui/Badge';

export function BookStatusBadge({ book }: { book: Pick<Book, 'status' | 'isInProduction'> }) {
  const stage = productionStage(book);
  if (stage) {
    return (
      <Badge tone="amber" icon={<Hammer className="h-3 w-3" aria-hidden />} title={book.status}>
        In production · {stage}
      </Badge>
    );
  }
  const live = book.status.toLowerCase().includes('live');
  return (
    <Badge tone={live ? 'green' : 'neutral'} icon={live ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : undefined}>
      {book.status}
    </Badge>
  );
}
