import { tokenStorage } from '@/auth/tokenStorage';
import type { ApiErrorBody, ApiErrorDetail, ErrorCode } from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');

/** Client-side error codes that never come from the backend. */
type ClientErrorCode = 'NETWORK_ERROR' | 'BAD_RESPONSE';

/**
 * Every failed request is turned into an ApiError, so UI code only ever has to
 * handle one error type. `code` follows the contract's error codes.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | ClientErrorCode;
  readonly details: ApiErrorDetail[];

  constructor(
    status: number,
    code: ErrorCode | ClientErrorCode,
    message: string,
    details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Human readable message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (isApiError(error)) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

// The auth layer registers a handler so that any 401 on an authenticated
// request logs the user out, without the client importing React code.
let onUnauthenticated: (() => void) | null = null;
export function setUnauthenticatedHandler(handler: (() => void) | null) {
  onUnauthenticated = handler;
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Skip the bearer token and the global 401 handler (used by login). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorBody).error?.message === 'string'
  );
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, anonymous = false, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = anonymous ? null : tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }

  // 204 or empty body
  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !anonymous) onUnauthenticated?.();
    if (isErrorBody(json)) {
      const { code, message, details } = json.error;
      throw new ApiError(response.status, code, message, details ?? []);
    }
    throw new ApiError(response.status, 'BAD_RESPONSE', `Unexpected server response (${response.status}).`);
  }

  if (json === null && text) {
    throw new ApiError(response.status, 'BAD_RESPONSE', 'The server returned an unreadable response.');
  }
  return json as T;
}
