import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketSort,
  type TicketStatus,
} from '@/api/types';
import { useAdminUsers } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { formatDate, formatNumber } from '@/lib/format';
import type { QueueFilterState } from './useQueueFilters';

const SORT_LABELS: Record<TicketSort, string> = {
  urgency: 'Urgency (recommended)',
  newest: 'Newest first',
  oldest: 'Oldest first',
};

// Same hues as StatusPill and PriorityBadge, so a pill reads like the rows below.
const STATUS_DOTS: Record<TicketStatus, string> = {
  Open: 'bg-blue-500',
  'In Progress': 'bg-violet-500',
  Resolved: 'bg-emerald-500',
  Closed: 'bg-slate-400',
};

const PRIORITY_DOTS: Record<TicketPriority, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-slate-400',
};

// The important modifier beats the base control's border and background classes.
const ACTIVE_CONTROL = '!border-brand-500 !bg-brand-50';

interface QueueFiltersProps {
  state: QueueFilterState;
  /** Tickets matching the current filters; undefined until they have loaded. */
  resultCount?: number;
  onChange: (patch: Partial<QueueFilterState>) => void;
  onReset: () => void;
}

function FilterLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-slate-500">
      {children}
    </label>
  );
}

interface PillGroupProps<T extends string> {
  id: string;
  label: string;
  value: T | '';
  options: readonly T[];
  dots: Record<T, string>;
  onChange: (value: T | '') => void;
}

