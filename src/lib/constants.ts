/** Polling intervals from the contract's "near real time" section. */
export const POLL_AUTHOR_MS = 5_000;
export const POLL_ADMIN_MS = 10_000;

/** Attachment limits (UI only: we send name/size metadata, not file bytes). */
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Age thresholds for unresolved tickets in the admin queue. */
export const AGE_WARNING_HOURS = 48;
export const AGE_DANGER_HOURS = 5 * 24;

export const ADMIN_PAGE_SIZE = 20;

export const SEARCH_DEBOUNCE_MS = 350;
