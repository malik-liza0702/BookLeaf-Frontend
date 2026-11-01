import { apiRequest } from './client';
import type { AdminStats, AdminUser, AuthorDetail, AuthorListParams, AuthorSummary, ListResponse, SingleResponse } from './types';

export const adminApi = {
  users: () => apiRequest<SingleResponse<AdminUser[]>>('/admin/users').then((res) => res.data),
  authors: (params: AuthorListParams) =>
    apiRequest<ListResponse<AuthorSummary>>('/admin/authors', { query: { ...params } }),
  author: (authorId: string) =>
    apiRequest<SingleResponse<AuthorDetail>>(`/admin/authors/${encodeURIComponent(authorId)}`).then((res) => res.data),
  stats: () => apiRequest<SingleResponse<AdminStats>>('/admin/stats').then((res) => res.data),
};