/** Every value is one click away; the API only takes one, so it picks a single option. */
function PillGroup<T extends string>({ id, label, value, options, dots, onChange }: PillGroupProps<T>) {
  const pills: ReadonlyArray<T | ''> = ['', ...options];
  return (
    <div role="group" aria-labelledby={id}>
      <span id={id} className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {pills.map((pill) => {
          const selected = pill === value;
          return (
            <button
              key={pill || 'all'}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(pill)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                // "All" is the resting state, so only a real filter gets the brand colour.
                !selected && 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                selected && (pill ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-300 bg-slate-100 text-slate-800'),
              )}
            >
              {pill && <span className={cn('h-1.5 w-1.5 rounded-full', dots[pill])} aria-hidden />}
              {pill || 'All'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter ${label}`}
      className={cn(
        'inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-white pl-2.5 pr-1.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-100',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
      )}
    >
      <span className="max-w-[16rem] truncate">{label}</span>
      <X className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}

/** Date inputs hold local "YYYY-MM-DD"; a bare date would parse as UTC and can show the day before. */
function formatFilterDate(date: string): string {
  return formatDate(`${date}T00:00:00`);
}

function createdLabel(from: string, to: string): string {
  if (from && to) return `Created: ${formatFilterDate(from)} – ${formatFilterDate(to)}`;
  return from ? `Created from ${formatFilterDate(from)}` : `Created until ${formatFilterDate(to)}`;
}

export function QueueFilters({ state, resultCount, onChange, onReset }: QueueFiltersProps) {
  const admins = useAdminUsers();

  // The search box is local state so typing stays snappy; the URL (and the
  // API request) only updates once the admin pauses.
  const [search, setSearch] = useState(state.q);
  const lastPushed = useRef(state.q);
  useEffect(() => {
    // Only sync from the URL on external changes (Clear, back button), never
    // because of our own debounced push, so in-progress typing isn't lost.
    if (state.q !== lastPushed.current) {
      lastPushed.current = state.q;
      setSearch(state.q);
    }
  }, [state.q]);
  useEffect(() => {
    if (search === lastPushed.current) return;
    const id = window.setTimeout(() => {
      lastPushed.current = search;
      onChange({ q: search });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search, onChange]);

  const assigneeLabel =
    state.assignedTo === 'me'
      ? 'Assigned to me'
      : state.assignedTo === 'unassigned'
        ? 'Unassigned'
        : `Assignee: ${admins.data?.find((a) => a.id === state.assignedTo)?.name ?? 'Team member'}`;

  const chips: Array<{ label: string; clear: Partial<QueueFilterState> }> = [];
  if (state.q) chips.push({ label: `Subject: "${state.q}"`, clear: { q: '' } });
  if (state.status) chips.push({ label: `Status: ${state.status}`, clear: { status: '' } });
  if (state.priority) chips.push({ label: `Priority: ${state.priority}`, clear: { priority: '' } });
  if (state.category) chips.push({ label: state.category, clear: { category: '' } });
  if (state.assignedTo) chips.push({ label: assigneeLabel, clear: { assignedTo: '' } });
  if (state.from || state.to) chips.push({ label: createdLabel(state.from, state.to), clear: { from: '', to: '' } });
  if (state.sort !== 'urgency') chips.push({ label: `Sort: ${SORT_LABELS[state.sort]}`, clear: { sort: 'urgency' } });

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="f-q" className="sr-only">Search subject</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              id="f-q"
              type="search"
              placeholder="Search subject, e.g. royalty, ISBN…"
              className={cn('pl-9', state.q && ACTIVE_CONTROL)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="f-sort" className="shrink-0 text-xs font-medium text-slate-500">Sort by</label>
            <Select id="f-sort" className="sm:w-56" value={state.sort} onChange={(e) => onChange({ sort: e.target.value as TicketSort })}>
              {(Object.keys(SORT_LABELS) as TicketSort[]).map((s) => (
                <option key={s} value={s}>{SORT_LABELS[s]}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <PillGroup id="f-status" label="Status" value={state.status} options={TICKET_STATUSES} dots={STATUS_DOTS} onChange={(status) => onChange({ status })} />
          <PillGroup id="f-priority" label="Priority" value={state.priority} options={TICKET_PRIORITIES} dots={PRIORITY_DOTS} onChange={(priority) => onChange({ priority })} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <FilterLabel htmlFor="f-category">Category</FilterLabel>
            <Select
              id="f-category"
              className={state.category ? ACTIVE_CONTROL : undefined}
              value={state.category}
              onChange={(e) => onChange({ category: e.target.value as QueueFilterState['category'] })}
            >
              <option value="">All categories</option>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <FilterLabel htmlFor="f-assignee">Assignee</FilterLabel>
            <Select
              id="f-assignee"
              className={state.assignedTo ? ACTIVE_CONTROL : undefined}
              value={state.assignedTo}
              onChange={(e) => onChange({ assignedTo: e.target.value })}
            >
              <option value="">Everyone</option>
              <option value="me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
              {admins.data && admins.data.length > 0 && (
                <optgroup label="Team">
                  {admins.data.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </optgroup>
              )}
            </Select>
          </div>
          <div role="group" aria-labelledby="f-created" className="sm:col-span-2 lg:col-span-1">
            <span id="f-created" className="mb-1 block text-xs font-medium text-slate-500">Created between</span>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Created from"
                type="date"
                className={cn('min-w-0', state.from && ACTIVE_CONTROL)}
                value={state.from}
                max={state.to || undefined}
                onChange={(e) => onChange({ from: e.target.value })}
              />
              <span className="text-xs text-slate-400" aria-hidden>to</span>
              <Input
                aria-label="Created to"
                type="date"
                className={cn('min-w-0', state.to && ACTIVE_CONTROL)}
                value={state.to}
                min={state.from || undefined}
                onChange={(e) => onChange({ to: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-b-lg border-t border-slate-200 bg-slate-50 px-3 py-2">
          {resultCount !== undefined && (
            <span className="mr-1 text-xs font-medium tabular-nums text-slate-600" aria-live="polite">
              {formatNumber(resultCount)} {resultCount === 1 ? 'ticket' : 'tickets'}
            </span>
          )}
          {chips.map((chip) => (
            <FilterChip key={chip.label} label={chip.label} onRemove={() => onChange(chip.clear)} />
          ))}
          <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto">
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
