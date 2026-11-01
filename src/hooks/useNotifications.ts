import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications';
import { useToast } from '@/components/toast/useToast';
import { POLL_AUTHOR_MS } from '@/lib/constants';
import { pluralize } from '@/lib/format';
import { queryKeys } from './queryKeys';

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: notificationsApi.list,
    refetchInterval: POLL_AUTHOR_MS,
    enabled,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketId?: string) => notificationsApi.markRead(ticketId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

/** Viewing a ticket clears its notifications, including any that arrive while it is open. */
export function useMarkTicketNotificationsRead(ticketId: string) {
  const { data } = useNotifications();
  const { mutate } = useMarkNotificationsRead();
  const newestUnreadId = data?.data.find((n) => !n.read && n.ticketId === ticketId)?.id;

  useEffect(() => {
    if (newestUnreadId) mutate(ticketId);
  }, [newestUnreadId, ticketId, mutate]);
}

/**
 * Toasts notifications that arrive during this session. Anything already there
 * on first load is not toasted, and neither is the ticket on screen.
 */
export function useNotificationToasts(enabled: boolean) {
  const toast = useToast();
  const { data } = useNotifications(enabled);
  const { pathname } = useLocation();
  const newestSeen = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const previous = newestSeen.current;
    newestSeen.current = data.data[0]?.createdAt ?? previous ?? '';
    if (previous === null) return;

    const arrived = data.data.filter(
      (n) => !n.read && n.createdAt > previous && pathname !== `/author/tickets/${n.ticketId}`,
    );
    const [first] = arrived;
    if (!first) return;
    toast.info(
      arrived.length === 1
        ? `${first.ticketNumber}: ${first.message}`
        : `You have ${pluralize(arrived.length, 'new notification')}`,
    );
  }, [data, pathname, toast]);
}
