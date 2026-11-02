import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import type { AuthorListParams } from '@/api/types';
import { queryKeys } from './queryKeys';
import { retryUnlessClientError } from './useTickets';
import { POLL_ADMIN_MS } from '@/lib/constants';

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: adminApi.users,
    staleTime: 5 * 60_000,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: adminApi.stats,
    refetchInterval: POLL_ADMIN_MS,
  });
}

export function useAdminAuthors(params: AuthorListParams) {
  return useQuery({
    queryKey: queryKeys.admin.authors(params),
    queryFn: () => adminApi.authors(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminAuthor(authorId: string) {
  return useQuery({
    queryKey: queryKeys.admin.author(authorId),
    queryFn: () => adminApi.author(authorId),
    retry: retryUnlessClientError,
  });
}
