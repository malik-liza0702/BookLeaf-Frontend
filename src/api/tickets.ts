import { apiRequest } from './client';
import type {
  AdminTicket,
  AdminTicketFilters,
  AiDraft,
  AuthorTicket,
  CreateNoteRequest,
  CreateReplyRequest,
  CreateResponseRequest,
  CreateTicketRequest,
  DraftRevision,
  ListResponse,
  SingleResponse,
  UpdateTicketRequest,
} from './types';

const path = (ticketId: string, suffix = '') => `/tickets/${encodeURIComponent(ticketId)}${suffix}`;

export const ticketsApi = {
  listMine: () =>
    apiRequest<ListResponse<AuthorTicket>>('/tickets', { query: { limit: 100 } }),

  getMine: (ticketId: string) =>
    apiRequest<SingleResponse<AuthorTicket>>(path(ticketId)).then((res) => res.data),

  create: (body: CreateTicketRequest) =>
    apiRequest<SingleResponse<AuthorTicket>>('/tickets', { method: 'POST', body }).then(
      (res) => res.data,
    ),

  reply: (ticketId: string, body: CreateReplyRequest) =>
    apiRequest<SingleResponse<AuthorTicket>>(path(ticketId, '/replies'), { method: 'POST', body }).then(
      (res) => res.data,
    ),

  listAll: (filters: AdminTicketFilters) =>
    apiRequest<ListResponse<AdminTicket>>('/tickets', { query: { ...filters } }),

  getAdmin: (ticketId: string) =>
    apiRequest<SingleResponse<AdminTicket>>(path(ticketId)).then((res) => res.data),

  update: (ticketId: string, body: UpdateTicketRequest) =>
    apiRequest<SingleResponse<AdminTicket>>(path(ticketId), { method: 'PATCH', body }).then(
      (res) => res.data,
    ),

  respond: (ticketId: string, body: CreateResponseRequest) =>
    apiRequest<SingleResponse<unknown>>(path(ticketId, '/responses'), { method: 'POST', body }),

  addNote: (ticketId: string, body: CreateNoteRequest) =>
    apiRequest<SingleResponse<unknown>>(path(ticketId, '/notes'), { method: 'POST', body }),

  aiDraft: (ticketId: string, regenerate = false) =>
    apiRequest<SingleResponse<AiDraft>>(path(ticketId, '/ai-draft'), {
      method: 'POST',
      body: { regenerate },
    }).then((res) => res.data),

  reviseAiDraft: (ticketId: string, revision: DraftRevision) =>
    apiRequest<SingleResponse<AiDraft>>(path(ticketId, '/ai-draft'), {
      method: 'POST',
      body: { revision },
    }).then((res) => res.data),
};
