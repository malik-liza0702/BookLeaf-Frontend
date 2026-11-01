import type { ReactNode } from 'react';
import { LifeBuoy, Lock, Sparkles, User } from 'lucide-react';
import type { AdminResponse, AdminTicket, InternalNote } from '@/api/types';
import { AttachmentList } from '@/components/AttachmentList';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/format';

type TimelineEntry =
  | { kind: 'response'; at: string; item: AdminResponse }
  | { kind: 'note'; at: string; item: InternalNote };

/** Responses and internal notes merged in chronological order. */
function buildEntries(ticket: AdminTicket): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...ticket.responses.map((item) => ({ kind: 'response' as const, at: item.createdAt, item })),
    ...ticket.internalNotes.map((item) => ({ kind: 'note' as const, at: item.createdAt, item })),
  ];
  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function Timestamp({ at }: { at: string }) {
  return (
    <time dateTime={at} title={formatDateTime(at)} className="shrink-0">
      {formatRelative(at)}
    </time>
  );
}

function Entry({
  className,
  who,
  at,
  tag,
  children,
}: {
  className: string;
  who: ReactNode;
  at: string;
  tag?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className={cn('rounded-lg border p-4 shadow-sm', className)}>
      <header className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex min-w-0 items-center gap-2">
          {who}
          {tag}
        </div>
        <Timestamp at={at} />
      </header>
      {children}
    </article>
  );
}

const body = 'whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800';

function AuthorName({ name }: { name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-slate-700">
      <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function TicketTimeline({ ticket }: { ticket: AdminTicket }) {
  const entries = buildEntries(ticket);

  return (
    <section aria-labelledby="timeline-heading" className="space-y-3">
      <h2 id="timeline-heading" className="text-sm font-semibold text-slate-800">
        Conversation
        <span className="ml-2 font-normal text-slate-400">
          {ticket.responses.length} {ticket.responses.length === 1 ? 'reply' : 'replies'} · {ticket.internalNotes.length}{' '}
          internal {ticket.internalNotes.length === 1 ? 'note' : 'notes'}
        </span>
      </h2>

      <Entry
        className="border-slate-200 bg-white"
        who={<AuthorName name={ticket.authorName} />}
        at={ticket.createdAt}
        tag={<Badge tone="neutral">Original query</Badge>}
      >
        <p className={body}>{ticket.description}</p>
        {ticket.attachments.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <AttachmentList attachments={ticket.attachments} />
          </div>
        )}
      </Entry>

      {entries.map((entry) =>
        entry.kind === 'response' && entry.item.from === 'author' ? (
          <Entry
            key={`r-${entry.item.id}`}
            className="border-slate-200 bg-white"
            who={<AuthorName name={entry.item.authorName} />}
            at={entry.at}
            tag={<Badge tone="neutral">Follow-up</Badge>}
          >
            <p className={body}>{entry.item.message}</p>
          </Entry>
        ) : entry.kind === 'response' ? (
          <Entry
            key={`r-${entry.item.id}`}
            className="border-brand-100 bg-brand-50/40 sm:ml-8"
            who={
              <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-brand-700">
                <LifeBuoy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{entry.item.authorName}</span>
              </span>
            }
            at={entry.at}
            tag={
              entry.item.usedAiDraft ? (
                <Badge tone="purple" icon={<Sparkles className="h-3 w-3" aria-hidden />} title="Started from an AI draft">
                  AI-assisted
                </Badge>
              ) : undefined
            }
          >
            <p className={body}>{entry.item.message}</p>
          </Entry>
        ) : (
          <Entry
            key={`n-${entry.item.id}`}
            className="border-yellow-300 bg-yellow-50 sm:ml-8"
            who={
              <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-yellow-900">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{entry.item.authorName}</span>
              </span>
            }
            at={entry.at}
            tag={<Badge tone="yellow">Internal</Badge>}
          >
            <p className={body}>{entry.item.text}</p>
          </Entry>
        ),
      )}

      {entries.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-xs text-slate-500">
          No replies yet. The author is waiting on a first response.
        </p>
      )}
    </section>
  );
}
