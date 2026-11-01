import { useEffect, useRef, useState } from 'react';
import { isApiError } from '@/api/client';
import type { AdminTicket, AiDraft, TicketStatus } from '@/api/types';
import { useAiDraft, useRegenerateAiDraft, useReviseAiDraft, useSendResponse } from '@/hooks/useTickets';
import { isUnresolved } from '@/lib/tickets';

export const MAX_REPLY_LENGTH = 5000;
export const MAX_SUGGESTIONS_LENGTH = 1000;

/** Drafts mark facts the model couldn't verify as `[confirm: …]` for the admin to fill in. */
const PLACEHOLDER_PATTERN = /\[confirm:[^\]]*\]/gi;

export function findPlaceholders(text: string): string[] {
  return text.match(PLACEHOLDER_PATTERN) ?? [];
}

/** Where the composer text came from. Drives the `usedAiDraft` flag. */
type Origin = 'ai' | 'manual';

interface ComposerState {
  text: string;
  origin: Origin;
}

const EMPTY: ComposerState = { text: '', origin: 'manual' };

/**
 * What the composer should tell the admin about the AI draft. Every state
 * except `loading` leaves the composer fully usable: AI never blocks a reply.
 */
export type DraftNotice =
  | { kind: 'loading' }
  | { kind: 'revising' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'fallback' }
  | { kind: 'not-requested' }
  | { kind: 'none' };

function noticeFromError(error: unknown): DraftNotice {
  if (isApiError(error) && (error.code === 'AI_UNAVAILABLE' || error.code === 'RATE_LIMITED')) {
    return { kind: 'unavailable', message: error.message };
  }
  return { kind: 'error', message: isApiError(error) ? error.message : 'Could not load the AI draft.' };
}

/**
 * State for the admin reply composer.
 *
 * Rules:
 * - The AI draft is requested automatically for unresolved tickets only;
 *   resolved/closed tickets get an explicit "Generate" button.
 * - A draft is inserted automatically only into an empty composer, so a draft
 *   that lands late (or a poll refetch) never overwrites what the admin typed.
 * - `usedAiDraft` stays true while the text started from the draft, even after
 *   edits; clearing the composer or discarding resets it.
 * - Suggesting changes revises the current text, including the admin's edits. If
 *   the revision fails, the text stays as it was.
 */
export function useReplyComposer(ticket: AdminTicket) {
  const [requested, setRequested] = useState(false);
  const wantsDraft = isUnresolved(ticket.status) || requested;
  // A draft already cached on the ticket seeds the query, so no POST is made.
  const draftQuery = useAiDraft(ticket.id, wantsDraft, ticket.aiDraft);
  const regenerate = useRegenerateAiDraft(ticket.id);
  const revise = useReviseAiDraft(ticket.id);
  const send = useSendResponse(ticket.id);

  const [composer, setComposer] = useState<ComposerState>(EMPTY);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState('');
  // generatedAt of the last draft we auto-inserted, so each draft is offered once.
  const insertedFor = useRef<string | null>(null);

  const draft: AiDraft | null = draftQuery.data ?? null;
  const { refetch: refetchDraft } = draftQuery;

  // On resolved/closed tickets a cached draft is offered ("Use AI draft"), not inserted.
  useEffect(() => {
    if (!draft || !wantsDraft || insertedFor.current === draft.generatedAt) return;
    insertedFor.current = draft.generatedAt;
    setComposer((current) => (current.text.trim() ? current : { text: draft.text, origin: 'ai' }));
  }, [draft, wantsDraft]);

  // An author follow-up clears the server's cached draft, so a draft we hold from
  // before it is out of date. Text the admin has edited stays; the rest is replaced.
  const lastFollowUpAt = ticket.responses.filter((response) => response.from === 'author').at(-1)?.createdAt;
  const draftIsStale = Boolean(draft && lastFollowUpAt && new Date(draft.generatedAt) < new Date(lastFollowUpAt));
  useEffect(() => {
    if (!draftIsStale || !wantsDraft) return;
    setComposer((current) => (current.origin === 'ai' && current.text === draft?.text ? EMPTY : current));
    void refetchDraft();
  }, [draftIsStale, wantsDraft, draft, refetchDraft]);

  const setText = (text: string) =>
    setComposer((current) => ({ text, origin: text.trim() ? current.origin : 'manual' }));

  const insertDraft = () => {
    if (draft) setComposer({ text: draft.text, origin: 'ai' });
  };

  const closeSuggestions = () => {
    setIsSuggesting(false);
    setSuggestions('');
    revise.reset();
  };

  const discard = () => {
    setComposer(EMPTY);
    closeSuggestions();
  };

  const reviseDraft = async () => {
    const next = await revise.mutateAsync({ previousDraft: composer.text.trim(), suggestions: suggestions.trim() });
    insertedFor.current = next.generatedAt;
    setComposer({ text: next.text, origin: 'ai' });
    closeSuggestions();
  };

  const regenerateDraft = () => {
    regenerate.mutate(undefined, {
      onSuccess: (next) => {
        insertedFor.current = next.generatedAt;
        setComposer({ text: next.text, origin: 'ai' });
      },
    });
  };

  const sendReply = async (status?: TicketStatus) => {
    await send.mutateAsync({ message: composer.text.trim(), usedAiDraft: composer.origin === 'ai', status });
    setComposer(EMPTY);
    closeSuggestions();
  };

  let notice: DraftNotice;
  if (revise.isPending) notice = { kind: 'revising' };
  else if (draftQuery.isFetching || regenerate.isPending) notice = { kind: 'loading' };
  else if (regenerate.isError) notice = noticeFromError(regenerate.error);
  else if (draftQuery.isError) notice = noticeFromError(draftQuery.error);
  else if (!draftQuery.isFetched && !draft) notice = { kind: 'not-requested' };
  else if (draft?.fallback) notice = { kind: 'fallback' };
  else notice = { kind: 'none' };

  const trimmedLength = composer.text.trim().length;

  return {
    text: composer.text,
    setText,
    usedAiDraft: composer.origin === 'ai',
    /** True when the admin has changed the AI text before sending. */
    editedDraft: composer.origin === 'ai' && draft !== null && composer.text !== draft.text,
    draft,
    /** Backend checks on the draft; only relevant while the text came from it. */
    draftWarnings: composer.origin === 'ai' ? draft?.warnings ?? [] : [],
    /** `[confirm: …]` placeholders still present in the composer text. */
    placeholders: findPlaceholders(composer.text),
    notice,
    canInsertDraft: draft !== null && composer.origin !== 'ai',
    insertDraft,
    discard,
    requestDraft: () => setRequested(true),
    retryDraft: () => {
      regenerate.reset();
      void draftQuery.refetch();
    },
    regenerateDraft,
    isRegenerating: regenerate.isPending,
    isSuggesting,
    openSuggestions: () => setIsSuggesting(true),
    closeSuggestions,
    suggestions,
    setSuggestions,
    reviseDraft,
    isRevising: revise.isPending,
    reviseError: revise.error,
    canSubmitSuggestions:
      suggestions.trim().length > 0 &&
      suggestions.length <= MAX_SUGGESTIONS_LENGTH &&
      trimmedLength > 0 &&
      composer.text.length <= MAX_REPLY_LENGTH &&
      !revise.isPending &&
      !regenerate.isPending,
    sendReply,
    isSending: send.isPending,
    sendError: send.error,
    canSend: trimmedLength > 0 && composer.text.length <= MAX_REPLY_LENGTH && !send.isPending && !revise.isPending,
  };
}
