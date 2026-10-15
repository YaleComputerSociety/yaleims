// Playoff brackets: 15 slots for 14 colleges (two byes), whose games are
// match docs that point at the slot their winner moves to. Tournaments use
// the same shape plus slot 16, the third place game (services/tournaments).
import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";
import type { SlotInput } from "@/types/api";
import type { BracketEntry, MatchDoc } from "@/types/firestore";
import { bracketRef } from "../data/brackets";
import { recalculateRanks } from "../data/colleges";
import {
  createMatch,
  isAlreadyExists,
  matchRef,
  reserveMatchIds,
} from "../data/matches";
import { runTransaction } from "../data/util";
import { isScoredGame, readPointsForWin, reverseResults } from "./standings";

export const BRACKET_SLOTS = 15;

/** The round each slot plays. */
export const SLOT_ROUNDS: Record<number, string> = {
  1: "Bye", 2: "Playoff", 3: "Playoff", 4: "Playoff",
  5: "Quarterfinal", 6: "Quarterfinal",
  7: "Bye", 8: "Playoff", 9: "Playoff", 10: "Playoff",
  11: "Quarterfinal", 12: "Quarterfinal",
  13: "Semifinal", 14: "Semifinal",
  15: "Final", 16: "Third Place",
};

/** The slot a slot's winner moves to (none for the final and third place game). */
const NEXT_SLOT: Record<number, number> = {
  1: 5, 2: 5, 3: 6, 4: 6, 5: 13, 6: 13,
  7: 11, 8: 11, 9: 12, 10: 12, 11: 14, 12: 14,
  13: 15, 14: 15,
};

/** The two slots feeding a quarterfinal or semifinal. */
const FEEDER_SLOTS: Record<number, [number, number]> = {
  5: [1, 2], 6: [3, 4], 11: [7, 8], 12: [9, 10], 13: [5, 6], 14: [11, 12],
};

/**
 * The match docs and slot entries of a new bracket, ids from `firstId` up.
 * Empty slots get "TBD" colleges. A bye's college is its winner (it moves
 * on without a game; D23: no points) and is copied into the quarterfinal it
 * feeds. `extra(slot, idOf)` adds fields per slot (tournaments).
 */
export function buildSlotMatches(opts: {
  slots: number;
  input: SlotInput[];
  firstId: number;
  sport: string;
  inferDivisions: boolean;
  extra?: (slot: number, idOf: (slot: number) => number) => Record<string, unknown>;
}) {
  const { slots, firstId, sport } = opts;
  const bySlot = new Map(opts.input.map((m) => [m.match_slot, m]));
  const idOf = (slot: number) => firstId + slot - 1;
  const entries: BracketEntry[] = [];
  const docs: { id: number; data: Record<string, unknown> }[] = [];

  for (let slot = 1; slot <= slots; slot++) {
    const input = bySlot.get(slot);
    const round = SLOT_ROUNDS[slot];
    const timestamp = input?.timestamp
      ? Timestamp.fromDate(new Date(input.timestamp))
      : Timestamp.now();
    entries.push({ bracket_placement: slot, round, match_id: idOf(slot), timestamp });

    // Brackets: a slot without a division takes its feeders' shared one,
    // so the semifinals inherit what the quarterfinals inferred.
    let division = opts.inferDivisions && input ? input.division : "none";
    if (opts.inferDivisions && division === "none" && FEEDER_SLOTS[slot]) {
      const [top, bottom] = FEEDER_SLOTS[slot].map((s) => bySlot.get(s)?.division);
      if (top && top === bottom) {
        division = top;
        if (input) bySlot.set(slot, { ...input, division });
      }
    }

    let away_college = input ? input.away_college : "TBD";
    let away_seed: number | null = input ? input.away_seed : null;
    if (slot === 5 || slot === 11) {
      const bye = bySlot.get(FEEDER_SLOTS[slot][0]);
      if (bye) {
        away_college = bye.home_college;
        away_seed = bye.home_seed;
      }
    }

    docs.push({
      id: idOf(slot),
      data: {
        away_college,
        away_seed,
        away_college_participants: [],
        away_college_score: null,
        forfeit: false,
        home_college: input ? input.home_college : "TBD",
        home_seed: input ? input.home_seed : null,
        home_college_participants: [],
        home_college_score: null,
        id: idOf(slot),
        location: input ? input.location : "",
        location_extra: input?.location_extra || "",
        sport,
        timestamp,
        type: round,
        winner: round === "Bye" && input ? input.home_college : null,
        next_match_id: NEXT_SLOT[slot] ? idOf(NEXT_SLOT[slot]) : "",
        division,
        playoff_bracket_slot: slot,
        ...opts.extra?.(slot, idOf),
      },
    });
  }
  return { entries, docs };
}

