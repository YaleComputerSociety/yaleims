// Compares the planned v3 docs with what is already stored and writes the
// difference. Never touches an old collection except to add v3 fields to
// users/{email} and usernames/{name} docs that lack them.
//
// First run (no `since`): creates missing docs; an existing doc that differs
// is kept and reported, never overwritten.
// Catch-up run (`since` = when the previous --apply run finished): a doc not
// written since then is the migration's own, so it is brought up to date
// (overwritten, or deleted if the old data no longer produces it); a doc
// written after `since` belongs to the new code and is kept. Every overwrite
// and delete carries a lastUpdateTime precondition, so a doc that changes
// while this runs fails the batch instead of being clobbered (re-run then).
import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Firestore,
  type Precondition,
} from "firebase-admin/firestore";
import { paths } from "../../../frontend/src/lib/paths";
import type { Plan } from "./transform";

interface Stored {
  data: DocumentData;
  createTime: Timestamp;
  updateTime: Timestamp;
}

type Op =
  | { type: "create"; path: string; data: DocumentData }
  | { type: "update"; path: string; data: DocumentData; precondition: Precondition }
  | { type: "delete"; path: string; precondition: Precondition };

/**
 * create: a new v3 doc. unchanged. overwrite / delete: a catch-up of a doc the
 * migration wrote. kept: differs from the plan but isn't the migration's to
 * change. not-in-plan: stored, the plan doesn't have it, and it isn't the
 * migration's (written by the new code). add-fields: v3 fields added to an old
 * users / usernames doc.
 */
export type Outcome =
  | "create"
  | "unchanged"
  | "overwrite"
  | "kept"
  | "delete"
  | "not-in-plan"
  | "add-fields";

export interface WriteSummary {
  /** Per kind of doc ("seasons/*\/matches/*"), how many of each outcome. */
  counts: Record<string, Partial<Record<Outcome, number>>>;
  /** Paths kept although they differ from the plan (written after `since`, or a first run). */
  kept: string[];
  deleted: string[];
  writes: number;
  /** Commit time of the last write (the --since for a catch-up run). */
  finishedAt: string | null;
}

/** Every v3 doc already stored, by path (users and usernames are old docs; not listed). */
export async function readStoredV3(db: Firestore, seasonIds: string[]): Promise<Map<string, Stored>> {
  const stored = new Map<string, Stored>();
  const put = (snap: FirebaseFirestore.DocumentSnapshot) =>
    stored.set(snap.ref.path, {
      data: snap.data()!,
      createTime: snap.createTime!,
      updateTime: snap.updateTime!,
    });
  const app = await db.doc(paths.appConfig).get();
  if (app.exists) put(app);

  const ids = new Set(seasonIds);
  for (const d of (await db.collection(paths.seasons).get()).docs) {
    if (d.id === "current" || d.id === "past") continue; // frozen pre-v3 docs
    put(d);
    ids.add(d.id);
  }
  for (const seasonId of ids) {
    for (const collection of [
      paths.sports(seasonId),
      paths.colleges(seasonId),
      paths.players(seasonId),
      paths.matches(seasonId),
      paths.brackets(seasonId),
    ]) {
      for (const d of (await db.collection(collection).get()).docs) put(d);
    }
  }
  // "mvps" is also the old top-level collection: keep only paths under seasons/.
  for (const group of ["teams", "roster", "scoreReports", "mvps"]) {
    for (const d of (await db.collectionGroup(group).get()).docs) {
      if (d.ref.path.startsWith("seasons/")) put(d);
    }
  }
  return stored;
}

/** "seasons/2026-2027/matches/1561" → "seasons/*\/matches/*". */
export function kindOf(path: string): string {
  return path
    .split("/")
    .map((part, i) => (i % 2 === 1 ? "*" : part))
    .join("/");
}

