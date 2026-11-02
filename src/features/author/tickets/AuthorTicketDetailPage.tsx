import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, Clock, LifeBuoy } from 'lucide-react';
import { isApiError } from '@/api/client';
import type { AuthorTicket } from '@/api/types';
import { useMarkTicketNotificationsRead } from '@/hooks/useNotifications';
import { useMyTicket } from '@/hooks/useTickets';
import { AttachmentList } from '@/components/AttachmentList';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { StatusPill } from '@/components/StatusPill';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, formatDateTime, formatRelative } from '@/lib/format';
import { markResponsesSeen } from '@/lib/seenReplies';
import { isUnresolved, supportReplyCount } from '@/lib/tickets';
import { TicketReplyForm } from './TicketReplyForm';
import { TicketSubmittedCard } from './TicketSubmittedCard';

const messageBody = 'whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800';

function YourMessage({ at, message, children }: { at: string; message: string; children?: ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="font-medium text-slate-700">You</span>
        <time dateTime={at} title={formatDateTime(at)}>
          {formatRelative(at)}
        </time>
      </div>
      <p className={messageBody}>{message}</p>
      {children}
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading ticket">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function StatusBanner({ ticket }: { ticket: AuthorTicket }) {
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          This query was marked <strong>{ticket.status.toLowerCase()}</strong>
          {ticket.resolvedAt ? ` on ${formatDate(ticket.resolvedAt)}` : ''}. Need more help?{' '}
          <Link to="/author/tickets/new" className="font-medium underline">
            Raise a new query
          </Link>
          .
        </p>
      </div>
    );
  }
  if (supportReplyCount(ticket) === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>We've received your query and our support team will reply here. This page updates automatically.</p>
      </div>
    );
  }
  return null;
}

export function AuthorTicketDetailPage() {
  const { ticketId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const createdInState = Boolean((location.state as { justCreated?: boolean } | null)?.justCreated);
  const [justCreated] = useState(createdInState);
  const { data: ticket, isPending, isError, error, refetch, isRefetching } = useMyTicket(ticketId);

  useEffect(() => {
    if (createdInState) navigate(location.pathname, { replace: true, state: null });
  }, [createdInState, location.pathname, navigate]);

  const supportReplies = ticket ? supportReplyCount(ticket) : 0;
  useEffect(() => {
    if (ticket) markResponsesSeen(ticket.id, supportReplies);
  }, [ticket, supportReplies]);
  useMarkTicketNotificationsRead(ticketId);

  const back = (
    <Link to="/author/tickets" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      My queries
    </Link>
  );

  if (isPending) return <div className="mx-auto max-w-3xl">{back}<DetailSkeleton /></div>;

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl">
        {back}
        {isApiError(error) && error.status === 404 ? (
          <EmptyState
            title="Ticket not found"
            description="This ticket doesn't exist or isn't linked to your account."
            action={<Link to="/author/tickets" className="text-sm font-medium text-brand-700 hover:underline">Back to my tickets</Link>}
          />
        ) : (
          <ErrorState error={error} title="Could not load this ticket" onRetry={() => refetch()} retrying={isRefetching} />
        )}
      </div>
    );
  }

  const showSubmitted = justCreated && isUnresolved(ticket.status) && supportReplies === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        {back}
        {showSubmitted && <TicketSubmittedCard ticketNumber={ticket.ticketNumber} />}
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={ticket.status} />
          <span className="font-mono text-xs text-slate-400">{ticket.ticketNumber}</span>
        </div>
        <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900">{ticket.subject}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {ticket.bookTitle ?? ticket.queryType ?? 'General / Account Level'}
          </span>
          <span>Raised {formatDateTime(ticket.createdAt)}</span>
        </p>
      </div>

      {!showSubmitted && <StatusBanner ticket={ticket} />}

      <section aria-labelledby="conversation-heading" className="space-y-4">
        <h2 id="conversation-heading" className="sr-only">Conversation</h2>

        <YourMessage at={ticket.createdAt} message={ticket.description}>
          {ticket.attachments.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <AttachmentList attachments={ticket.attachments} />
            </div>
          )}
        </YourMessage>

        {ticket.responses.map((response) =>
          response.from === 'author' ? (
            <YourMessage key={response.id} at={response.createdAt} message={response.message} />
          ) : (
            <Card key={response.id} className="border-brand-100 bg-brand-50/40 p-4 sm:ml-8 sm:p-5">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 font-medium text-brand-700">
                  <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
                  BookLeaf Support
                </span>
                <time dateTime={response.createdAt} title={formatDateTime(response.createdAt)}>
                  {formatRelative(response.createdAt)}
                </time>
              </div>
              <p className={messageBody}>{response.message}</p>
            </Card>
          ),
        )}
      </section>

      {supportReplies > 0 && <TicketReplyForm ticketId={ticket.id} status={ticket.status} />}

      {isUnresolved(ticket.status) && supportReplies > 0 && (
        <p className="text-center text-xs text-slate-400">New replies appear here automatically.</p>
      )}

    </div>
  );
}
