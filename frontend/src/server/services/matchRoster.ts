// Keep roster membership and derived start times consistent with match edits
// and bracket advancement. Read a plan before any transaction writes, then
// apply it and include every changed entry in the caller's audit action.
import "server-only";
import type { CollectionReference, DocumentSnapshot, QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import type { MatchDoc, RosterEntryDoc } from "@/types/firestore";
import { readAuditedChildren } from "../data/auditLog";
import { rosterRef } from "../data/roster";

export interface MatchChange {
  before: DocumentSnapshot<MatchDoc>;
  after: MatchDoc;
}

interface RosterChange {
  before: QueryDocumentSnapshot;
  /** null deletes an entry; otherwise only its derived start changes. */
  after: Pick<RosterEntryDoc, "startsAt"> | null;
}

/**
 * A replacement college starts blank. Retain entries only for colleges that
 * remain in the game; this also removes stale entries for an incoming college.
 * Swapping home/away preserves both rosters. Rescheduling changes only starts.
 * `parents` includes all other snapshots in this operation's audit budget.
 */
export async function readRosterChanges(
  tx: Transaction,
  seasonId: string,
  changes: MatchChange[],
  parents: DocumentSnapshot[]
): Promise<RosterChange[]> {
  const rosters = new Map<string, {
    ref: CollectionReference<RosterEntryDoc>;
    /** null means no membership change; an empty set retains no entries. */
    retained: Set<string> | null;
    startsAt: RosterEntryDoc["startsAt"] | null;
  }>();
  for (const { before, after } of changes) {
    const match = before.data()!;
    const oldColleges = new Set([match.homeCollegeId, match.awayCollegeId].filter((id) => id !== null));
    const newColleges = new Set([after.homeCollegeId, after.awayCollegeId].filter((id) => id !== null));
    const teamsChanged = oldColleges.size !== newColleges.size || [...oldColleges].some((id) => !newColleges.has(id));
    const rescheduled = match.startsAt.toMillis() !== after.startsAt.toMillis();
    if (!teamsChanged && !rescheduled) continue;
    const ref = rosterRef(seasonId, before.id);
    rosters.set(ref.path, {
      ref,
      retained: teamsChanged ? new Set([...oldColleges].filter((id) => newColleges.has(id))) : null,
      startsAt: rescheduled ? after.startsAt : null,
    });
  }
  if (rosters.size === 0) return [];

  // One paged read shares the audit limits across every affected match.
  const entries = await readAuditedChildren(tx, [...rosters.values()].map((r) => r.ref), parents);
  const planned: RosterChange[] = [];
  for (const entry of entries) {
    const roster = rosters.get(entry.ref.parent.path)!;
    const data = entry.data() as RosterEntryDoc;
    if (roster.retained && !roster.retained.has(data.collegeId)) {
      planned.push({ before: entry, after: null });
    } else if (roster.startsAt) {
      planned.push({ before: entry, after: { startsAt: roster.startsAt } });
    }
  }
  return planned;
}

/** Call after all reads; the caller audits the plan's `before` snapshots. */
export function applyRosterChanges(tx: Transaction, changes: RosterChange[]): void {
  for (const change of changes) {
    if (change.after) tx.update(change.before.ref, change.after);
    else tx.delete(change.before.ref);
  }
}
