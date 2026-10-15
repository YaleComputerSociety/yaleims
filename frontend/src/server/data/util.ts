import "server-only";
import type { DocumentData, DocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import type { WithId } from "@/types/firestore";

/**
 * Runs `fn` in a Firestore transaction (retried on contention). For services
 * whose writes span entities; they get document refs from the data modules.
 */
export function runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return adminDb.runTransaction(fn);
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

/** The Admin SDK reports a missing document on update() as gRPC code 5. */
export function isNotFound(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === 5 || code === "not-found";
}
