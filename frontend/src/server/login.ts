// The anonymous browser binding around CAS. The URL state and cookie proof
// are independent random values; only hashes reach the private attempt store.
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/core";
import { createLoginAttempt, takeLoginAttempt } from "./data/loginAttempts";
import { casLoginUrl, returnPath } from "./yaleLogin";

const production = process.env.NODE_ENV === "production";
const COOKIE = production ? "__Host-yims_login" : "yims_login";
const MAX_AGE_SECONDS = 10 * 60;
const TOKEN = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url
const cookieOptions = { httpOnly: true, secure: production, sameSite: "lax" as const, path: "/" };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export const invalidLogin = () => new ApiError("unauthenticated", "This sign-in attempt is missing, expired or already used. Start sign-in again.");

/** Replaces the browser's pending proof; old attempts expire without being usable. */
export async function startLogin(from: string | null): Promise<NextResponse> {
  const destination = returnPath(from);
  if (Buffer.byteLength(destination, "utf8") > 2048) throw new ApiError("bad-request", "The sign-in return path is too long.");
  const state = randomBytes(32).toString("base64url");
  const proof = randomBytes(32).toString("base64url");
  const location = casLoginUrl(state);
  await createLoginAttempt(hash(state), {
    browserHash: hash(proof), from: destination,
    expiresAt: Timestamp.fromMillis(Date.now() + MAX_AGE_SECONDS * 1000),
  });
  (await cookies()).set(COOKIE, proof, { ...cookieOptions, maxAge: MAX_AGE_SECONDS });
  return NextResponse.redirect(location);
}

/** Consume before any CAS request/account write, including attempts that CAS later refuses. */
export async function consumeLogin(state: string | null): Promise<string> {
  const store = await cookies();
  const proof = store.get(COOKIE)?.value;
  if (!state || !TOKEN.test(state) || !proof || !TOKEN.test(proof)) throw invalidLogin();
  const attempt = await takeLoginAttempt(hash(state), hash(proof));
  if (!attempt) throw invalidLogin();
  // Next carries this deletion on both normal responses and route() error responses.
  store.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
  if (attempt.expired) throw invalidLogin();
  return attempt.from;
}
