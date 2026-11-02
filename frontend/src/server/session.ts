// The login session: the app's own HS256 JWT in the `token` cookie, minted by
// /api/auth/redirect after Yale CAS for 7 days. It is not a Firebase ID token.
// It says only who is signed in (Identity); what they may do is read from
// Firestore on each request (server/auth.ts). Every server route reads it
// through this module.
import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

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

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

/** The raw session token: present but invalid (getIdentity null) means the cookie should be cleared. */
export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * The verified token's payload, or null when the cookie is missing, expired,
 * forged or malformed. Throws only when JWT_SECRET is unset (a server
 * misconfiguration).
 *
 * Only netid and email are required: jwt.sign drops undefined values, so a
 * token can lack the rest. Tokens from before Phase 2D also carry roles
 * (mRoles …); they are never read.
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

/** Signs `identity` and sets it as the session cookie on `res`. */
export function setSessionCookie(res: NextResponse, identity: Identity): void {
  const token = jwt.sign({ ...identity }, jwtSecret(), { expiresIn: "7d" });
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
