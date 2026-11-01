import type { AuthorTicket, TicketStatus } from '@/api/types';

export function isUnresolved(status: TicketStatus): boolean {
  return status === 'Open' || status === 'In Progress';
}

/** `responses` also holds the author's own follow-ups; this counts only the team's. */
export function supportReplyCount(ticket: Pick<AuthorTicket, 'responses'>): number {
  return ticket.responses?.filter((response) => response.from === 'support').length ?? 0;
}