/**
 * Reserves ids and creates a bracket's match docs inside `tx`; null if the
 * id counter is missing. See buildSlotMatches.
 */
export async function createSlotMatches(
  tx: Transaction,
  seasonId: string,
  opts: Omit<Parameters<typeof buildSlotMatches>[0], "firstId">
): Promise<BracketEntry[] | null> {
  const firstId = await reserveMatchIds(tx, opts.slots);
  if (firstId === null) return null;
  const { entries, docs } = buildSlotMatches({ ...opts, firstId });
  for (const { id, data } of docs) {
    createMatch(tx, seasonId, id, data);
  }
  return entries;
}

export type CreateResult = "created" | "exists" | "no-counter" | "id-taken";

/** Creates a season's bracket for `sport` and its 15 match docs, in one transaction. */
export async function createBracket(
  seasonId: string,
  sport: string,
  input: SlotInput[]
): Promise<CreateResult> {
  const ref = bracketRef(seasonId, sport);
  try {
    return await runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return "exists";
      const entries = await createSlotMatches(tx, seasonId, {
        slots: BRACKET_SLOTS,
        input,
        sport,
        inferDivisions: true,
      });
      if (!entries) return "no-counter";
      tx.create(ref, { sport, createdAt: FieldValue.serverTimestamp(), matches: entries });
      return "created";
    });
  } catch (err) {
    if (isAlreadyExists(err)) return "id-taken";
    throw err;
  }
}

/**
 * Reads a bracket's match docs inside `tx`: their refs (to delete), the
 * existing docs, and the ids of games with a result.
 */
export async function readSlotMatches(
  tx: Transaction,
  seasonId: string,
  entries: { match_id: number | string }[]
): Promise<{ refs: DocumentReference<MatchDoc>[]; matches: MatchDoc[]; scoredMatchIds: string[] }> {
  const refs = entries.filter((e) => e.match_id).map((e) => matchRef(seasonId, e.match_id));
  const snaps = refs.length > 0 ? await tx.getAll(...refs) : [];
  const existing = snaps.filter((s) => s.exists);
  return {
    refs,
    matches: existing.map((s) => s.data()!),
    scoredMatchIds: existing.filter((s) => isScoredGame(s.data()!)).map((s) => s.id),
  };
}

/** Outcome of deleting a bracket or tournament. */
export type DeleteResult =
  | { status: "deleted"; matchCount: number }
  | { status: "not-found" }
  | { status: "has-scored-matches"; scoredMatchIds: string[] };

/**
 * Deletes a season's bracket for `sport` and its matches, taking back every
 * point the scored games earned (D24). While games are scored it refuses
 * unless `force`, so the admin confirms first. Then re-ranks the season.
 */
export async function deleteBracket(
  seasonId: string,
  sport: string,
  force: boolean
): Promise<DeleteResult> {
  const ref = bracketRef(seasonId, sport);
  const result = await runTransaction(async (tx): Promise<DeleteResult> => {
    const bracket = (await tx.get(ref)).data();
    if (!bracket) return { status: "not-found" };

    const slots = await readSlotMatches(tx, seasonId, bracket.matches || []);
    if (slots.scoredMatchIds.length > 0 && !force) {
      return { status: "has-scored-matches", scoredMatchIds: slots.scoredMatchIds };
    }
    const pointsForWin = await readPointsForWin(tx, slots.matches);

    reverseResults(tx, seasonId, slots.matches, pointsForWin);
    for (const matchDocRef of slots.refs) tx.delete(matchDocRef);
    tx.delete(ref);
    return { status: "deleted", matchCount: slots.refs.length };
  });
  if (result.status === "deleted") await recalculateRanks(seasonId);
  return result;
}
