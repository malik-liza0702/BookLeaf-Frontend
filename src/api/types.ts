export const ROLES = ['author', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const QUERY_TYPES = ['General', 'Account Level'] as const;
export type QueryType = (typeof QUERY_TYPES)[number];

export const TICKET_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export type AiStatus = 'pending' | 'done' | 'failed';

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'AI_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export interface SingleResponse<T> {
  data: T;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: PageMeta;
}

export type NotificationType = 'reply' | 'status_change';

export interface AppNotification {
  id: string;
  type: NotificationType;
  ticketId: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  data: AppNotification[];
  meta: PageMeta & { unreadCount: number };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  authorId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Book {
  id: string;
  bookId: string;
  title: string;
  isbn: string;
  genre: string;
  publicationDate: string | null;
  status: string;
  mrp: number | null;
  authorRoyaltyPerCopy: number | null;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastRoyaltyPayoutDate: string | null;
  printPartner: string | null;
  availableOn: string[];
  authorId: string;
  isInProduction: boolean;
}

export interface Attachment {
  name: string;
  size: number;
}

export type ResponseSender = 'author' | 'support';

export interface AuthorResponse {
  id: string;
  from: ResponseSender;
  message: string;
  authorName: string;
  createdAt: string;
}

export interface AuthorTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  bookId: string | null;
  bookTitle: string | null;
  queryType: QueryType | null;
  attachments: Attachment[];
  responses: AuthorResponse[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AdminResponse extends AuthorResponse {
  usedAiDraft: boolean;
}

export interface InternalNote {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface AiDraft {
  text: string;
  generatedAt: string;
  model: string;
  fallback: boolean;
  warnings: string[];
}

export interface AssigneeRef {
  id: string;
  name: string;
}

export interface AdminTicket extends Omit<AuthorTicket, 'responses'> {
  authorId: string;
  authorName: string;
  authorEmail: string;
  category: TicketCategory;
  priority: TicketPriority;
  aiCategory: TicketCategory | null;
  aiPriority: TicketPriority | null;
  aiReasoning: string | null;
  aiConfidence: number | null;
  categoryOverridden: boolean;
  priorityOverridden: boolean;
  aiStatus: AiStatus;
  assignedTo: AssigneeRef | null;
  internalNotes: InternalNote[];
  aiDraft: AiDraft | null;
  needsReply: boolean;
  responses: AdminResponse[];
}

export interface CreateTicketRequest {
  bookId?: string | null;
  queryType: QueryType;
  subject: string;
  description: string;
  attachments?: Attachment[];
}

export interface CreateReplyRequest {
  message: string;
}

export interface UpdateTicketRequest {
  status?: TicketStatus;
  category?: TicketCategory | null;
  priority?: TicketPriority | null;
  assignedTo?: string | null;
}

export interface CreateResponseRequest {
  message: string;
  usedAiDraft?: boolean;
  status?: TicketStatus;
}

export interface DraftRevision {
  previousDraft: string;
  suggestions: string;
}

export interface CreateNoteRequest {
  text: string;
}

export type TicketSort = 'urgency' | 'newest' | 'oldest';

export interface AdminTicketFilters {
  authorId?: string;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assignedTo?: string;
  from?: string;
  to?: string;
  q?: string;
  sort?: TicketSort;
  page?: number;
  limit?: number;
  updatedSince?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export interface AdminStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  critical: number;
  unassigned: number;
  oldestOpenAt: string | null;
}

export interface AuthorTotals {
  books: number;
  published: number;
  inProduction: number;
  copiesSold: number;
  royaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  tickets: number;
  unresolvedTickets: number;
}

export interface AuthorSummary {
  id: string;
  authorId: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  joinedDate: string | null;
  totals: AuthorTotals;
}

export interface AuthorDetail extends AuthorSummary {
  books: Book[];
}

export interface AuthorListParams {
  q?: string;
  page?: number;
  limit?: number;
}
