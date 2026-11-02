const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const EMPTY = '—';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatINR(value: number | null | undefined): string {
  return isFiniteNumber(value) ? inrFormatter.format(value) : EMPTY;
}

export function formatNumber(value: number | null | undefined): string {
  return isFiniteNumber(value) ? numberFormatter.format(value) : EMPTY;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : EMPTY;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? dateTimeFormatter.format(date) : EMPTY;
}

export function hoursSince(value: string | null | undefined, now = Date.now()): number {
  const date = parseDate(value);
  if (!date) return 0;
  return Math.max(0, (now - date.getTime()) / 3_600_000);
}

export function formatRelative(value: string | null | undefined, now = Date.now()): string {
  const date = parseDate(value);
  if (!date) return EMPTY;
  const minutes = Math.floor((now - date.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 9) return `${weeks}w ago`;
  return formatDate(value);
}

export function formatAge(value: string | null | undefined, now = Date.now()): string {
  const relative = formatRelative(value, now);
  return relative.endsWith(' ago') ? relative.slice(0, -4) : relative;
}

export function formatFileSize(bytes: number): string {
  if (!isFiniteNumber(bytes) || bytes < 0) return EMPTY;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatConfidence(value: number | null | undefined): string | null {
  if (!isFiniteNumber(value)) return null;
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
