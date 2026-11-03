import "server-only";
import type { DocumentData, DocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import type { WithId } from "@/types/firestore";
import { ApiError } from "@/lib/api/core";

/**
 * Runs `fn` in a Firestore transaction (retried on contention). For services
 * whose writes span entities; they get document refs from the data modules.
 */
export function runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return adminDb.runTransaction(fn).catch((error: unknown) => {
    // Firestore also counts index work toward transaction limits. Its own
    // size rejection is authoritative even after our application budgets pass.
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    const message = error instanceof Error ? error.message : "";
    if ((code === 3 || code === 9) && /maximum (?:entity|request|transaction) size|transaction (?:is )?too (?:big|large)|request (?:payload |size )?(?:is )?too large/i.test(message)) {
      throw new ApiError("conflict", "This operation exceeds Firestore's size limit. Contact the site maintainers to process it in smaller batches.");
    }
    throw error;
  });
}

/**
 * Only the given fields of stored data, in stored order. Reads use it so
 * they return a document's typed fields, not the frozen betting fields old
 * docs still hold (D25). `fields` must list every key of T. Read-only:
 * never write the result back over a document.
 */
export function pickFields<T>(data: DocumentData, fields: Record<keyof T, true>): T {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => Object.hasOwn(fields, key))
  ) as T;
}

export function withId<T>(snap: DocumentSnapshot): WithId<T> {
  return { id: snap.id, ...(snap.data() as T) };
}
