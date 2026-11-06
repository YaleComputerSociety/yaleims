// Brackets: a sport's playoffs (15 slots for 14 colleges, two of them byes)
// and tournaments (the same plus slot 16, the third place game, and placement
// bonus points). Their games are ordinary matches that point at the game
// their winner moves to (in a tournament, a semifinal's loser too). Creating
// and deleting a bracket are audit-logged; results move through it as games
// are scored (services/scoring.ts calls readBracketMoves/applyBracketMoves).
import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction,
} from "firebase-admin/firestore";
import { DEFAULT_PLACEMENT_POINTS, type BracketSlotInput } from "@/lib/api/brackets";
import { ApiError } from "@/lib/api/core";
import { bracketIdOf, playoffsName } from "@/lib/brackets";
import { easternDate } from "@/lib/dates";
import { winnerId } from "@/lib/results";
import { matchTeamsProblem } from "@/lib/matchRules";
import type {
  BracketDoc,
  BracketKind,
  BracketSlot,
  Division,
  MatchDoc,
  PlacementPoints,
  Placements,
} from "@/types/firestore";
import { logAction, readAuditedChildren, type Actor } from "../data/auditLog";
import { bracketRef } from "../data/brackets";
import { collegeRef, listColleges, recalculateRanks } from "../data/colleges";
import { matchRef, newMatchRef } from "../data/matches";
import { rosterRef } from "../data/roster";
import { scoreReportsRef } from "../data/scoreReports";
import { getSport } from "../data/sports";
import { runTransaction } from "../data/util";
import { applyResult, isScoredGame, readStandingDocs } from "./standings";

// ── Layout ─────────────────────────────────────────────────────────────────

export const BRACKET_SLOTS = 15;
export const FINAL_SLOT = 15;
export const THIRD_PLACE_SLOT = 16;

/** The round each slot plays. */
export const SLOT_ROUNDS: Record<number, string> = {
  1: "Bye", 2: "Playoff", 3: "Playoff", 4: "Playoff",
  5: "Quarterfinal", 6: "Quarterfinal",
  7: "Bye", 8: "Playoff", 9: "Playoff", 10: "Playoff",
  11: "Quarterfinal", 12: "Quarterfinal",
  13: "Semifinal", 14: "Semifinal",
  15: "Final", 16: "Third Place",
};

/** The slot a slot's winner moves to (none for the final and the third place game). */
const NEXT_SLOT: Record<number, number> = {
  1: 5, 2: 5, 3: 6, 4: 6, 5: 13, 6: 13,
  7: 11, 8: 11, 9: 12, 10: 12, 11: 14, 12: 14,
  13: 15, 14: 15,
};

/** The two slots feeding a quarterfinal or semifinal (a bye feeds the first). */
const FEEDER_SLOTS: Record<number, [number, number]> = {
  5: [1, 2], 6: [3, 4], 11: [7, 8], 12: [9, 10], 13: [5, 6], 14: [11, 12],
};

/** Tournaments: semifinal losers drop into the third place game. */
const LOSER_SLOT: Record<number, number> = { 13: THIRD_PLACE_SLOT, 14: THIRD_PLACE_SLOT };

// ── Create ─────────────────────────────────────────────────────────────────

export type CreateResult =
  | { status: "created"; id: string }
  | { status: "exists" | "unknown-sport" }
  | { status: "bad-input"; error: string };

/**
 * Creates a bracket and its games in one transaction: a sport's playoffs
 * (named "<sport> Playoffs") or a named tournament; the id is a slug of the
 * name. Empty sides get no college ("TBD"). A bye's college moves straight
 * into the quarterfinal it feeds (it earns nothing, D23).
 */
