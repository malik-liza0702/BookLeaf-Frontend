import type { Book } from '@/api/types';

export function productionStage(book: Pick<Book, 'status' | 'isInProduction'>): string | null {
  if (!book.isInProduction && !book.status.toLowerCase().startsWith('in production')) return null;
  const [, stage] = book.status.split(/\s+-\s+/, 2);
  return stage?.trim() || 'In production';
}

export interface RoyaltyTotals {
  earned: number;
  paid: number;
  pending: number;
  copies: number;
}

export function royaltyTotals(books: Book[]): RoyaltyTotals {
  return books.reduce<RoyaltyTotals>(
    (acc, b) => ({
      earned: acc.earned + (b.totalRoyaltyEarned || 0),
      paid: acc.paid + (b.royaltyPaid || 0),
      pending: acc.pending + (b.royaltyPending || 0),
      copies: acc.copies + (b.totalCopiesSold || 0),
    }),
    { earned: 0, paid: 0, pending: 0, copies: 0 },
  );
}
