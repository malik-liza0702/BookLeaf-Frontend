import { useState } from 'react';
import { Save, UserCheck } from 'lucide-react';
import { errorMessage } from '@/api/client';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type AdminTicket,
  type TicketStatus,
  type UpdateTicketRequest,
} from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/toast/useToast';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { useAdminUsers } from '@/hooks/useAdmin';
import { useUpdateTicket } from '@/hooks/useTickets';
import { formatDateTime, formatRelative } from '@/lib/format';
import { ClassificationControl } from './ClassificationControl';

const UNASSIGNED = '';

function TimingRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-700" title={value ? formatDateTime(value) : undefined}>
        {value ? formatRelative(value) : 'Not yet'}
      </dd>
    </div>
  );
}

export function ManagementPanel({ ticket }: { ticket: AdminTicket }) {
  const { user } = useAuth();
  const toast = useToast();
  const update = useUpdateTicket(ticket.id);
  const admins = useAdminUsers();

  const [draft, setDraft] = useState<UpdateTicketRequest>({});

  const edit = (fields: UpdateTicketRequest) => setDraft((current) => ({ ...current, ...fields }));

  const status = draft.status ?? ticket.status;
  const category = draft.category === undefined ? ticket.category : draft.category ?? ticket.aiCategory ?? ticket.category;
  const priority = draft.priority === undefined ? ticket.priority : draft.priority ?? ticket.aiPriority ?? ticket.priority;
  const assigneeId = draft.assignedTo === undefined ? ticket.assignedTo?.id ?? null : draft.assignedTo;

  const changes: UpdateTicketRequest = {
    ...(status !== ticket.status && { status }),
    ...(category !== ticket.category && { category: draft.category }),
    ...(priority !== ticket.priority && { priority: draft.priority }),
    ...(assigneeId !== (ticket.assignedTo?.id ?? null) && { assignedTo: assigneeId }),
  };
  const hasChanges = Object.keys(changes).length > 0;

  const save = () =>
    update.mutate(changes, {
      onSuccess: () => {
        setDraft({});
        toast.success('Ticket changes saved.');
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not update the ticket.')),
    });

  const assignedToMe = assigneeId === user?.id;
  const assigneeOptions = [...(admins.data ?? [])];
  for (const person of [ticket.assignedTo, user]) {
    if (person && !assigneeOptions.some((a) => a.id === person.id)) {
      assigneeOptions.push({ id: person.id, name: person.name, email: '' });
    }
  }

  return (
    <Card>
      <CardHeader title="Manage ticket" />
      <div className="space-y-5 p-4">
        <div className="space-y-1.5">
          <label htmlFor="ticket-status" className="text-sm font-medium text-slate-700">
            Status
          </label>
          <Select
            id="ticket-status"
            value={status}
            disabled={update.isPending}
            onChange={(e) => edit({ status: e.target.value as TicketStatus })}
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="ticket-assignee" className="text-sm font-medium text-slate-700">
              Assignee
            </label>
            {!assignedToMe && (
              <Button size="sm" variant="ghost" className="-mr-2" disabled={update.isPending} onClick={() => edit({ assignedTo: user?.id })}>
                <UserCheck className="h-3.5 w-3.5" aria-hidden />
                Assign to me
              </Button>
            )}
          </div>
          <Select
            id="ticket-assignee"
            value={assigneeId ?? UNASSIGNED}
            disabled={update.isPending}
            onChange={(e) => edit({ assignedTo: e.target.value === UNASSIGNED ? null : e.target.value })}
          >
            <option value={UNASSIGNED}>Unassigned</option>
            {assigneeOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.id === user?.id ? ' (you)' : ''}
              </option>
            ))}
          </Select>
          {admins.isError && <p className="text-xs text-amber-700">Couldn't load the admin list. "Assign to me" still works.</p>}
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-4">
          <ClassificationControl
            id="ticket-category"
            label="Category"
            value={category}
            options={TICKET_CATEGORIES}
            aiValue={ticket.aiCategory}
            aiStatus={ticket.aiStatus}
            aiConfidence={ticket.aiConfidence}
            overridden={Boolean(draft.category) || ticket.categoryOverridden}
            disabled={update.isPending}
            onChange={(next) => edit({ category: next })}
            onReset={() => edit({ category: null })}
          />
          <ClassificationControl
            id="ticket-priority"
            label="Priority"
            value={priority}
            options={TICKET_PRIORITIES}
            aiValue={ticket.aiPriority}
            aiStatus={ticket.aiStatus}
            aiConfidence={ticket.aiConfidence}
            overridden={Boolean(draft.priority) || ticket.priorityOverridden}
            disabled={update.isPending}
            onChange={(next) => edit({ priority: next })}
            onReset={() => edit({ priority: null })}
          />
          {ticket.aiReasoning && ticket.aiStatus !== 'pending' && (
            <div className="rounded-md bg-violet-50 px-3 py-2 text-xs text-violet-900">
              <p className="mb-0.5 font-medium">{ticket.aiStatus === 'failed' ? 'Rules note' : 'AI reasoning'}</p>
              <p className="leading-relaxed">{ticket.aiReasoning}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          {hasChanges ? (
            <p className="text-xs font-medium text-amber-700" role="status">
              Unsaved changes
            </p>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {hasChanges && (
              <Button size="sm" variant="ghost" onClick={() => setDraft({})} disabled={update.isPending}>
                Discard
              </Button>
            )}
            <Button size="sm" onClick={save} loading={update.isPending} disabled={!hasChanges}>
              {!update.isPending && <Save className="h-3.5 w-3.5" aria-hidden />}
              Save changes
            </Button>
          </div>
        </div>

        <dl className="space-y-1.5 border-t border-slate-100 pt-4 text-xs">
          <TimingRow label="Created" value={ticket.createdAt} />
          <TimingRow label="Last activity" value={ticket.updatedAt} />
          <TimingRow label="Resolved" value={ticket.resolvedAt} />
        </dl>
      </div>
    </Card>
  );
}
