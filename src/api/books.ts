import { apiRequest } from './client';
import type { Book, ListResponse, SingleResponse } from './types';

/**
 * The contract does not say whether GET /books is paginated. We accept both a
 * bare `{ data: Book[] }` and a paginated `{ data, meta }` envelope and ask for
 * the maximum page size: an author has a handful of books.
 */
export const booksApi = {
  list: (params: { authorId?: string } = {}) =>
    apiRequest<SingleResponse<Book[]> | ListResponse<Book>>('/books', {
      query: { ...params, limit: 100 },
    }).then((res) => res.data),

  get: (bookId: string) =>
    apiRequest<SingleResponse<Book>>(`/books/${encodeURIComponent(bookId)}`).then((res) => res.data),
};
