// Tournaments: a 16-slot bracket (the playoff shape plus a third place game)
// whose matches are ordinary match docs, plus placement bonus points on top
// of the per-win points. Changes touch the tournament, its matches and the
// college standings, so each runs in one transaction.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import type { PlacementPoints } from "@/types/firestore";
import { collegeStandingRef, recalculateRanks } from "../data/colleges";
import { isAlreadyExists } from "../data/matches";
import { tournamentRef } from "../data/tournaments";
import { runTransaction } from "../data/util";
import {
  BRACKET_SLOTS,
  createSlotMatches,
  readSlotMatches,
  type CreateResult,
  type DeleteResult,
  type SlotInput,
} from "./brackets";
import { readPointsForWin, reverseResults } from "./standings";

/** Bracket slots that settle placements: the final (1st/2nd) and the third place game. */
export const FINAL_SLOT = 15;
export const THIRD_PLACE_SLOT = 16;
const TOURNAMENT_SLOTS = BRACKET_SLOTS + 1;
/** Semifinal losers drop into the third place game. */
const LOSER_SLOT: Record<number, number> = { 13: THIRD_PLACE_SLOT, 14: THIRD_PLACE_SLOT };

export const DEFAULT_PLACEMENT_POINTS: PlacementPoints = {
  first: 20,
  second: 15,
  third: 10,
};

/** Stored placement points, with the default for any missing or invalid value. */
export function normalizePlacementPoints(raw: any): PlacementPoints {
  const toNumber = (value: any, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
  return {
    first: toNumber(raw?.first, DEFAULT_PLACEMENT_POINTS.first),
    second: toNumber(raw?.second, DEFAULT_PLACEMENT_POINTS.second),
    third: toNumber(raw?.third, DEFAULT_PLACEMENT_POINTS.third),
  };
}

/** Tournament doc ids are slugs of the name (doc ids can't contain slashes). */
export function tournamentSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Creates a season's tournament `id` and its 16 match docs, in one
 * transaction. Bye winners advance without points (D23).
 */
export async function createTournament(
  seasonId: string,
  { id, name, sport, input, placementPoints }: {
    id: string;
    name: string;
    sport: string;
    input: SlotInput[];
    placementPoints: PlacementPoints;
  }
): Promise<CreateResult> {
  const ref = tournamentRef(seasonId, id);
  try {
    return await runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return "exists";
      const entries = await createSlotMatches(tx, seasonId, {
        slots: TOURNAMENT_SLOTS,
        input,
        sport,
        inferDivisions: false,
        extra: (slot, idOf) => ({
          next_match_loser_id: LOSER_SLOT[slot] ? idOf(LOSER_SLOT[slot]) : "",
          tournament_id: id,
          tournament_name: name,
        }),
      });
      if (!entries) return "no-counter";
      tx.create(ref, {
        id,
        name,
        sport,
        season: seasonId,
        createdAt: FieldValue.serverTimestamp(),
        placement_points: placementPoints,
        third_place_slot: THIRD_PLACE_SLOT,
        placements: { first: null, second: null, third: null },
        matches: entries,
      });
      return "created";
    });
  } catch (err) {
    if (isAlreadyExists(err)) return "id-taken";
    throw err;
  }
}

/**
 * Deletes a tournament and its matches and takes back every point they
 * earned: each scored game's result and the placement bonuses (D24). While
 * games are scored it refuses unless `force`, so the admin confirms first.
 * Then re-ranks the season.
 */
export async function deleteTournament(
  seasonId: string,
  tournamentId: string,
  force: boolean
): Promise<DeleteResult> {
  const ref = tournamentRef(seasonId, tournamentId);
  const result = await runTransaction(async (tx): Promise<DeleteResult> => {
    const tournament = (await tx.get(ref)).data();
    if (!tournament) return { status: "not-found" };

    const entries = tournament.matches || [];
    const slots = await readSlotMatches(tx, seasonId, entries);
    if (slots.scoredMatchIds.length > 0 && !force) {
      return { status: "has-scored-matches", scoredMatchIds: slots.scoredMatchIds };
    }
    const pointsForWin = await readPointsForWin(tx, slots.matches);

    reverseResults(tx, seasonId, slots.matches, pointsForWin);
    const points = normalizePlacementPoints(tournament.placement_points);
    const placements = tournament.placements || {};
    for (const key of ["first", "second", "third"] as const) {
      const college = placements[key];
      if (!college) continue;
      tx.update(collegeStandingRef(seasonId, college), {
        points: FieldValue.increment(-points[key]),
      });
    }
    for (const matchDocRef of slots.refs) tx.delete(matchDocRef);
    tx.delete(ref);
    return { status: "deleted", matchCount: entries.length };
  });
  if (result.status === "deleted") await recalculateRanks(seasonId);
  return result;
}

/**
 * After a final or third place game is scored: awards the placement bonuses
 * it settles (final: first + second; third place game: third). Each is
 * recorded on the tournament and awarded only once.
 */
export async function awardPlacements(
  seasonId: string,
  tournamentId: string,
  slot: number,
  winner: string,
  loser: string | null
): Promise<void> {
  if (slot !== FINAL_SLOT && slot !== THIRD_PLACE_SLOT) return;
  if (!winner || winner === "Draw" || winner === "Default") return;

  const ref = tournamentRef(seasonId, tournamentId);
  await runTransaction(async (tx) => {
    const tournament = (await tx.get(ref)).data();
    if (!tournament) return;
    const points = normalizePlacementPoints(tournament.placement_points);
    const placements = { ...(tournament.placements || {}) };

    const awards: { college: string; bonus: number; key: keyof PlacementPoints }[] = [];
    if (slot === FINAL_SLOT) {
      if (!placements.first) awards.push({ college: winner, bonus: points.first, key: "first" });
      if (!placements.second && loser) awards.push({ college: loser, bonus: points.second, key: "second" });
    } else if (!placements.third) {
      awards.push({ college: winner, bonus: points.third, key: "third" });
    }

    for (const { college, bonus, key } of awards) {
      placements[key] = college;
      tx.update(collegeStandingRef(seasonId, college), {
        points: FieldValue.increment(bonus),
      });
    }
    if (awards.length > 0) {
      tx.update(ref, { placements });
    }
  });
}

/**
 * After a final or third place game is unscored: takes back the placement
 * bonuses the tournament recorded for it (only those, so undoing twice
 * can't drain points).
 */
export async function reversePlacements(
  seasonId: string,
  tournamentId: string,
  slot: number
): Promise<void> {
  if (slot !== FINAL_SLOT && slot !== THIRD_PLACE_SLOT) return;

  const ref = tournamentRef(seasonId, tournamentId);
  await runTransaction(async (tx) => {
    const tournament = (await tx.get(ref)).data();
    if (!tournament) return;
    const points = normalizePlacementPoints(tournament.placement_points);
    const placements = { ...(tournament.placements || {}) };

    const keys: (keyof PlacementPoints)[] = slot === FINAL_SLOT ? ["first", "second"] : ["third"];
    let changed = false;
    for (const key of keys) {
      const college = placements[key];
      if (!college) continue;
      tx.update(collegeStandingRef(seasonId, college), {
        points: FieldValue.increment(-points[key]),
      });
      placements[key] = null;
      changed = true;
    }
    if (changed) {
      tx.update(ref, { placements });
    }
  });
}
