// Shared by the integration tests: calls to the running app (BASE), session
// cookies for the seeded people, and direct emulator reads to check what a
// call changed. scripts/test-integration.mts sets BASE and TEST_JWT_SECRET.
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import jwt from "jsonwebtoken";

export const BASE = process.env.BASE ?? "http://localhost:3210";
const SECRET = process.env.TEST_JWT_SECRET;
if (!SECRET) throw new Error("Run through `npm run test:integration` (it starts the app and sets TEST_JWT_SECRET).");

/** The emulator, read directly to check what a call changed. */
export const db = getFirestore(getApps()[0] ?? initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "yims-125a2" }));

/** A session cookie for `email`, with the roles the session claims (the server may check them against Firestore). */
export const sessionFor = (email: string, mRoles: string[] = ["user"]) =>
  jwt.sign({ name: "Test User", netid: email.split("@")[0], email, mRoles }, SECRET, { expiresIn: "1h" });

/** People of the seed (scripts/seed.mts): 8 students per college; the first is the rep, the next two captains. */
export const people = {
  admin: "dev@example.edu",
  /** College index (0 = BF … in COLLEGES order) and position → the student's email. */
  student: (college: number, position: number) => `player${String(college * 8 + position + 1).padStart(3, "0")}@example.edu`,
};

interface CallOptions {
  /** A session cookie (sessionFor). */
  session?: string;
  /** The Origin header; writes from the browser always carry ours. null sends none. */
  origin?: string | null;
}

/** Calls the app; returns the status and the parsed body (text if it isn't JSON). */
export async function api(method: string, path: string, body?: unknown, { session, origin = BASE }: CallOptions = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { cookie: `token=${session}` } : {}),
      ...(origin ? { origin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // plain text
  }
  return { status: res.status, body: parsed };
}
