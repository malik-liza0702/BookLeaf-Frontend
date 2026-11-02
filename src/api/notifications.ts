import { apiRequest } from './client';
import type { NotificationList, SingleResponse } from './types';

export const notificationsApi = {
  list: () => apiRequest<NotificationList>('/notifications'),

  markRead: (ticketId?: string) =>
    apiRequest<SingleResponse<{ updated: number }>>('/notifications/read', {
      method: 'POST',
      body: { ticketId },
    }),
};
