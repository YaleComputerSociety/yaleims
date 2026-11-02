// The login session: the app's own HS256 JWT in the `token` cookie, minted by
// /api/auth/redirect after Yale CAS and refreshed by /api/auth/verify. It is
// not a Firebase ID token. Every server route reads it through this module.
//
// The new API (server/auth.ts) reads only the identity from it (getIdentity);
// roles come from Firestore. The old routes still read the whole payload,
// roles included (getSession), so the cookie keeps carrying them until those
// routes are gone (Phase 2D step 6).
import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { SessionUser } from "@/types/api";

export const SESSION_COOKIE = "token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * The cookie is SameSite=Lax: sent when someone opens a page of the site
 * (also when CAS sends them back after login), but not with the background
 * requests (form posts, fetches) another site could make in their browser:
 * a guard against cross-site request forgery, next to the Origin check in
 * proxy.ts (which also covers cookies issued before this setting).
 * Production (https) also sets it Secure; `next dev` runs on
 * http://localhost, where Safari drops Secure cookies.
 */
export const secureCookies = process.env.NODE_ENV === "production";

/** The token's payload (shared with the client, which gets it from /api/auth/verify). */
export type Session = SessionUser;

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

/** The raw session token; routes check it first to tell "not signed in" from "invalid session". */
export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * The verified token's payload, or null when the cookie is missing, expired,
 * forged or malformed. Throws only when JWT_SECRET is unset (a server
 * misconfiguration).
 *
 * Only netid and email are required: jwt.sign drops undefined values, so older
 * tokens can lack the rest.
 */
type Payload = Record<string, unknown> & { email: string; netid: string };

async function verifiedPayload(): Promise<Payload | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }
  const secret = jwtSecret();
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return null;
  }
  const payload = decoded as Partial<Payload> | string;
  if (!payload || typeof payload !== "object" || typeof payload.netid !== "string" || typeof payload.email !== "string") {
    return null;
  }
  return payload as Payload;
}

/** Who is signed in, as the Yale login said. */
export interface Identity {
  email: string;
  netid: string;
  /** "" in old tokens without a name. */
  name: string;
  /**
   * The college the session was issued with (from Yalies at login). Joining
   * a new season places a returning student by it (D30); null: none.
   */
  college: string | null;
}

/** The signed-in identity, or null (see verifiedPayload). Any other field of the token is ignored. */
export async function getIdentity(): Promise<Identity | null> {
  const payload = await verifiedPayload();
  if (!payload) {
    return null;
  }
  return {
    email: payload.email,
    netid: payload.netid,
    name: typeof payload.name === "string" ? payload.name : "",
    college: typeof payload.college === "string" && payload.college !== "" ? payload.college : null,
  };
}

/** The whole session, roles as signed; for the old routes (see the top). A token without mRoles gets none. */
export async function getSession(): Promise<Session | null> {
  const payload = await verifiedPayload();
  return payload && toSession(payload);
}

// Picks the session fields, dropping jwt's iat/exp (re-signing a payload that
// carries exp alongside expiresIn throws).
function toSession(fields: any): Session {
  return {
    name: fields.name,
    netid: fields.netid,
    email: fields.email,
    role: fields.role,
    mRoles: Array.isArray(fields.mRoles) ? fields.mRoles : [],
    username: fields.username,
    college: fields.college,
    matches_played: fields.matches_played,
  };
}

export function hasAnyRole(session: Session | null, roles: string[]): boolean {
  return !!session && roles.some((role) => session.mRoles.includes(role));
}

/** Signs `session` and sets it as the session cookie on `res`. */
export function setSessionCookie(res: NextResponse, session: Session): void {
  const token = jwt.sign(toSession(session), jwtSecret(), { expiresIn: "7d" });
  res.cookies.set(SESSION_COOKIE, token, {
    secure: secureCookies,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.delete(SESSION_COOKIE);
}
