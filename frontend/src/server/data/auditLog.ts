// The audit log (D32): every write only supervisors and up can make is
// recorded in seasons/{seasonId}/auditLog, in the same transaction as the
// change, with each doc it changes as it was before (null: it didn't exist),
// so a change can be reviewed and reversed. Global actions go to the current
// season's log. Server-only: the rules deny every client access.
import "server-only";
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { AuditLogDoc } from "@/types/firestore";
import type { Session } from "../session";

/** Who did it: their email and their roles at the time. */
export type Actor = AuditLogDoc["actor"];

export function actorOf(session: Session): Actor {
  return { userId: session.email, roles: session.mRoles };
}

/** A doc as read in the transaction (a snapshot of any type fits). */
interface ReadDoc {
  ref: { path: string };
  data(): unknown;
}

/**
 * Records `action` inside `tx`. `changed`: the docs the action updates or
 * deletes, as read in this transaction; `created`: the docs it creates.
 */
export function logAction(
  tx: Transaction,
  seasonId: string,
  entry: {
    actor: Actor;
    action: string;
    /** The request's parameters (JSON). */
    params: object;
    changed: ReadDoc[];
    created?: { path: string }[];
  }
): void {
  const before: AuditLogDoc["before"] = {};
  for (const doc of entry.changed) {
    before[doc.ref.path] = (doc.data() as Record<string, unknown> | undefined) ?? null;
  }
  for (const ref of entry.created ?? []) before[ref.path] = null;
  tx.create(adminDb.collection(paths.auditLog(seasonId)).doc(), {
    at: FieldValue.serverTimestamp(),
    actor: entry.actor,
    action: entry.action,
    // A JSON round trip drops undefined values, which Firestore rejects.
    params: JSON.parse(JSON.stringify(entry.params)),
    targets: Object.keys(before),
    before,
  });
}
