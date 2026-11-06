// Browser binding is consumed in Firestore, rather than in process memory or
// only by clearing a cookie: concurrent callbacks may reach different servers.
import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { paths } from "@/lib/paths";
import type { LoginAttemptDoc } from "@/types/firestore";
import { adminDb } from "../firebaseAdmin";
import { runTransaction } from "./util";

function attemptRef(stateHash: string): DocumentReference<LoginAttemptDoc> {
  return adminDb.doc(paths.loginAttempt(stateHash)) as DocumentReference<LoginAttemptDoc>;
}

export async function createLoginAttempt(stateHash: string, attempt: LoginAttemptDoc): Promise<void> {
  await attemptRef(stateHash).create(attempt);
}

/** Wrong browsers cannot burn an attempt. A matching proof takes it exactly once. */
export async function takeLoginAttempt(stateHash: string, browserHash: string): Promise<(LoginAttemptDoc & { expired: boolean }) | null> {
  const ref = attemptRef(stateHash);
  return runTransaction(async (tx) => {
    const attempt = (await tx.get(ref)).data();
    if (!attempt || !/^[a-f0-9]{64}$/.test(attempt.browserHash)
      || !timingSafeEqual(Buffer.from(attempt.browserHash, "hex"), Buffer.from(browserHash, "hex"))) return null;
    const expired = attempt.expiresAt.toMillis() <= Date.now();
    tx.delete(ref);
    return { ...attempt, expired };
  });
}
