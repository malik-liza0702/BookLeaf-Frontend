import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { errorMessage, isApiError } from '@/api/client';
import { QUERY_TYPES } from '@/api/types';
import { useBooks } from '@/hooks/useBooks';
import { useCreateTicket } from '@/hooks/useTickets';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CharCount, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { AttachmentPicker } from './AttachmentPicker';

// Limits mirror the contract: subject 3-150, description 10-5000.
const SUBJECT_MIN = 3;
const SUBJECT_MAX = 150;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 5000;

const ticketSchema = z.object({
  /** Book.bookId, or '' for a general/account-level query. */
  bookId: z.string(),
  queryType: z.enum(QUERY_TYPES, { message: 'Choose the type of query' }),
  subject: z
    .string()
    .trim()
    .min(SUBJECT_MIN, `Subject must be at least ${SUBJECT_MIN} characters`)
    .max(SUBJECT_MAX, `Subject must be at most ${SUBJECT_MAX} characters`),
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, `Please describe the issue in at least ${DESCRIPTION_MIN} characters`)
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX.toLocaleString('en-IN')} characters`),
});
type TicketFormValues = z.infer<typeof ticketSchema>;

/** Contract field names -> our form field names. */
const SERVER_FIELD_MAP: Record<string, keyof TicketFormValues> = {
  bookId: 'bookId',
  queryType: 'queryType',
  subject: 'subject',
  description: 'description',
};

export function NewTicketPage() {
  const navigate = useNavigate();

  const books = useBooks();
  const createTicket = useCreateTicket();
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { bookId: '', subject: '', description: '' },
  });

  const subjectLength = watch('subject').length;
  const descriptionLength = watch('description').length;

  const onSubmit = async (values: TicketFormValues) => {
    setFormError(null);
    try {
      const ticket = await createTicket.mutateAsync({
        bookId: values.bookId || null,
        queryType: values.queryType,
        subject: values.subject,
        description: values.description,
        attachments: files.map((f) => ({ name: f.name, size: f.size })),
      });
      navigate(`/author/tickets/${ticket.id}`, { state: { justCreated: true } });
    } catch (error) {
      if (isApiError(error) && error.code === 'VALIDATION_ERROR' && error.details.length > 0) {
        const unmapped: string[] = [];
        for (const detail of error.details) {
          const field = SERVER_FIELD_MAP[detail.field];
          if (field) setError(field, { type: 'server', message: detail.message });
          else unmapped.push(detail.message);
        }
        setFormError(unmapped.length ? unmapped.join(' ') : 'Please fix the highlighted fields.');
      } else {
        setFormError(errorMessage(error, 'Could not submit your query. Please try again.'));
      }
    }
  };

  const submitting = createTicket.isPending;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/author/tickets" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        My queries
      </Link>
      <PageHeader
        title="Raise a query"
        description="Tell us what's going on. The more detail you share (order IDs, dates, platforms), the faster we can help."
      />
      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {formError}
            </div>
          )}

          <Field
            label="Book"
            htmlFor="bookId"
            error={errors.bookId?.message}
            hint={
              books.isError
                ? "We couldn't load your books. You can still submit this as a general query."
                : 'Choose the book this query is about, or keep General for account-level questions.'
            }
          >
            <Select
              id="bookId"
              invalid={Boolean(errors.bookId)}
              disabled={submitting || books.isPending}
              aria-describedby={errors.bookId ? 'bookId-error' : undefined}
              {...register('bookId')}
            >
              <option value="">General / Account Level</option>
              {books.data?.map((book) => (
                <option key={book.id} value={book.bookId}>
                  {book.title} ({book.bookId})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Type of query" htmlFor="queryType" error={errors.queryType?.message}>
            <Select
              id="queryType"
              invalid={Boolean(errors.queryType)}
              disabled={submitting}
              aria-describedby={errors.queryType ? 'queryType-error' : undefined}
              {...register('queryType')}
            >
              <option value="">Select a type…</option>
              {QUERY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Subject"
            htmlFor="subject"
            error={errors.subject?.message}
            aside={<CharCount value={subjectLength} max={SUBJECT_MAX} min={SUBJECT_MIN} />}
          >
            <Input
              id="subject"
              placeholder="e.g. Royalty for October not received"
              maxLength={SUBJECT_MAX + 20}
              invalid={Boolean(errors.subject)}
              disabled={submitting}
              aria-describedby={errors.subject ? 'subject-error' : undefined}
              {...register('subject')}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
            aside={<CharCount value={descriptionLength} max={DESCRIPTION_MAX} min={DESCRIPTION_MIN} />}
          >
            <Textarea
              id="description"
              rows={8}
              placeholder="Describe the issue, what you expected, and anything you've already tried."
              invalid={Boolean(errors.description)}
              disabled={submitting}
              aria-describedby={errors.description ? 'description-error' : undefined}
              {...register('description')}
            />
          </Field>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Attachments</span>
            <AttachmentPicker files={files} onChange={setFiles} disabled={submitting} />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {submitting ? 'Submitting…' : 'Submit query'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
