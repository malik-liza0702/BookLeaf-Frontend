import { apiRequest } from './client';
import type { Book, ListResponse, SingleResponse } from './types';

export const booksApi = {
  list: (params: { authorId?: string } = {}) =>
    apiRequest<SingleResponse<Book[]> | ListResponse<Book>>('/books', {
      query: { ...params, limit: 100 },
    }).then((res) => res.data),

  get: (bookId: string) =>
    apiRequest<SingleResponse<Book>>(`/books/${encodeURIComponent(bookId)}`).then((res) => res.data),
};
