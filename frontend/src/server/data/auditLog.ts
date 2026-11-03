// The audit log (D32): every write only supervisors and up can make is
// recorded in seasons/{seasonId}/auditLog, in the same transaction as the
// change, with each doc it changes as it was before (null: it didn't exist).
// Large payloads use bounded private chunks; getAuditLog reconstructs both
// formats. Global actions go to the current season's log. Limits are checked
// before committing: an oversized action cannot leave partial writes or logs.
import "server-only";
import { createHash } from "node:crypto";
import { FieldPath, FieldValue, type Query, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import { ApiError } from "@/lib/api/core";
import type { AuditLogDoc, AuditLogPayload, AuditLogRecord } from "@/types/firestore";
import { AUDIT_CHUNK_BYTES, AUDIT_INLINE_BYTES, AUDIT_MAX_BYTES, AUDIT_MAX_TARGETS, canInlineAuditData, decodeAuditData, encodeAuditData } from "./auditPayload";

/** Who did it: their email and their roles at the time. */
export type Actor = AuditLogDoc["actor"];

/** A doc as read in the transaction (a snapshot of any type fits). */
interface ReadDoc {
  ref: { path: string };
  data(): unknown;
}

function tooLarge(): never {
  throw new ApiError("conflict", "This operation exceeds the safe size limit. Contact the site maintainers to process it in smaller batches.", {
    maxTargets: AUDIT_MAX_TARGETS, maxPayloadBytes: AUDIT_MAX_BYTES,
  });
}

const partId = (i: number) => String(i).padStart(4, "0");
const checksum = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

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
  const targets = new Set([...entry.changed.map((d) => d.ref.path), ...(entry.created ?? []).map((r) => r.path)]);
  if (targets.size > AUDIT_MAX_TARGETS) tooLarge();
  const before: AuditLogPayload["before"] = {};
  for (const doc of entry.changed) {
    before[doc.ref.path] = (doc.data() as Record<string, unknown> | undefined) ?? null;
  }
  for (const ref of entry.created ?? []) before[ref.path] = null;
  const payload: AuditLogPayload = {
    // Preserve the existing JSON semantics of request parameters (drop undefined).
    params: JSON.parse(JSON.stringify(entry.params)),
    targets: Object.keys(before),
    before,
  };
  const bytes = encodeAuditData(payload);
  if (bytes.length > AUDIT_MAX_BYTES) tooLarge();
  const params = encodeAuditData(payload.params).length <= 8 * 1024 && canInlineAuditData(payload.params) ? payload.params : {};
  const metadata = {
    at: FieldValue.serverTimestamp(),
    actor: entry.actor,
    action: entry.action,
    params,
  };
  if (encodeAuditData({ actor: entry.actor, action: entry.action, params }).length > 16 * 1024) tooLarge();
  const ref = adminDb.collection(paths.auditLog(seasonId)).doc();
  if (bytes.length <= AUDIT_INLINE_BYTES && canInlineAuditData(payload)) {
    tx.create(ref, { ...metadata, ...payload });
    return;
  }
  const chunkCount = Math.ceil(bytes.length / AUDIT_CHUNK_BYTES);
  tx.create(ref, {
    ...metadata,
    payload: { encoding: "firestore-json-v1", chunkCount, byteLength: bytes.length, sha256: checksum(bytes) },
  });
  for (let i = 0; i < chunkCount; i++) {
    tx.create(adminDb.doc(paths.auditPayloadChunk(seasonId, ref.id, partId(i))), {
      data: bytes.subarray(i * AUDIT_CHUNK_BYTES, (i + 1) * AUDIT_CHUNK_BYTES),
    });
  }
}

/** The full action, including older inline entries; fail on missing or corrupt chunks. */
export async function getAuditLog(seasonId: string, entryId: string): Promise<AuditLogRecord | null> {
  const snap = await adminDb.doc(paths.auditLogEntry(seasonId, entryId)).get();
  if (!snap.exists) return null;
  const entry = snap.data() as AuditLogDoc;
  if (!("payload" in entry)) return entry;
  const { encoding, chunkCount, byteLength, sha256 } = entry.payload;
  if (encoding !== "firestore-json-v1" || !Number.isInteger(byteLength) || byteLength < 1 || byteLength > AUDIT_MAX_BYTES
    || !Number.isInteger(chunkCount) || chunkCount !== Math.ceil(byteLength / AUDIT_CHUNK_BYTES)) {
    throw new Error("Invalid audit payload manifest");
  }
  const chunks = await adminDb.getAll(...Array.from({ length: chunkCount }, (_, i) =>
    adminDb.doc(paths.auditPayloadChunk(seasonId, entryId, partId(i)))));
  const buffers = chunks.map((chunk, i) => {
    const data: unknown = chunk.data()?.data;
    const expected = Math.min(AUDIT_CHUNK_BYTES, byteLength - i * AUDIT_CHUNK_BYTES);
    if (!Buffer.isBuffer(data) || data.length !== expected) throw new Error("Missing or invalid audit payload chunk");
    return data;
  });
  const bytes = Buffer.concat(buffers);
  if (checksum(bytes) !== sha256) throw new Error("Audit payload checksum mismatch");
  const payload = decodeAuditData(bytes, adminDb) as AuditLogPayload;
  return { at: entry.at, actor: entry.actor, action: entry.action, ...payload };
}

/**
 * Read delete children in small ID-ordered pages inside the caller's transaction.
 * Stop at the shared target/byte budget instead of loading an unbounded query.
 * `parents` includes the games, bracket and standings already read for the audit.
 */
export async function readAuditedChildren(tx: Transaction, collections: Query[], parents: ReadDoc[]): Promise<QueryDocumentSnapshot[]> {
  const seen = new Set<string>();
  let bytes = 0;
  const include = (doc: ReadDoc) => {
    if (seen.has(doc.ref.path)) return false;
    seen.add(doc.ref.path);
    bytes += encodeAuditData({ [doc.ref.path]: doc.data() ?? null }).length;
    if (seen.size > AUDIT_MAX_TARGETS || bytes > AUDIT_MAX_BYTES) tooLarge();
    return true;
  };
  parents.forEach(include);
  const children: QueryDocumentSnapshot[] = [];
  for (const collection of collections) {
    let cursor: QueryDocumentSnapshot | undefined;
    while (true) {
      const limit = Math.min(50, AUDIT_MAX_TARGETS - seen.size + 1);
      let query = collection.orderBy(FieldPath.documentId()).limit(limit);
      if (cursor) query = query.startAfter(cursor);
      const page = await tx.get(query);
      for (const doc of page.docs) if (include(doc)) children.push(doc);
      if (page.size < limit) break;
      cursor = page.docs[page.docs.length - 1];
    }
  }
  return children;
}
