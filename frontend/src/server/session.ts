// The login session: the app's own HS256 JWT in the `token` cookie, minted by
// /api/auth/redirect after Yale CAS for 7 days. It is not a Firebase ID token.
// It says only who is signed in (Identity: account id and NetID); everything
// else about them, and what they may do, is read from
// Firestore on each request (server/auth.ts). Every server route reads it
// through this module.
import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SESSION_COOKIE = "token";
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
const secureCookies = process.env.NODE_ENV === "production";

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
 */
async function verifiedPayload(): Promise<Record<string, unknown> | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }
  const secret = jwtSecret();
  try {
    const decoded = jwt.verify(token, secret);
    return decoded && typeof decoded === "object" ? (decoded as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Who is signed in, as the Yale login said: their account and the NetID
 * CAS vouched for. Name, college and roles are read from Firestore, never
 * from the cookie.
 */
export interface Identity {
  /** users/{userId}: an email for accounts from before November 2026, "netid-<netid>" for newer ones. */
  userId: string;
  netid: string;
}

/**
 * The signed-in identity, or null (see verifiedPayload). Cookies since
 * November 2026 carry { v: 2, userId, netid }. Older ones carry the email,
 * which was the account's id: { email, netid, name, college } (and roles
 * before Phase 2D); only email and netid are read.
 */
export async function getIdentity(): Promise<Identity | null> {
  const payload = await verifiedPayload();
  if (!payload || typeof payload.netid !== "string" || payload.netid === "") {
    return null;
  }
  const userId = payload.v === 2 ? payload.userId : payload.email;
  return typeof userId === "string" && userId !== "" ? { userId, netid: payload.netid } : null;
}

/** Signs `identity` and sets it as the session cookie on `res`. */
export function setSessionCookie(res: NextResponse, identity: Identity): void {
  const token = jwt.sign({ v: 2, userId: identity.userId, netid: identity.netid }, jwtSecret(), { expiresIn: "7d" });
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