export async function createBracket(
  seasonId: string,
  bracket: {
    kind: BracketKind;
    /** Tournaments only. */
    name?: string;
    sportId: string;
    slots: BracketSlotInput[];
    /** Tournaments only. */
    placementPoints?: PlacementPoints;
  },
  actor: Actor
): Promise<CreateResult> {
  const [sport, colleges] = await Promise.all([getSport(seasonId, bracket.sportId), listColleges(seasonId)]);
  if (!sport) return { status: "unknown-sport" };
  const tournament = bracket.kind === "tournament";
  const name = tournament ? (bracket.name ?? "").trim() : playoffsName(sport.name);
  const id = bracketIdOf(name);
  if (!id) return { status: "bad-input", error: "The name must contain letters or numbers" };
  const slotCount = tournament ? THIRD_PLACE_SLOT : BRACKET_SLOTS;
  const bySlot = new Map(bracket.slots.map((s) => [s.slot, s]));

  // A college id, or null for an empty side; undefined for an unknown one.
  const college = (value: string | null | undefined): string | null | undefined => {
    if (!value) return null;
    return colleges.some((c) => c.id === value) ? value : undefined;
  };
  const refs = new Map<number, DocumentReference<MatchDoc>>();
  for (let slot = 1; slot <= slotCount; slot++) {
    if (SLOT_ROUNDS[slot] !== "Bye") refs.set(slot, newMatchRef(seasonId));
  }

  const slots: BracketSlot[] = [];
  const games: [DocumentReference<MatchDoc>, MatchDoc][] = [];
  const divisions = new Map<number, Division | null>();
  const now = Timestamp.now();
  for (let slot = 1; slot <= slotCount; slot++) {
    const input = bySlot.get(slot);
    const round = SLOT_ROUNDS[slot];
    const home = college(input?.homeCollegeId);
    const away = college(input?.awayCollegeId);
    if (home === undefined || away === undefined) {
      return { status: "bad-input", error: `Slot ${slot}: unknown college` };
    }
    // Playoffs: a slot without a division takes its feeders' shared one (a
    // bye's included), so the semifinals inherit the quarterfinals'.
    let division: Division | null = null;
    if (!tournament) {
      division = input?.division ?? null;
      const feeders = FEEDER_SLOTS[slot]?.map((s) => divisions.get(s));
      if (!division && feeders && feeders[0] && feeders[0] === feeders[1]) division = feeders[0];
      if (input) divisions.set(slot, division);
    }
    const startsAt = input?.startsAt ? new Date(input.startsAt) : now.toDate();
    if (isNaN(startsAt.getTime())) {
      return { status: "bad-input", error: `Slot ${slot}: invalid date` };
    }
    if (round === "Bye") {
      slots.push({
        slot,
        round,
        matchId: null,
        byeCollegeId: home,
        byeSeed: input?.homeSeed || null,
        byeStartsAt: input ? Timestamp.fromDate(startsAt) : null,
      });
      continue;
    }

    // A quarterfinal fed by a bye starts with the bye's college on its away side.
    const bye = FEEDER_SLOTS[slot] && SLOT_ROUNDS[FEEDER_SLOTS[slot][0]] === "Bye"
      ? bySlot.get(FEEDER_SLOTS[slot][0])
      : undefined;
    const homeCollegeId = home;
    const awayCollegeId = bye ? (college(bye.homeCollegeId) ?? null) : away;

    const ref = refs.get(slot)!;
    slots.push({ slot, round, matchId: ref.id, byeCollegeId: null, byeSeed: null, byeStartsAt: null });
    const game: MatchDoc = {
      seasonId,
      sportId: sport.id,
      homeCollegeId,
      awayCollegeId,
      collegeIds: [...new Set([homeCollegeId, awayCollegeId].filter((c) => c !== null))],
      startsAt: Timestamp.fromDate(startsAt),
      venue: input?.venue || null,
      venueDetail: input?.venueDetail || null,
      division,
      stage: "playoff",
      bracketId: id,
      bracketSlot: slot,
      round,
      homeSeed: input?.homeSeed ?? null,
      awaySeed: (bye ? bye.homeSeed : input?.awaySeed) ?? null,
      nextMatchId: NEXT_SLOT[slot] ? (refs.get(NEXT_SLOT[slot])?.id ?? null) : null,
      nextLoserMatchId: tournament && LOSER_SLOT[slot] ? refs.get(LOSER_SLOT[slot])!.id : null,
      pointsForWin: sport.pointsForWin,
      status: "scheduled",
      result: null,
      scoredBy: null,
      scoredAt: null,
      updatedAt: now,
    };
    const problem = matchTeamsProblem(game);
    if (problem) return { status: "bad-input", error: `Slot ${slot}: ${problem}` };
    games.push([ref, game]);
  }

  const days = new Set(games.map(([, g]) => easternDate(g.startsAt.toDate())));
  const doc: BracketDoc = {
    seasonId,
    sportId: sport.id,
    kind: bracket.kind,
    name,
    date: days.size === 1 ? [...days][0] : null,
    slots,
    thirdPlaceSlot: tournament ? THIRD_PLACE_SLOT : null,
    placementPoints: tournament ? (bracket.placementPoints ?? DEFAULT_PLACEMENT_POINTS) : null,
    placements: tournament ? { first: null, second: null, third: null } : null,
    createdAt: now,
  };
  const ref = bracketRef(seasonId, id);
  return runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return { status: "exists" } as const;
    for (const [gameRef, game] of games) tx.create(gameRef, game);
    tx.create(ref, doc);
    logAction(tx, seasonId, {
      actor,
      action: tournament ? "createTournament" : "createBracket",
      params: { name, sportId: bracket.sportId, slots: bracket.slots, placementPoints: doc.placementPoints },
      changed: [],
      created: [ref, ...games.map(([gameRef]) => gameRef)],
    });
    return { status: "created", id } as const;
  });
}

