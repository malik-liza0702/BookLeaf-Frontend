import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type AdminTicketFilters,
  type TicketCategory,
  type TicketPriority,
  type TicketSort,
  type TicketStatus,
} from '@/api/types';
import { ADMIN_PAGE_SIZE } from '@/lib/constants';
import { endOfLocalDayISO, startOfLocalDayISO } from '@/lib/dates';

export interface QueueFilterState {
  status: TicketStatus | '';
  category: TicketCategory | '';
  priority: TicketPriority | '';
  assignedTo: string;
  from: string;
  to: string;
  q: string;
  sort: TicketSort;
  page: number;
}

const SORTS: readonly TicketSort[] = ['urgency', 'newest', 'oldest'];

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : '';
}

export function useQueueFilters() {
  const [params, setParams] = useSearchParams();

  const state = useMemo<QueueFilterState>(() => {
    const page = Number(params.get('page'));
    return {
      status: oneOf(params.get('status'), TICKET_STATUSES),
      category: oneOf(params.get('category'), TICKET_CATEGORIES),
      priority: oneOf(params.get('priority'), TICKET_PRIORITIES),
      assignedTo: params.get('assignedTo') ?? '',
      from: params.get('from') ?? '',
      to: params.get('to') ?? '',
      q: params.get('q') ?? '',
      sort: oneOf(params.get('sort'), SORTS) || 'urgency',
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }, [params]);

  const update = useCallback(
    (patch: Partial<QueueFilterState>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            const isDefault = value === '' || value === undefined || (key === 'sort' && value === 'urgency') || (key === 'page' && value === 1);
            if (isDefault) next.delete(key);
            else next.set(key, String(value));
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  const activeCount = [state.status, state.category, state.priority, state.assignedTo, state.from, state.to, state.q].filter(Boolean).length;

  const apiFilters = useMemo<AdminTicketFilters>(
    () => ({
      status: state.status || undefined,
      category: state.category || undefined,
      priority: state.priority || undefined,
      assignedTo: state.assignedTo || undefined,
      from: state.from ? startOfLocalDayISO(state.from) : undefined,
      to: state.to ? endOfLocalDayISO(state.to) : undefined,
      q: state.q.trim() || undefined,
      sort: state.sort,
      page: state.page,
      limit: ADMIN_PAGE_SIZE,
    }),
    [state],
  );

  return { state, apiFilters, update, reset, activeCount };
}
