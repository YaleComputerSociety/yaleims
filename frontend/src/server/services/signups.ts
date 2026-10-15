// Game sign-ups. A sign-up lives in two places: the player on the match's
// roster (home_college_participants / away_college_participants) and the
// match on the player's user-season doc. Both change in one transaction.
import "server-only";
import type { MatchParticipant, UserSeasonMatch } from "@/types/firestore";
import { matchRef } from "../data/matches";
import { userSeasonRef } from "../data/users";
import { runTransaction } from "../data/util";

export const ROSTER_SIDES = [
  "home_college_participants",
  "away_college_participants",
] as const;
export type RosterSide = (typeof ROSTER_SIDES)[number];

export function isRosterSide(value: unknown): value is RosterSide {
  return ROSTER_SIDES.includes(value as RosterSide);
}

/** Why a sign-up or withdrawal didn't happen. */
type CommonRefusal =
  | "no-match"
  | "no-rosters"; // the match doc lacks a participants array
export type SignUpResult = "ok" | CommonRefusal | "already-signed-up";
export type WithdrawResult = "ok" | CommonRefusal | "no-user-season" | "not-signed-up";

interface SignupTarget {
  email: string;
  seasonId: string;
  matchId: string | number;
  side: RosterSide;
}

// Stored values aren't validated on write. An empty object reads as an empty
// list (some user-season docs store `matches: {}`); any other non-array would
// make the old functions throw (500), so it still does instead of being
// overwritten.
function storedList<T>(value: unknown): T[] {
  if (!value) return [];
  if (isEmptyObject(value)) return [];
  if (!Array.isArray(value)) throw new Error("Stored list is not an array");
  return [...value];
}

function isEmptyObject(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).length === 0
  );
}

/**
 * Adds the player to the match roster and the match to their season.
 * Either side may already be recorded (a half-applied earlier attempt), so
 * only the missing one is written; "already-signed-up" if both are. A
 * missing user-season doc (no season rollover script creates it any more)
 * is created here.
 */
export async function signUp({
  email,
  name,
  seasonId,
  matchId,
  side,
  matchTimestamp,
}: SignupTarget & { name: string; matchTimestamp: string }): Promise<SignUpResult> {
  const mRef = matchRef(seasonId, matchId);
  const uRef = userSeasonRef(email, seasonId);
  return runTransaction(async (tx) => {
    const [matchSnap, userSeasonSnap] = await Promise.all([tx.get(mRef), tx.get(uRef)]);
    const match = matchSnap.data();
    if (!match) return "no-match";
    if (!match.home_college_participants || !match.away_college_participants) {
      return "no-rosters";
    }
    const userSeason = userSeasonSnap.data();

    const roster = storedList<MatchParticipant>(match[side]);
    const signups = storedList<UserSeasonMatch>(userSeason?.matches);
    const onRoster = roster.some((p) => p.email === email);
    const inSeason = signups.some((m) => Number(m?.id) === Number(matchId));
    if (onRoster && inSeason) return "already-signed-up";

    if (!onRoster) {
      tx.update(mRef, { [side]: [...roster, { email, name }] });
    }
    if (!inSeason) {
      const matches = [...signups, { id: Number(matchId), timestamp: matchTimestamp }];
      if (userSeason) {
        tx.update(uRef, { matches });
      } else {
        tx.create(uRef, { matches });
      }
    }
    return "ok";
  });
}

/** Removes the player from the match roster and the match from their season. */
export async function withdraw({
  email,
  seasonId,
  matchId,
  side,
}: SignupTarget): Promise<WithdrawResult> {
  const mRef = matchRef(seasonId, matchId);
  const uRef = userSeasonRef(email, seasonId);
  return runTransaction(async (tx) => {
    const [matchSnap, userSeasonSnap] = await Promise.all([tx.get(mRef), tx.get(uRef)]);
    const match = matchSnap.data();
    if (!match) return "no-match";
    if (!match.home_college_participants || !match.away_college_participants) {
      return "no-rosters";
    }
    const roster = storedList<MatchParticipant>(match[side]);
    const rosterIndex = roster.findIndex((p) => p.email === email);
    if (rosterIndex === -1) return "not-signed-up";
    const userSeason = userSeasonSnap.data();
    if (!userSeason) return "no-user-season";

    roster.splice(rosterIndex, 1);
    tx.update(mRef, { [side]: roster });

    const signups = storedList<UserSeasonMatch>(userSeason.matches);
    const seasonIndex = signups.findIndex((m) => Number(m.id) === Number(matchId));
    if (seasonIndex !== -1) {
      signups.splice(seasonIndex, 1);
      tx.update(uRef, { matches: signups });
    }
    return "ok";
  });
}
