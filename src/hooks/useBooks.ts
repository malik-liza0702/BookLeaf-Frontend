import { useQuery } from '@tanstack/react-query';
import { booksApi } from '@/api/books';
import { queryKeys } from './queryKeys';

export function useBooks(authorId?: string) {
  return useQuery({
    queryKey: queryKeys.books.list(authorId),
    queryFn: () => booksApi.list(authorId ? { authorId } : {}),
  });
}

export function useBook(bookId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.books.detail(bookId ?? ''),
    queryFn: () => booksApi.get(bookId as string),
    enabled: Boolean(bookId),
  });
}