// ── Delete ─────────────────────────────────────────────────────────────────

export type DeleteResult =
  | { status: "deleted"; matchCount: number }
  | { status: "not-found" }
  | { status: "has-scored-matches"; scoredMatchIds: string[] };

/**
 * Deletes a bracket with its games (and their rosters and score reports),
 * taking back every point they earned: each result and the placement
 * bonuses (D24). While games are scored it refuses unless `force`, so the
 * admin confirms first. Then re-ranks the season. `kind`: only a bracket of
 * that kind (else "not-found").
 */
export async function deleteBracket(
  seasonId: string,
  bracketId: string,
  kind: BracketKind | null,
  force: boolean,
  actor: Actor
): Promise<DeleteResult> {
  const ref = bracketRef(seasonId, bracketId);
  const result = await runTransaction(async (tx): Promise<DeleteResult> => {
    const bracketSnap = await tx.get(ref);
    const bracket = bracketSnap.data();
    if (!bracket || (kind && bracket.kind !== kind)) return { status: "not-found" };

    const gameRefs = bracket.slots.filter((s) => s.matchId).map((s) => matchRef(seasonId, s.matchId!));
    const gameSnaps = gameRefs.length > 0 ? await tx.getAll(...gameRefs) : [];
    const scored = gameSnaps.filter((s) => s.exists && isScoredGame(s.data()!));
    if (scored.length > 0 && !force) {
      return { status: "has-scored-matches", scoredMatchIds: scored.map((s) => s.id) };
    }
    const scoredGames = scored.map((s) => s.data()!).filter(isScoredGame);
    const placementColleges = Object.values(bracket.placements ?? {}).filter((c): c is string => !!c);
    const [standingDocs, placementDocs] = await Promise.all([
      readStandingDocs(tx, seasonId, scoredGames),
      placementColleges.length > 0 ? tx.getAll(...placementColleges.map((c) => collegeRef(seasonId, c))) : [],
    ]);
    const changed = [bracketSnap, ...gameSnaps.filter((s) => s.exists), ...standingDocs, ...placementDocs];
    const children = await readAuditedChildren(tx,
      gameRefs.flatMap((r) => [rosterRef(seasonId, r.id), scoreReportsRef(seasonId, r.id)]), changed);

    for (const game of scoredGames) applyResult(tx, seasonId, game, -1, standingDocs);
    takeBackPlacements(tx, seasonId, bracket, ["first", "second", "third"]);
    for (const doc of [...children, ...gameSnaps.filter((s) => s.exists), bracketSnap]) tx.delete(doc.ref);
    logAction(tx, seasonId, {
      actor,
      action: bracket.kind === "tournament" ? "deleteTournament" : "deleteBracket",
      params: { bracketId, force },
      changed: [...changed, ...children],
    });
    return { status: "deleted", matchCount: gameRefs.length };
  });
  if (result.status === "deleted") await recalculateRanks(seasonId);
  return result;
}

// ── Results moving through a bracket ───────────────────────────────────────

/** What moving a game's result through its bracket reads. */
export interface BracketMoves {
  next: DocumentSnapshot<MatchDoc> | null;
  loserNext: DocumentSnapshot<MatchDoc> | null;
  /** The tournament, when the game settles placements (final, third place game). */
  bracket: DocumentSnapshot<BracketDoc> | null;
}

/**
 * Reads, inside `tx`, what scoring or undoing `game` changes in its bracket.
 * A scored winner/loser destination locks this result until its own score is
 * undone. Checking its snapshot here also protects concurrent requests.
 * Call before any write.
 */
export async function readBracketMoves(
  tx: Transaction,
  seasonId: string,
  game: MatchDoc
): Promise<BracketMoves> {
  const read = (id: string | null) => (id ? tx.get(matchRef(seasonId, id)) : null);
  const settles = game.bracketSlot === FINAL_SLOT || game.bracketSlot === THIRD_PLACE_SLOT;
  const [next, loserNext, bracket] = await Promise.all([
    read(game.nextMatchId),
    read(game.nextLoserMatchId),
    game.bracketId && settles ? tx.get(bracketRef(seasonId, game.bracketId)) : null,
  ]);
  const scoredMatchIds = [next, loserNext].flatMap((snap) => snap?.data()?.status === "final" ? [snap.id] : []);
  if (scoredMatchIds.length > 0) {
    throw new ApiError("conflict", "Undo the scored games in the next round before changing this result.", {
      scoredMatchIds,
    });
  }
  return { next, loserNext, bracket };
}

