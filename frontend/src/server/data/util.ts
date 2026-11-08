import "server-only";
import type { DocumentData, DocumentSnapshot, Query, QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import type { WithId } from "@/types/firestore";
import { ApiError } from "@/lib/api/core";

/**
 * Runs `fn` in a Firestore transaction (retried on contention). For services
 * whose writes span entities; they get document refs from the data modules.
 */
export function runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return adminDb.runTransaction(fn);
}

/** The most child records (roster entries, score reports) one action changes in one transaction. */
const MAX_CHILDREN = 2000;

/**
 * Every doc of `collections` (a game's roster and reports, say), read in
 * `tx`. More than MAX_CHILDREN in all is refused before any write: far more
 * than a real game has, and a transaction that size would be slow and close
 * to Firestore's 10 MiB request limit.
 */
export async function readChildren(tx: Transaction, collections: Query[]): Promise<QueryDocumentSnapshot[]> {
  const snaps = await Promise.all(collections.map((c) => tx.get(c.limit(MAX_CHILDREN + 1))));
  const docs = snaps.flatMap((s) => s.docs);
  if (docs.length > MAX_CHILDREN) {
    throw new ApiError("conflict", `This would change more than ${MAX_CHILDREN} records at once. Contact the site maintainers.`, {
      maxChildren: MAX_CHILDREN,
    });
  }
  return docs;
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

/**
 * A doc's revision: when it was last written (Firestore's own update time),
 * to the nanosecond. An admin edit sends the revision it was made on, and
 * expectRevision refuses it (409) when the doc has changed since, so two
 * admins can't silently overwrite each other. null: the doc doesn't exist.
 */
export function revisionOf(snap: DocumentSnapshot): string | null {
  const time = snap.updateTime;
  return time ? `${time.seconds}.${String(time.nanoseconds).padStart(9, "0")}` : null;
}

export function expectRevision(snap: DocumentSnapshot, revision: string | null): void {
  if (revisionOf(snap) !== revision) {
    throw new ApiError("conflict", "Someone changed this in the meantime. Reload and try again.", { revision: revisionOf(snap) });
  }
}
