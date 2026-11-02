export function startOfLocalDayISO(date: string): string | undefined {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function endOfLocalDayISO(date: string): string | undefined {
  const d = new Date(`${date}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