export async function writePlan(
  db: Firestore,
  plan: Plan,
  stored: Map<string, Stored>,
  opts: { apply: boolean; since: Timestamp | null }
): Promise<WriteSummary> {
  const summary: WriteSummary = { counts: {}, kept: [], deleted: [], writes: 0, finishedAt: null };
  const tally = (path: string, outcome: Outcome) => {
    const kind = summary.counts[kindOf(path)] ?? (summary.counts[kindOf(path)] = {});
    kind[outcome] = (kind[outcome] ?? 0) + 1;
  };
  // A doc last written before `since` is the migration's own (the new code
  // went live after it); without `since`, nothing stored is.
  const writtenBefore = (t: Timestamp) => opts.since !== null && t.toMillis() <= opts.since.toMillis();
  const ownedByMigration = (s: Stored) => writtenBefore(s.updateTime);

  // MVP awards have auto ids: an award already stored for the same college,
  // week and player is the same award.
  const docs = new Map(plan.docs);
  const claimed = new Set<string>();
  for (const item of plan.mvps) {
    const parent = paths.mvps(item.seasonId, item.collegeId);
    const match = [...stored].find(
      ([path, s]) =>
        path.startsWith(`${parent}/`) &&
        !claimed.has(path) &&
        s.data.week === item.data.week &&
        s.data.playerId === item.data.playerId
    );
    const path = match?.[0] ?? `${parent}/${db.collection(parent).doc().id}`;
    claimed.add(path);
    docs.set(path, item.data);
  }

  const ops: Op[] = [];
  for (const [path, data] of docs) {
    const existing = stored.get(path);
    if (!existing) {
      ops.push({ type: "create", path, data: data as DocumentData });
      tally(path, "create");
    } else if (sameValue(existing.data, data)) {
      tally(path, "unchanged");
    } else if (ownedByMigration(existing)) {
      // Replace exactly: fields the plan no longer has are deleted.
      const update: DocumentData = { ...(data as DocumentData) };
      for (const key of Object.keys(existing.data)) {
        if (!(key in update)) update[key] = FieldValue.delete();
      }
      ops.push({ type: "update", path, data: update, precondition: { lastUpdateTime: existing.updateTime } });
      tally(path, "overwrite");
    } else {
      summary.kept.push(path);
      tally(path, "kept");
    }
  }
  for (const [path, existing] of stored) {
    if (docs.has(path)) continue;
    // Made by the migration and no longer produced by the old data: stale.
    if (writtenBefore(existing.createTime) && ownedByMigration(existing)) {
      ops.push({ type: "delete", path, precondition: { lastUpdateTime: existing.updateTime } });
      summary.deleted.push(path);
      tally(path, "delete");
    } else {
      tally(path, "not-in-plan");
    }
  }
  for (const [path, { update, updateTime }] of [...plan.userUpdates, ...plan.usernameUpdates]) {
    ops.push({ type: "update", path, data: update, precondition: { lastUpdateTime: updateTime } });
    tally(path, "add-fields");
  }

  if (!opts.apply) return summary;

  // At most 500 writes per batch; each batch is atomic.
  const BATCH = 400;
  for (let i = 0; i < ops.length; i += BATCH) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + BATCH)) {
      const ref = db.doc(op.path);
      if (op.type === "create") batch.create(ref, op.data);
      else if (op.type === "update") batch.update(ref, op.data, op.precondition);
      else batch.delete(ref, op.precondition);
    }
    const results = await batch.commit();
    summary.writes += results.length;
    const last = results[results.length - 1]?.writeTime;
    if (last) summary.finishedAt = last.toDate().toISOString();
    process.stdout.write(`  committed ${Math.min(i + BATCH, ops.length)}/${ops.length}\n`);
  }
  return summary;
}

/** Deep equality of Firestore values (Timestamps by value, maps by key set). */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Timestamp || b instanceof Timestamp) {
    return a instanceof Timestamp && b instanceof Timestamp && a.isEqual(b);
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => sameValue(v, b[i]))
    );
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return (
      ka.length === kb.length &&
      ka.every((k) => Object.hasOwn(b, k) && sameValue((a as never)[k], (b as never)[k]))
    );
  }
  return a === b;
}
