// The audit log (D32): every write only supervisors and up can make is
// recorded in seasons/{seasonId}/auditLog, in the same transaction as the
// change, with each doc it changes as it was before (null: it didn't exist),
// so a change can be reviewed and reversed. Global actions go to the current
// season's log. Server-only: the rules deny every client access.
//
// An entry stays light and always fits in one document, so logging can never
// be why an action fails: within the entry's budget it lists every doc's path,
// then keeps copies in the order the caller lists the docs (the game, bracket
// and standings first, then rosters and reports); what doesn't fit is counted
// (`truncated`). Backups and point-in-time recovery cover what is left out.
import "server-only";
import { DocumentReference, FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { AuditLogDoc } from "@/types/firestore";

/** An entry's budget: a quarter of Firestore's 1 MiB document limit. */
const ENTRY_BYTES = 256 * 1024;
/** Request parameters beyond this are not copied (a large schedule upload, say). */
const PARAMS_BYTES = 64 * 1024;

/** Who did it: their email and their roles at the time. */
export type Actor = AuditLogDoc["actor"];

/** A doc as read in the transaction (a snapshot of any type fits). */
interface ReadDoc {
  ref: { path: string };
  data(): unknown;
}

/**
 * Records `action` inside `tx`. `changed`: the docs the action updates or
 * deletes, as read in this transaction, the most important first; `created`:
 * the docs it creates.
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
  // A JSON round trip drops undefined values, which Firestore rejects.
  const fullParams = JSON.parse(JSON.stringify(entry.params));
  const params = storedSize(fullParams) <= PARAMS_BYTES ? fullParams : { truncated: true };
  const docs = new Map<string, unknown>();
  for (const doc of entry.changed) docs.set(doc.ref.path, doc.data() ?? null);
  for (const ref of entry.created ?? []) docs.set(ref.path, null);

  // Every path first (what was touched matters most), then the copies.
  let budget = ENTRY_BYTES - storedSize({ actor: entry.actor, action: entry.action, params });
  const targets: string[] = [];
  for (const path of docs.keys()) {
    if (storedSize(path) > budget) break;
    targets.push(path);
    budget -= storedSize(path);
  }
  const before: AuditLogDoc["before"] = {};
  for (const path of targets) {
    const data = docs.get(path) as Record<string, unknown> | null;
    const bytes = storedSize(path) + storedSize(data);
    if (bytes > budget) continue; // a large doc doesn't keep smaller ones after it out
    before[path] = data;
    budget -= bytes;
  }
  const copiesLeftOut = docs.size - Object.keys(before).length;

  tx.create(adminDb.collection(paths.auditLog(seasonId)).doc(), {
    at: FieldValue.serverTimestamp(),
    actor: entry.actor,
    action: entry.action,
    params,
    targets,
    before,
    truncated: copiesLeftOut > 0 ? { copies: copiesLeftOut, paths: docs.size - targets.length } : null,
  });
}

/** About what `value` adds to a stored document (Firestore's storage-size rules). */
function storedSize(value: unknown): number {
  if (value === null || value === undefined || typeof value === "boolean") return 1;
  if (typeof value === "number") return 8;
  if (typeof value === "string") return Buffer.byteLength(value, "utf8") + 1;
  if (value instanceof Timestamp) return 8;
  if (value instanceof Uint8Array) return value.length;
  if (value instanceof DocumentReference) return Buffer.byteLength(value.path, "utf8") + 16;
  if (Array.isArray(value)) return value.reduce((sum: number, v) => sum + storedSize(v), 0);
  if (typeof value === "object") {
    return Object.entries(value).reduce((sum, [key, v]) => sum + storedSize(key) + storedSize(v), 0);
  }
  return 16;
}
