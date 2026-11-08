// The schedule: adding a sport's regular-season games (the hub's schedule
// upload and new-game form), editing a game's details or cancelling it (the
// edit form), and deleting a game. All are audit-logged; a reschedule also
// moves the start time on the game's roster entries, in the same transaction.
import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { MatchEdit, NewMatch } from "@/lib/api/matches";
import { ApiError } from "@/lib/api/core";
import { matchTeamsProblem } from "@/lib/matchRules";
import type { MatchDoc } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { listColleges } from "../data/colleges";
import { matchRef, newMatchRef } from "../data/matches";
import { rosterRef } from "../data/roster";
import { scoreReportsRef } from "../data/scoreReports";
import { getSport } from "../data/sports";
import { readChildren, runTransaction } from "../data/util";
import { closeGameRequests, readGameRequests } from "./reviews";
import { applyRosterChanges, readRosterChanges } from "./matchRoster";

export type AddScheduleResult =
  | { status: "added"; matchIds: string[] }
  | { status: "unknown-sport" }
  | { status: "bad-rows"; problems: string[] };

/** Adds games all or none: every row needs a date and two distinct known colleges. */
export async function addSchedule(
  seasonId: string,
  sportId: string,
  games: NewMatch[],
  actor: Actor
): Promise<AddScheduleResult> {
  const [sport, colleges] = await Promise.all([getSport(seasonId, sportId), listColleges(seasonId)]);
  if (!sport) return { status: "unknown-sport" };
  const known = new Set(colleges.map((c) => c.id));

  const problems: string[] = [];
  const now = Timestamp.now();
  const docs = games.map((g, i) => {
    const startsAt = new Date(g.startsAt);
    if (isNaN(startsAt.getTime())) problems.push(`Row ${i + 1}: invalid date "${g.startsAt}"`);
    for (const c of [g.homeCollegeId, g.awayCollegeId]) {
      if (!known.has(c)) problems.push(`Row ${i + 1}: unknown college "${c}"`);
    }
    const doc: MatchDoc = {
      seasonId,
      sportId: sport.id,
      homeCollegeId: g.homeCollegeId,
      awayCollegeId: g.awayCollegeId,
      collegeIds: [...new Set([g.homeCollegeId, g.awayCollegeId])],
      startsAt: isNaN(startsAt.getTime()) ? now : Timestamp.fromDate(startsAt),
      venue: g.venue || null,
      venueDetail: g.venueDetail || null,
      division: null,
      stage: "regular",
      bracketId: null,
      bracketSlot: null,
      round: null,
      homeSeed: null,
      awaySeed: null,
      nextMatchId: null,
      nextLoserMatchId: null,
      pointsForWin: sport.pointsForWin,
      status: "scheduled",
      result: null,
      scoredBy: null,
      scoredAt: null,
      updatedAt: now,
    };
    const problem = matchTeamsProblem(doc);
    if (problem) problems.push(`Row ${i + 1}: ${problem}`);
    return { ref: newMatchRef(seasonId), doc };
  });
  if (problems.length > 0) return { status: "bad-rows", problems };

  await runTransaction(async (tx) => {
    for (const { ref, doc } of docs) tx.create(ref, doc);
    logAction(tx, seasonId, {
      actor,
      action: "addSchedule",
      params: { sportId, matches: games },
      changed: [],
      created: docs.map((d) => d.ref),
    });
  });
  return { status: "added", matchIds: docs.map((d) => d.ref.id) };
}

export type EditResult =
  | "ok"
  | "not-found"
  | "scored" // a scored game's colleges can't change, nor can it be cancelled (undo the score first)
  | "unknown-college"
  | "bad-time";

/** Changes teams, venue, start or status. Sport is fixed; new colleges start with blank rosters. */
export async function editMatch(
  seasonId: string,
  matchId: string,
  edit: MatchEdit,
  actor: Actor
): Promise<EditResult> {
  // Also protect internal callers: structural TypeScript arguments can carry
  // extra fields even though the strict HTTP contract no longer permits sport.
  if ("sportId" in edit) throw new ApiError("bad-request", "A game's sport cannot change. Cancel or delete it and create a new game.");
  const colleges = await listColleges(seasonId);
  const startsAt = edit.startsAt ? new Date(edit.startsAt) : null;
  if (startsAt && isNaN(startsAt.getTime())) return "bad-time";

  const ref = matchRef(seasonId, matchId);
  return runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const match = snap.data();
    if (!match) return "not-found";

    const homeCollegeId = edit.homeCollegeId ?? match.homeCollegeId;
    const awayCollegeId = edit.awayCollegeId ?? match.awayCollegeId;
    const changesTeams =
      homeCollegeId !== match.homeCollegeId ||
      awayCollegeId !== match.awayCollegeId;
    if ((changesTeams || edit.status) && match.status === "final") return "scored";
    // A PATCH may omit either side; validate the full teams read in this transaction.
    const problem = matchTeamsProblem({ ...match, homeCollegeId, awayCollegeId });
    if (problem) throw new ApiError("bad-request", problem);
    if ([homeCollegeId, awayCollegeId].some((c) => c !== null && !colleges.some((x) => x.id === c))) return "unknown-college";
    const newStart = startsAt && startsAt.getTime() !== match.startsAt.toMillis()
      ? Timestamp.fromDate(startsAt)
      : null;
    const collegeIds = [...new Set([homeCollegeId, awayCollegeId].filter((c) => c !== null))];
    const roster = await readRosterChanges(tx, seasonId, [{
      before: snap,
      after: { ...match, homeCollegeId, awayCollegeId, collegeIds, startsAt: newStart ?? match.startsAt },
    }]);

    tx.update(ref, {
      homeCollegeId,
      awayCollegeId,
      collegeIds,
      ...(edit.venue !== undefined ? { venue: edit.venue || null } : {}),
      ...(edit.venueDetail !== undefined ? { venueDetail: edit.venueDetail || null } : {}),
      ...(newStart ? { startsAt: newStart } : {}),
      ...(edit.status ? { status: edit.status } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    applyRosterChanges(tx, roster);
    logAction(tx, seasonId, { actor, action: "editMatch", params: { matchId, ...edit }, changed: [snap, ...roster.map((c) => c.before)] });
    return "ok";
  });
}

export type DeleteResult = "ok" | "not-found" | "scored" | "in-bracket";

/**
 * Deletes a game with its roster and score reports: an unscored game outside
 * a bracket (a bracket's games go with the bracket); open review requests
 * about it close. The log keeps a copy of everything deleted.
 */
export async function deleteMatch(seasonId: string, matchId: string, actor: Actor): Promise<DeleteResult> {
  const ref = matchRef(seasonId, matchId);
  return runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const match = snap.data();
    if (!match) return "not-found";
    if (match.status === "final") return "scored";
    if (match.bracketId) return "in-bracket";
    const children = await readChildren(tx, [rosterRef(seasonId, matchId), scoreReportsRef(seasonId, matchId)]);
    const requests = await readGameRequests(tx, seasonId, [matchId]);
    for (const doc of children) tx.delete(doc.ref);
    tx.delete(ref);
    closeGameRequests(tx, requests, actor);
    logAction(tx, seasonId, { actor, action: "deleteMatch", params: { matchId }, changed: [snap, ...children, ...requests] });
    return "ok";
  });
}