/** The existing docs in `moves`, for the audit log. */
export function movedDocs(moves: BracketMoves): DocumentSnapshot<MatchDoc | BracketDoc>[] {
  const docs: DocumentSnapshot<MatchDoc | BracketDoc>[] = [];
  for (const snap of [moves.next, moves.loserNext, moves.bracket]) {
    if (snap?.exists) docs.push(snap as DocumentSnapshot<MatchDoc | BracketDoc>);
  }
  return docs;
}

/**
 * After a decisive result: the winner moves into the next game (always,
 * D31; its seed with it), a tournament semifinal's loser into the third
 * place game, and a tournament's final or third place game settles its
 * placement bonuses (each awarded once). An odd slot fills the next game's
 * away side, an even slot its home side.
 */
export function applyBracketMoves(
  tx: Transaction,
  seasonId: string,
  game: MatchDoc,
  moves: BracketMoves
): void {
  const winner = game.result && winnerId(game.homeCollegeId, game.awayCollegeId, game.result);
  if (!winner || game.bracketSlot === null) return;
  const winnerIsHome = winner === game.homeCollegeId;
  const loser = winnerIsHome ? game.awayCollegeId : game.homeCollegeId;
  const side = game.bracketSlot % 2 === 1 ? "away" : "home";

  const moveInto = (snap: DocumentSnapshot<MatchDoc> | null, collegeId: string | null, seed: number | null) => {
    const next = snap?.data();
    if (!snap || !next || !collegeId) return;
    const home = side === "home" ? collegeId : next.homeCollegeId;
    const away = side === "away" ? collegeId : next.awayCollegeId;
    const problem = matchTeamsProblem({ ...next, homeCollegeId: home, awayCollegeId: away });
    if (problem) throw new ApiError("conflict", `Cannot advance this result. ${problem}`, { matchId: snap.id });
    tx.update(snap.ref, {
      [`${side}CollegeId`]: collegeId,
      [`${side}Seed`]: seed,
      collegeIds: [...new Set([home, away].filter((c) => c !== null))],
      updatedAt: FieldValue.serverTimestamp(),
    });
  };
  moveInto(moves.next, winner, winnerIsHome ? game.homeSeed : game.awaySeed);
  moveInto(moves.loserNext, loser, winnerIsHome ? game.awaySeed : game.homeSeed);

  const bracket = moves.bracket?.data();
  if (!bracket?.placements || !bracket.placementPoints) return;
  const placements: Placements = { ...bracket.placements };
  const award = (place: keyof Placements, collegeId: string | null) => {
    if (placements[place] || !collegeId) return;
    placements[place] = collegeId;
    tx.update(collegeRef(seasonId, collegeId), {
      points: FieldValue.increment(bracket.placementPoints![place]),
    });
  };
  if (game.bracketSlot === FINAL_SLOT) {
    award("first", winner);
    award("second", loser);
  } else {
    award("third", winner);
  }
  tx.update(moves.bracket!.ref, { placements });
}

/**
 * After a final or third place game's score is undone: takes back the
 * placement bonuses the tournament recorded for that game (only those, so
 * undoing twice can't drain points). Advancement is not undone: the next
 * game keeps the college that moved in.
 */
export function reversePlacements(tx: Transaction, seasonId: string, game: MatchDoc, moves: BracketMoves): void {
  const bracket = moves.bracket?.data();
  if (!bracket) return;
  const places: (keyof Placements)[] = game.bracketSlot === FINAL_SLOT ? ["first", "second"] : ["third"];
  takeBackPlacements(tx, seasonId, bracket, places, moves.bracket!.ref);
}

/** Takes back the bonuses of `places` a tournament awarded; clears them on the bracket if `ref`. */
function takeBackPlacements(
  tx: Transaction,
  seasonId: string,
  bracket: BracketDoc,
  places: (keyof Placements)[],
  ref?: DocumentReference<BracketDoc>
): void {
  if (!bracket.placements || !bracket.placementPoints) return;
  const placements: Placements = { ...bracket.placements };
  for (const place of places) {
    const collegeId = placements[place];
    if (!collegeId) continue;
    tx.update(collegeRef(seasonId, collegeId), {
      points: FieldValue.increment(-bracket.placementPoints[place]),
    });
    placements[place] = null;
  }
  if (ref) tx.update(ref, { placements });
}
