const KEY = 'bookleaf.seenResponses';

type SeenMap = Record<string, number>;

function read(): SeenMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SeenMap) : {};
  } catch {
    return {};
  }
}

export function getSeenCount(ticketId: string): number {
  return read()[ticketId] ?? 0;
}

export function markResponsesSeen(ticketId: string, count: number) {
  const map = read();
  if (map[ticketId] === count) return;
  map[ticketId] = count;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
  }
}

export function hasUnseenReplies(ticketId: string, responseCount: number): boolean {
  return responseCount > getSeenCount(ticketId);
}
