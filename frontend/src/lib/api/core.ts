// The API's shared core, used by both sides: the error shape and its codes,
// the JSON form of stored docs, and request(), the one way pages call the API.
// Each resource's contract (request schemas, response types, client calls)
// lives in its own file beside this one, lib/api/<resource>.ts; the route
// handlers in app/api validate with the same schemas (server/http.ts).
import type { StoredTimestamp } from "@/types/firestore";

// ── Errors ─────────────────────────────────────────────────────────────────

/** Every error code the API sends, with its HTTP status. */
const STATUS_OF = {
  "bad-request": 400,
  unauthenticated: 401,
  forbidden: 403,
  "not-found": 404,
  conflict: 409,
  internal: 500,
} as const;

export type ErrorCode = keyof typeof STATUS_OF;

/** The body of every error response. */
export interface ErrorBody {
  error: {
    code: ErrorCode;
    /** Safe to show the user. */
    message: string;
    /** Data a page acts on (e.g. the scored games that block a delete). */
    details?: unknown;
  };
}

/**
 * An API error. Route handlers throw it (server/http.ts turns it into the
 * response); request() throws it when a call fails.
 */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  get status(): number {
    return STATUS_OF[this.code];
  }

  toBody(): ErrorBody {
    return { error: { code: this.code, message: this.message, details: this.details } };
  }
}

// ── Stored docs as JSON ────────────────────────────────────────────────────

/** A stored doc as the API sends it: timestamps become ISO strings. */
export type Json<T> = T extends StoredTimestamp
  ? string
  : T extends (infer U)[]
    ? Json<U>[]
    : T extends object
      ? { [K in keyof T]: Json<T[K]> }
      : T;

/** Converts a value read from Firestore to its Json form (timestamps and Dates to ISO strings). */
export function toJson<T>(value: T): Json<T> {
  return convert(value) as Json<T>;
}

function convert(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (isTimestamp(value)) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(convert);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, convert(v)]));
  }
  return value;
}

// Structural, like StoredTimestamp: the Admin SDK's and the browser SDK's
// Timestamp classes both have these.
function isTimestamp(value: unknown): value is StoredTimestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as StoredTimestamp).toDate === "function" &&
    typeof (value as StoredTimestamp).seconds === "number"
  );
}

// ── Calling the API ────────────────────────────────────────────────────────

/** Query parameters; null and undefined ones are left out. */
export type Query = Record<string, string | number | boolean | null | undefined>;

/**
 * Calls the API and returns the response body (undefined for 204). Throws an
 * ApiError when the call fails, with the server's code and message, or
 * "internal" when the server can't be reached or answers something else.
 */
export async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  { query, body }: { query?: Query; body?: unknown } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path + queryString(query), {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("internal", "Couldn't reach the server. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (res.ok) return data as T;

  const error = (data as Partial<ErrorBody> | null)?.error;
  if (error && error.code in STATUS_OF && typeof error.message === "string") {
    throw new ApiError(error.code, error.message, error.details);
  }
  throw new ApiError("internal", "Something went wrong. Please try again.");
}

function queryString(query: Query | undefined): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined) params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}
