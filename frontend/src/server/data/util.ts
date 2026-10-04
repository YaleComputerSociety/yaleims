import "server-only";
import type { DocumentSnapshot } from "firebase-admin/firestore";

/** A document's data plus its id, in the shape the API has always returned. */
export type WithId<T> = T & { id: string };

export function withId<T>(snap: DocumentSnapshot): WithId<T> {
  return { id: snap.id, ...(snap.data() as T) };
}

/** The Admin SDK reports a missing document on update() as gRPC code 5. */
export function isNotFound(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === 5 || code === "not-found";
}
