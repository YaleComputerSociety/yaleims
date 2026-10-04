// The login session: the app's own HS256 JWT in the `token` cookie, minted by
// /api/auth/redirect after Yale CAS and refreshed by /api/auth/verify. It is
// not a Firebase ID token. Every server route reads it through this module.
import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface Session {
  name: string;
  netid: string;
  email: string;
  role: string;
  mRoles: string[];
  username: string;
  college: string;
  matches_played: number;
}

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

/** The raw session token, for the routes that still forward it to a Cloud Function. */
export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * The verified session, or null when the cookie is missing, expired, forged or
 * malformed. Throws only when JWT_SECRET is unset (a server misconfiguration).
 *
 * Only netid and email are required: jwt.sign drops undefined values, so older
 * tokens can lack the rest. A token without mRoles gets none.
 */
export async function getSession(): Promise<Session | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }
  const secret = jwtSecret();
  let decoded: any;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return null;
  }
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.netid !== "string" ||
    typeof decoded.email !== "string"
  ) {
    return null;
  }
  return toSession(decoded);
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
    secure: true,
    httpOnly: true,
    sameSite: "none",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.delete(SESSION_COOKIE);
}
