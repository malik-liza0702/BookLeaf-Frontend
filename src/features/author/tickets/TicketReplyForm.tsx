import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { errorMessage, isApiError } from '@/api/client';
import type { TicketStatus } from '@/api/types';
import { useToast } from '@/components/toast/useToast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CharCount, Field, Textarea } from '@/components/ui/Field';
import { useSendAuthorReply } from '@/hooks/useTickets';
import { isUnresolved } from '@/lib/tickets';

const MAX_REPLY_LENGTH = 5000;
const FIELD_ID = 'author-reply';

/**
 * Follow-up box under the conversation. Resolved and Closed are final, so it goes
 * away with them, except that unsent text stays on screen (read-only): polling can
 * pick up a status change while the author is still typing.
 */
export function TicketReplyForm({ ticketId, status }: { ticketId: string; status: TicketStatus }) {
  const toast = useToast();
  const reply = useSendAuthorReply(ticketId);
  const [text, setText] = useState('');

  const trimmed = text.trim();
  // 409: resolved in the meantime, or the thread is full. Retrying won't help.
  const conflict = isApiError(reply.error) && reply.error.code === 'CONFLICT';
  const closed = !isUnresolved(status) || conflict;
  const canSubmit = !closed && trimmed.length > 0 && text.length <= MAX_REPLY_LENGTH && !reply.isPending;
  const fieldError =
    isApiError(reply.error) && reply.error.code === 'VALIDATION_ERROR'
      ? reply.error.details.find((d) => d.field === 'message')?.message ?? reply.error.message
      : undefined;

  if (closed && !trimmed) return null;

  const submit = () => {
    if (!canSubmit) return;
    reply.mutate(trimmed, {
      onSuccess: () => {
        setText('');
        toast.success('Reply sent.');
      },
      onError: (error) => {
        if (!(isApiError(error) && (error.code === 'VALIDATION_ERROR' || error.code === 'CONFLICT'))) {
          toast.error(errorMessage(error, 'Could not send your reply.'));
        }
      },
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field
          label="Reply to BookLeaf Support"
          htmlFor={FIELD_ID}
          error={fieldError}
          aside={<CharCount value={text.length} max={MAX_REPLY_LENGTH} />}
        >
          <Textarea
            id={FIELD_ID}
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            readOnly={closed || reply.isPending}
            invalid={Boolean(fieldError) || text.length > MAX_REPLY_LENGTH}
            aria-describedby={fieldError ? `${FIELD_ID}-error` : undefined}
            placeholder="Still need help? Tell our team what's missing…"
          />
        </Field>
        {closed ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            This query can't take more replies, so your message wasn't sent. Copy it if you need it, then{' '}
            <Link to="/author/tickets/new" className="font-medium underline">
              raise a new query
            </Link>
            .
          </p>
        ) : (
          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit} loading={reply.isPending}>
              <Send className="h-4 w-4" aria-hidden />
              Send reply
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
