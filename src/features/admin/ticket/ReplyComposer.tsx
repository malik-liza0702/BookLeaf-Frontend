import { useState, type KeyboardEvent } from 'react';
import { AlertTriangle, CheckCircle2, PencilLine, RefreshCw, Send, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { errorMessage, isApiError } from '@/api/client';
import type { AdminTicket, TicketStatus } from '@/api/types';
import { useToast } from '@/components/toast/useToast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CharCount, Field, Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/format';
import { isUnresolved } from '@/lib/tickets';
import { MAX_REPLY_LENGTH, MAX_SUGGESTIONS_LENGTH, useReplyComposer, type DraftNotice } from './useReplyComposer';

const TEXTAREA_ID = 'admin-reply';
const SUGGESTIONS_ID = 'admin-draft-suggestions';

/** What the admin is about to send; null when no confirmation is open. */
type PendingSend = { status?: TicketStatus } | null;

function DraftNoticeBar({
  notice,
  onRetry,
  onRequest,
}: {
  notice: DraftNotice;
  onRetry: () => void;
  onRequest: () => void;
}) {
  switch (notice.kind) {
    case 'loading':
      return (
        <div className="space-y-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2.5" role="status">
          <p className="flex items-center gap-2 text-xs font-medium text-violet-800">
            <Spinner className="h-3.5 w-3.5" />
            Drafting a reply from the ticket and support policies… You can start typing; your text won't be replaced.
          </p>
          <Skeleton className="h-2.5 w-11/12 bg-violet-200/70" />
          <Skeleton className="h-2.5 w-4/5 bg-violet-200/70" />
          <Skeleton className="h-2.5 w-2/3 bg-violet-200/70" />
        </div>
      );
    case 'revising':
      return (
        <p className="flex items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-medium text-violet-800" role="status">
          <Spinner className="h-3.5 w-3.5" />
          Updating the draft with your suggestions…
        </p>
      );
    case 'unavailable':
    case 'error':
      return (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p className="flex-1">
            {notice.kind === 'unavailable'
              ? 'AI draft unavailable. Write your reply manually.'
              : `${notice.message} You can still write your reply manually.`}
          </p>
          <button type="button" onClick={onRetry} className="shrink-0 font-medium underline hover:no-underline">
            Try again
          </button>
        </div>
      );
    case 'fallback':
      return (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p>
            <strong>AI unavailable: template starter.</strong> This draft was built from the ticket's facts, not
            written by the AI. Edit it before sending.
          </p>
        </div>
      );
    case 'not-requested':
      return (
        <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span>Resolved and closed tickets don't get an automatic AI draft.</span>
          <Button size="sm" variant="secondary" onClick={onRequest}>
            <Wand2 className="h-3.5 w-3.5" aria-hidden />
            Generate draft
          </Button>
        </div>
      );
    case 'none':
      return null;
  }
}

/** Automated checks from the backend (unverified ₹ amounts/dates, unfilled placeholders). */
function DraftWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
      <p className="mb-1 flex items-center gap-1.5 font-semibold">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Check before sending
      </p>
      <ul className="list-disc space-y-0.5 pl-5">
        {warnings.map((warning, i) => (
          <li key={i}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

function placeholderSummary(placeholders: string[]): string {
  const count = placeholders.length;
  return `${count} unfilled ${count === 1 ? 'placeholder' : 'placeholders'}: ${placeholders.join(', ')}`;
}

/** Lets the admin tell the AI what to change; the updated draft replaces the reply text. */
function SuggestChangesPanel({
  composer,
  onSubmit,
}: {
  composer: ReturnType<typeof useReplyComposer>;
  onSubmit: () => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    } else if (event.key === 'Escape' && !composer.isRevising) {
      composer.closeSuggestions();
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2.5">
      <Field
        label="What should change?"
        htmlFor={SUGGESTIONS_ID}
        error={composer.reviseError ? `${errorMessage(composer.reviseError, 'Could not update the draft.')} Your text is unchanged.` : undefined}
        hint="The AI rewrites the reply above using these suggestions. It treats any facts you give here as correct."
        aside={<CharCount value={composer.suggestions.length} max={MAX_SUGGESTIONS_LENGTH} />}
      >
        <Textarea
          id={SUGGESTIONS_ID}
          rows={3}
          autoFocus
          value={composer.suggestions}
          onChange={(e) => composer.setSuggestions(e.target.value)}
          onKeyDown={onKeyDown}
          readOnly={composer.isRevising}
          invalid={composer.suggestions.length > MAX_SUGGESTIONS_LENGTH}
          aria-describedby={composer.reviseError ? `${SUGGESTIONS_ID}-error` : undefined}
          placeholder="e.g. Sound more apologetic, and say the reprint ships this week."
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={composer.closeSuggestions} disabled={composer.isRevising}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSubmit} loading={composer.isRevising} disabled={!composer.canSubmitSuggestions}>
          {!composer.isRevising && <Wand2 className="h-3.5 w-3.5" aria-hidden />}
          Update draft
        </Button>
      </div>
    </div>
  );
}

export function ReplyComposer({ ticket }: { ticket: AdminTicket }) {
  const toast = useToast();
  const composer = useReplyComposer(ticket);
  const [pending, setPending] = useState<PendingSend>(null);

  const fieldError =
    isApiError(composer.sendError) && composer.sendError.code === 'VALIDATION_ERROR'
      ? composer.sendError.details.find((d) => d.field === 'message')?.message ?? composer.sendError.message
      : undefined;

  const confirmRegenerate = () => {
    const hasOwnText = composer.text.trim() && (!composer.usedAiDraft || composer.editedDraft);
    if (hasOwnText && !window.confirm('Replace your current text with a fresh AI draft?')) return;
    composer.regenerateDraft();
  };

  const submitSuggestions = async () => {
    if (!composer.canSubmitSuggestions) return;
    try {
      await composer.reviseDraft();
      toast.success('Draft updated with your suggestions.');
    } catch {
      // Shown inside the panel, which stays open with the suggestions so the admin can retry.
    }
  };

  const openConfirm = (next: NonNullable<PendingSend>) => {
    if (composer.canSend) setPending(next);
  };

  const submit = async () => {
    if (!pending) return;
    try {
      await composer.sendReply(pending.status);
      toast.success(pending.status ? `Reply sent and ticket marked ${pending.status}.` : 'Reply sent to the author.');
    } catch (error) {
      if (!(isApiError(error) && error.code === 'VALIDATION_ERROR')) toast.error(errorMessage(error, 'Could not send the reply.'));
    } finally {
      setPending(null);
    }
  };

  // Ctrl/Cmd+Enter opens the send confirmation; Escape cancels it.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      openConfirm({});
    } else if (event.key === 'Escape' && pending) {
      setPending(null);
    }
  };

  const showResolve = ticket.status !== 'Resolved' && ticket.status !== 'Closed';
  const draft = composer.draft;
  const hasPlaceholders = composer.placeholders.length > 0;

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={TEXTAREA_ID} className="text-sm font-semibold text-slate-800">
          Reply to {ticket.authorName}
        </label>
        {composer.usedAiDraft && draft && (
          <div className="flex items-center gap-1.5">
            <Badge
              tone="purple"
              icon={<Sparkles className="h-3 w-3" aria-hidden />}
              title={`Generated ${formatDateTime(draft.generatedAt)}${draft.model ? ` by ${draft.model}` : ''}`}
            >
              AI draft: review before sending
            </Badge>
            {composer.editedDraft && <Badge tone="neutral">Edited</Badge>}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <DraftNoticeBar notice={composer.notice} onRetry={composer.retryDraft} onRequest={composer.requestDraft} />
        <DraftWarnings warnings={composer.draftWarnings} />

        <Textarea
          id={TEXTAREA_ID}
          rows={10}
          value={composer.text}
          onChange={(e) => composer.setText(e.target.value)}
          onKeyDown={onKeyDown}
          readOnly={composer.isRevising}
          invalid={Boolean(fieldError) || composer.text.length > MAX_REPLY_LENGTH}
          aria-describedby={fieldError ? `${TEXTAREA_ID}-error` : undefined}
          placeholder="Write a reply the author will see on their ticket…"
          className="leading-relaxed"
        />
        <div className="flex items-center justify-between gap-2">
          {fieldError ? (
            <p id={`${TEXTAREA_ID}-error`} className="text-xs text-red-600" role="alert">
              {fieldError}
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              {ticket.status === 'Open' ? 'Sending moves this ticket to In Progress. ' : ''}Ctrl/⌘ + Enter to send.
            </p>
          )}
          <CharCount value={composer.text.length} max={MAX_REPLY_LENGTH} />
        </div>
        {hasPlaceholders && !pending && (
          <p className="flex items-start gap-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="break-words">{placeholderSummary(composer.placeholders)}. Fill these in before sending.</span>
          </p>
        )}

        {composer.isSuggesting && composer.usedAiDraft && !pending && (
          <SuggestChangesPanel composer={composer} onSubmit={submitSuggestions} />
        )}

        {pending ? (
          <div
            className="flex flex-col gap-2 rounded-md border border-brand-100 bg-brand-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            role="alertdialog"
            aria-label="Confirm send"
          >
            <div className="text-sm text-slate-800">
              <p>
                Send this reply to <strong>{ticket.authorName}</strong>
                {pending.status ? <> and mark the ticket <strong>{pending.status}</strong></> : null}? They'll see it
                right away.
              </p>
              {hasPlaceholders && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  It still contains {placeholderSummary(composer.placeholders)}.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPending(null)} disabled={composer.isSending}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} loading={composer.isSending} autoFocus>
                <Send className="h-3.5 w-3.5" aria-hidden />
                {hasPlaceholders ? 'Send anyway' : 'Confirm & send'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {composer.canInsertDraft && (
                <Button size="sm" variant="ghost" onClick={composer.insertDraft}>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Use AI draft
                </Button>
              )}
              {(draft || composer.notice.kind === 'unavailable' || composer.notice.kind === 'error') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={confirmRegenerate}
                  loading={composer.isRegenerating}
                  disabled={composer.isRevising}
                >
                  {!composer.isRegenerating && <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
                  Regenerate
                </Button>
              )}
              {composer.usedAiDraft && !composer.isSuggesting && (
                <Button size="sm" variant="ghost" onClick={composer.openSuggestions} disabled={composer.isRegenerating}>
                  <PencilLine className="h-3.5 w-3.5" aria-hidden />
                  Suggest changes
                </Button>
              )}
              {composer.text && (
                <Button size="sm" variant="ghost" onClick={composer.discard} disabled={composer.isRevising}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Discard
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {showResolve && (
                <Button
                  variant="secondary"
                  onClick={() => openConfirm({ status: 'Resolved' })}
                  disabled={!composer.canSend}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Send &amp; mark Resolved
                </Button>
              )}
              <Button onClick={() => openConfirm({})} disabled={!composer.canSend}>
                <Send className="h-4 w-4" aria-hidden />
                Send reply
              </Button>
            </div>
          </div>
        )}
        {!isUnresolved(ticket.status) && (
          <p className="text-xs text-slate-400">
            This ticket is {ticket.status.toLowerCase()}. Replying keeps its status unless you change it in the panel.
          </p>
        )}
      </div>
    </Card>
  );
}
