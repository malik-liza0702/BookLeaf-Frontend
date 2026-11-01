import type { AdminTicketFilters, AuthorListParams } from '@/api/types';

/**
 * Central query-key factory. Keys are hierarchical so a mutation can
 * invalidate a whole branch, e.g. `queryKeys.tickets.all` refreshes every
 * ticket list and detail at once.
 */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  books: {
    all: ['books'] as const,
    list: (authorId?: string) => ['books', 'list', { authorId: authorId ?? null }] as const,
    detail: (bookId: string) => ['books', 'detail', bookId] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    lists: () => ['tickets', 'list'] as const,
    mine: () => ['tickets', 'list', 'mine'] as const,
    adminList: (filters: AdminTicketFilters) => ['tickets', 'list', 'admin', filters] as const,
    details: () => ['tickets', 'detail'] as const,
    detail: (ticketId: string) => ['tickets', 'detail', ticketId] as const,
    aiDraft: (ticketId: string) => ['tickets', 'ai-draft', ticketId] as const,
  },
  notifications: ['notifications'] as const,
  admin: {
    users: ['admin', 'users'] as const,
    stats: ['admin', 'stats'] as const,
    authors: (params: AuthorListParams) => ['admin', 'authors', 'list', params] as const,
    author: (authorId: string) => ['admin', 'authors', 'detail', authorId] as const,
  },
};
