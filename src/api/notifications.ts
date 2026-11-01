import { apiRequest } from './client';
import type { NotificationList, SingleResponse } from './types';

export const notificationsApi = {
  list: () => apiRequest<NotificationList>('/notifications'),

  /** Marks one ticket's notifications as read, or all of them without a ticketId. */
  markRead: (ticketId?: string) =>
    apiRequest<SingleResponse<{ updated: number }>>('/notifications/read', {
      method: 'POST',
      body: { ticketId },
    }),
};
