// The route wrapper and request parsing every API route uses. A route
// handler reads top to bottom: validate (readBody / readQuery) → authorize
// (server/auth.ts) → service or data module → respond (ok / created /
// noContent). Whatever it throws becomes the one error shape of
// lib/api/core.ts: an ApiError as is, anything else as a generic 500 that
// is logged here and never shows exception text to the client.
import "server-only";
import type { z } from "zod";
import { ApiError } from "@/lib/api/core";
import { getIdentity } from "./session";

type Handler<Params> = (req: Request, ctx: { params: Promise<Params> }) => Promise<Response>;

/**
 * Wraps a route handler: `export const GET = route(async (req, { params }) => …)`.
 * `Params` are the URL's [segments], as strings.
 */
export function route<Params = Record<string, never>>(handler: Handler<Params>): Handler<Params> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        return Response.json(error.toBody(), { status: error.status });
      }
      await logFailure(req, error);
      return Response.json(new ApiError("internal", "Something went wrong. Please try again.").toBody(), {
        status: 500,
      });
    }
  };
}

/** One structured line per failure (Cloud Logging parses JSON lines): route, viewer, error. */
export async function logFailure(req: Request, error: unknown): Promise<void> {
  const viewer = await getIdentity().catch(() => null);
  console.error(
    JSON.stringify({
      severity: "ERROR",
      message: `${req.method} ${new URL(req.url).pathname} failed`,
      viewer: viewer?.userId ?? null,
      error: error instanceof Error ? error.stack : String(error),
    })
  );
}

// ── Responses ──────────────────────────────────────────────────────────────

/** 200 with `body`; a list is `{ items, total }`. Convert stored docs with toJson first. */
export function ok(body: unknown): Response {
  return Response.json(body);
}

/** 201 with the created resource. */
export function created(body: unknown): Response {
  return Response.json(body, { status: 201 });
}

/** 204, for deletes and writes with nothing to return. */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

// ── Requests ───────────────────────────────────────────────────────────────

/**
 * The JSON body, parsed with `schema` (lib/api's schemas are strict objects,
 * so unknown fields are refused). 400 unless it is sent as application/json
 * and matches.
 */
export async function readBody<Schema extends z.ZodType>(req: Request, schema: Schema): Promise<z.infer<Schema>> {
  const type = req.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json") {
    throw new ApiError("bad-request", "Send the request body as JSON (Content-Type: application/json).");
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError("bad-request", "The request body isn't valid JSON.");
  }
  return parse(schema, body);
}

/** The query parameters, parsed with `schema` (each value arrives as a string; use z.coerce for numbers). */
export function readQuery<Schema extends z.ZodType>(req: Request, schema: Schema): z.infer<Schema> {
  return parse(schema, Object.fromEntries(new URL(req.url).searchParams));
}

/** The URL's [segments], parsed with `schema` (for segments that aren't plain ids, e.g. a week number). */
export async function readParams<Schema extends z.ZodType>(params: Promise<unknown>, schema: Schema): Promise<z.infer<Schema>> {
  return parse(schema, await params);
}

function parse<Schema extends z.ZodType>(schema: Schema, value: unknown): z.infer<Schema> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  const first = issues[0];
  throw new ApiError("bad-request", first.path ? `${first.path}: ${first.message}` : first.message, { issues });
}
