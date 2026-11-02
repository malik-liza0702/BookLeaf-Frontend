import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { errorMessage, isApiError } from '@/api/client';
import { useToast } from '@/components/toast/useToast';
import { Button } from '@/components/ui/Button';
import { CharCount, Textarea } from '@/components/ui/Field';
import { useAddNote } from '@/hooks/useTickets';

const MAX_NOTE_LENGTH = 2000;
const FIELD_ID = 'internal-note';

export function InternalNoteForm({ ticketId }: { ticketId: string }) {
  const toast = useToast();
  const addNote = useAddNote(ticketId);
  const [text, setText] = useState('');

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && text.length <= MAX_NOTE_LENGTH && !addNote.isPending;
  const fieldError =
    isApiError(addNote.error) && addNote.error.code === 'VALIDATION_ERROR'
      ? addNote.error.details.find((d) => d.field === 'text')?.message ?? addNote.error.message
      : undefined;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    addNote.mutate(trimmed, {
      onSuccess: () => {
        setText('');
        toast.success('Internal note added.');
      },
      onError: (error) => {
        if (!(isApiError(error) && error.code === 'VALIDATION_ERROR')) toast.error(errorMessage(error, 'Could not add the note.'));
      },
    });
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={FIELD_ID} className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-900">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Internal note
        </label>
        <span className="text-xs font-medium text-yellow-800">Not visible to the author</span>
      </div>
      <Textarea
        id={FIELD_ID}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        invalid={Boolean(fieldError) || text.length > MAX_NOTE_LENGTH}
        aria-describedby={fieldError ? `${FIELD_ID}-error` : undefined}
        placeholder="Context for the team, e.g. checked bank details, escalated to production…"
        className="border-yellow-300 bg-white"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        {fieldError ? (
          <p id={`${FIELD_ID}-error`} className="text-xs text-red-600" role="alert">
            {fieldError}
          </p>
        ) : (
          <CharCount value={text.length} max={MAX_NOTE_LENGTH} />
        )}
        <Button type="submit" size="sm" variant="secondary" disabled={!canSubmit} loading={addNote.isPending}>
          Add note
        </Button>
      </div>
    </form>
  );
}
