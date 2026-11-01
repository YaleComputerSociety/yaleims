// The schedule: adding a sport's regular-season games (the hub's schedule
// upload) and editing a game's details (the hub's edit form). Both are
// audit-logged; a reschedule also moves the start time on the game's roster
// entries, in the same transaction.
import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { MatchDoc } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { listColleges } from "../data/colleges";
import { matchRef, newMatchRef } from "../data/matches";
import { rosterRef } from "../data/roster";
import { findSportByName } from "../data/sports";
import { runTransaction } from "../data/util";

/** A regular-season game as the schedule upload sends it. */
export interface ScheduledGame {
  timestamp: string;
  homeCollege: string;
  awayCollege: string;
  location: string;
  locationExtra?: string;
}

export type AddScheduleResult =
  | { status: "added" }
  | { status: "unknown-sport" }
  | { status: "bad-rows"; problems: string[] };

/** Adds a sport's games to a season, all or none: every row needs a date and two known colleges. */
export async function addSchedule(
  seasonId: string,
  sportName: string,
  games: ScheduledGame[],
  actor: Actor
): Promise<AddScheduleResult> {
  const [sport, colleges] = await Promise.all([
    findSportByName(seasonId, sportName),
    listColleges(seasonId),
  ]);
  if (!sport) return { status: "unknown-sport" };
  const known = new Set(colleges.map((c) => c.id));

  const problems: string[] = [];
  const now = Timestamp.now();
  const docs = games.map((g, i) => {
    const startsAt = new Date(g.timestamp);
    if (isNaN(startsAt.getTime())) problems.push(`Row ${i + 1}: invalid date "${g.timestamp}"`);
    for (const c of [g.homeCollege, g.awayCollege]) {
      if (!known.has(c)) problems.push(`Row ${i + 1}: unknown college "${c}"`);
    }
    const doc: MatchDoc = {
      seasonId,
      sportId: sport.id,
      homeCollegeId: g.homeCollege,
      awayCollegeId: g.awayCollege,
      collegeIds: [...new Set([g.homeCollege, g.awayCollege])],
      startsAt: isNaN(startsAt.getTime()) ? now : Timestamp.fromDate(startsAt),
      venue: g.location || null,
      venueDetail: g.locationExtra || null,
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
    return { ref: newMatchRef(seasonId), doc };
  });
  if (problems.length > 0) return { status: "bad-rows", problems };

  await runTransaction(async (tx) => {
    for (const { ref, doc } of docs) tx.create(ref, doc);
    logAction(tx, seasonId, {
      actor,
      action: "addSchedule",
      params: { sport: sportName, matches: games },
      changed: [],
      created: docs.map((d) => d.ref),
    });
  });
  return { status: "added" };
}

/** The fields the hub's edit form sends, in their pre-v3 names. */
export interface MatchEdit {
  home_college?: string;
  away_college?: string;
  location?: string;
  location_extra?: string;
  /** ISO time. */
  timestamp?: string;
  /** The sport's name. */
  sport?: string;
}

export type EditResult =
  | "ok"
  | "not-found"
  | "scored" // a scored game's colleges or sport can't change (undo the score first)
  | "unknown-sport"
  | "unknown-college"
  | "bad-time";

/** Changes a game's colleges, venue, start or sport. */
export async function editMatch(
  seasonId: string,
  matchId: string,
  edit: MatchEdit,
  actor: Actor
): Promise<EditResult> {
  const [sport, colleges] = await Promise.all([
    edit.sport ? findSportByName(seasonId, edit.sport) : null,
    listColleges(seasonId),
  ]);
  if (edit.sport && !sport) return "unknown-sport";
  const known = (c: string | undefined) => c === undefined || colleges.some((x) => x.id === c);
  if (!known(edit.home_college) || !known(edit.away_college)) return "unknown-college";
  const startsAt = edit.timestamp ? new Date(edit.timestamp) : null;
  if (startsAt && isNaN(startsAt.getTime())) return "bad-time";

  const ref = matchRef(seasonId, matchId);
  return runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const match = snap.data();
    if (!match) return "not-found";

    const homeCollegeId = edit.home_college ?? match.homeCollegeId;
    const awayCollegeId = edit.away_college ?? match.awayCollegeId;
    const sportId = sport?.id ?? match.sportId;
    const changesTeams =
      homeCollegeId !== match.homeCollegeId ||
      awayCollegeId !== match.awayCollegeId ||
      sportId !== match.sportId;
    if (changesTeams && match.status === "final") return "scored";
    const newStart = startsAt && startsAt.getTime() !== match.startsAt.toMillis()
      ? Timestamp.fromDate(startsAt)
      : null;
    // Roster entries carry the game's start and sport.
    const roster = newStart || sportId !== match.sportId ? (await tx.get(rosterRef(seasonId, matchId))).docs : [];

    tx.update(ref, {
      homeCollegeId,
      awayCollegeId,
      collegeIds: [...new Set([homeCollegeId, awayCollegeId].filter((c) => c !== null))],
      sportId,
      // A game keeps the points it was created with unless its sport changes.
      pointsForWin: sportId !== match.sportId ? sport!.pointsForWin : match.pointsForWin,
      ...(edit.location !== undefined ? { venue: edit.location || null } : {}),
      ...(edit.location_extra !== undefined ? { venueDetail: edit.location_extra || null } : {}),
      ...(newStart ? { startsAt: newStart } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const entry of roster) {
      tx.update(entry.ref, { startsAt: newStart ?? match.startsAt, sportId });
    }
    logAction(tx, seasonId, { actor, action: "editMatch", params: { matchId, ...edit }, changed: [snap, ...roster] });
    return "ok";
  });
}
