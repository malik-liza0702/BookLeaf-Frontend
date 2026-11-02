import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/api/tickets';
import type {
  AdminTicket,
  AdminTicketFilters,
  AdminUser,
  AiDraft,
  DraftRevision,
  CreateResponseRequest,
  CreateTicketRequest,
  UpdateTicketRequest,
} from '@/api/types';
import { isApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { POLL_ADMIN_MS, POLL_AUTHOR_MS } from '@/lib/constants';
import { queryKeys } from './queryKeys';

export function retryUnlessClientError(failureCount: number, error: unknown) {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

function stopPollingOnError(query: { state: { status: string } }, intervalMs: number) {
  return query.state.status === 'error' ? false : intervalMs;
}

export function useMyTickets() {
  return useQuery({
    queryKey: queryKeys.tickets.mine(),
    queryFn: ticketsApi.listMine,
    refetchInterval: POLL_AUTHOR_MS,
  });
}

export function useMyTicket(ticketId: string) {
  return useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: () => ticketsApi.getMine(ticketId),
    refetchInterval: (query) => stopPollingOnError(query, POLL_AUTHOR_MS),
    retry: retryUnlessClientError,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTicketRequest) => ticketsApi.create(body),
    onSuccess: (ticket) => {
      queryClient.setQueryData(queryKeys.tickets.detail(ticket.id), ticket);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() });
    },
  });
}

export function useSendAuthorReply(ticketId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTicket();
  return useMutation({
    mutationFn: (message: string) => ticketsApi.reply(ticketId, { message }),
    onSuccess: (ticket) => {
      queryClient.setQueryData(queryKeys.tickets.detail(ticketId), ticket);
      void invalidate(ticketId);
    },
  });
}

export function useAdminTickets(filters: AdminTicketFilters) {
  return useQuery({
    queryKey: queryKeys.tickets.adminList(filters),
    queryFn: () => ticketsApi.listAll(filters),
    refetchInterval: POLL_ADMIN_MS,
    placeholderData: keepPreviousData,
  });
}

export function useAdminTicket(ticketId: string) {
  return useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: () => ticketsApi.getAdmin(ticketId),
    refetchInterval: (query) => stopPollingOnError(query, POLL_ADMIN_MS),
    retry: retryUnlessClientError,
  });
}

function useInvalidateTicket() {
  const queryClient = useQueryClient();
  return (ticketId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats }),
    ]);
}

export function useUpdateTicket(ticketId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTicket();
  const { user } = useAuth();
  const detailKey = queryKeys.tickets.detail(ticketId);

  return useMutation({
    mutationFn: (patch: UpdateTicketRequest) => ticketsApi.update(ticketId, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<AdminTicket>(detailKey);
      if (previous) {
        const next: AdminTicket = { ...previous };
        if (patch.status) next.status = patch.status;
        if (patch.category !== undefined) {
          next.category = patch.category ?? previous.aiCategory ?? previous.category;
          next.categoryOverridden = patch.category !== null;
        }
        if (patch.priority !== undefined) {
          next.priority = patch.priority ?? previous.aiPriority ?? previous.priority;
          next.priorityOverridden = patch.priority !== null;
        }
        if (patch.assignedTo !== undefined) {
          const admins = queryClient.getQueryData<AdminUser[]>(queryKeys.admin.users) ?? [];
          const targetId = patch.assignedTo === 'me' ? user?.id : patch.assignedTo;
          const admin = admins.find((a) => a.id === targetId);
          next.assignedTo =
            targetId == null
              ? null
              : { id: targetId, name: admin?.name ?? (targetId === user?.id ? user?.name ?? 'Me' : '…') };
        }
        queryClient.setQueryData(detailKey, next);
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
    },
    onSettled: () => invalidate(ticketId),
  });
}

export function useSendResponse(ticketId: string) {
  const invalidate = useInvalidateTicket();
  return useMutation({
    mutationFn: (body: CreateResponseRequest) => ticketsApi.respond(ticketId, body),
    onSuccess: () => invalidate(ticketId),
  });
}

export function useAddNote(ticketId: string) {
  const invalidate = useInvalidateTicket();
  return useMutation({
    mutationFn: (text: string) => ticketsApi.addNote(ticketId, { text }),
    onSuccess: () => invalidate(ticketId),
  });
}

export function useAiDraft(ticketId: string, enabled: boolean, initial?: AiDraft | null) {
  return useQuery({
    queryKey: queryKeys.tickets.aiDraft(ticketId),
    queryFn: () => ticketsApi.aiDraft(ticketId, false),
    initialData: initial ?? undefined,
    enabled,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useRegenerateAiDraft(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ticketsApi.aiDraft(ticketId, true),
    onSuccess: (draft) => {
      queryClient.setQueryData(queryKeys.tickets.aiDraft(ticketId), draft);
    },
  });
}

export function useReviseAiDraft(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (revision: DraftRevision) => ticketsApi.reviseAiDraft(ticketId, revision),
    onSuccess: (draft) => {
      queryClient.setQueryData(queryKeys.tickets.aiDraft(ticketId), draft);
    },
  });
}
