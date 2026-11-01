/**
 * Date inputs give "YYYY-MM-DD" in the user's local time. Convert them to ISO
 * instants covering the whole local day so the backend's createdAt range
 * filter is inclusive of both ends regardless of how it parses dates.
 */
export function startOfLocalDayISO(date: string): string | undefined {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function endOfLocalDayISO(date: string): string | undefined {
  const d = new Date(`${date}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
