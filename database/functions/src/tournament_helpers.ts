import admin from "./firebaseAdmin.js";

const db = admin.firestore();

/**
 * Tournaments reuse the 14-team / 15-slot playoff bracket shape and add one
 * extra slot for the third place game, played between the two semifinal losers.
 */
export const TOURNAMENT_SLOT_COUNT = 16;
export const FINAL_SLOT = 15;
export const THIRD_PLACE_SLOT = 16;
export const SEMIFINAL_SLOTS = [13, 14];

export interface MatchSlotPair {
  topMatchSlot: number;
  bottomMatchSlot: number;
}

export const tournamentRounds: Record<number, string> = {
  1: "Bye",
  2: "Playoff",
  3: "Playoff",
  4: "Playoff",
  5: "Quarterfinal",
  6: "Quarterfinal",
  7: "Bye",
  8: "Playoff",
  9: "Playoff",
  10: "Playoff",
  11: "Quarterfinal",
  12: "Quarterfinal",
  13: "Semifinal",
  14: "Semifinal",
  15: "Final",
  16: "Third Place",
};

export const tournamentNextMatchMap: Record<number, number> = {
  1: 5,
  2: 5,
  3: 6,
  4: 6,
  5: 13,
  6: 13,
  7: 11,
  8: 11,
  9: 12,
  10: 12,
  11: 14,
  12: 14,
  13: 15,
  14: 15,
  15: -1,
  16: -1,
};

/**
 * Semifinal losers drop into the third place game instead of being eliminated.
 * Every other slot sends its loser home, so it is absent from this map.
 */
export const tournamentLoserMatchMap: Record<number, number> = {
  13: THIRD_PLACE_SLOT,
  14: THIRD_PLACE_SLOT,
};

export const tournamentPrevMatchMap: Record<number, MatchSlotPair> = {
  5: { topMatchSlot: 1, bottomMatchSlot: 2 },
  6: { topMatchSlot: 3, bottomMatchSlot: 4 },
  13: { topMatchSlot: 5, bottomMatchSlot: 6 },
  11: { topMatchSlot: 7, bottomMatchSlot: 8 },
  12: { topMatchSlot: 9, bottomMatchSlot: 10 },
  14: { topMatchSlot: 11, bottomMatchSlot: 12 },
  15: { topMatchSlot: 13, bottomMatchSlot: 14 },
  16: { topMatchSlot: 13, bottomMatchSlot: 14 },
};

export interface PlacementPoints {
  first: number;
  second: number;
  third: number;
}

export const DEFAULT_PLACEMENT_POINTS: PlacementPoints = {
  first: 20,
  second: 15,
  third: 10,
};

export const normalizePlacementPoints = (raw: any): PlacementPoints => {
  const toNumber = (value: any, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : fallback;

  return {
    first: toNumber(raw?.first, DEFAULT_PLACEMENT_POINTS.first),
    second: toNumber(raw?.second, DEFAULT_PLACEMENT_POINTS.second),
    third: toNumber(raw?.third, DEFAULT_PLACEMENT_POINTS.third),
  };
};

export const tournamentRef = (year: string, tournamentId: string) =>
  db.collection("tournaments").doc("seasons").collection(year).doc(tournamentId);

/**
 * Placement points sit on top of the per-win points every match already awards,
 * so a champion banks the win points for each game plus the first place bonus.
 * Scoring the final settles first and second; scoring the third place game
 * settles third. Each placement is recorded on the tournament doc so it is only
 * ever awarded once and can be reversed if the match is unscored.
 */
export const awardTournamentPlacements = async (
  year: string,
  tournamentId: string,
  slot: number,
  winner: string,
  loser: string | null
): Promise<void> => {
  if (slot !== FINAL_SLOT && slot !== THIRD_PLACE_SLOT) return;
  if (!winner || winner === "Draw" || winner === "Default") return;

  const ref = tournamentRef(year, tournamentId);
  const collegesRef = db
    .collection("colleges")
    .doc("seasons")
    .collection(year);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const data = snap.data() || {};
    const placementPoints = normalizePlacementPoints(data.placement_points);
    const placements = { ...(data.placements || {}) };

    const awards: { college: string; points: number; key: string }[] = [];

    if (slot === FINAL_SLOT) {
      if (!placements.first) {
        awards.push({ college: winner, points: placementPoints.first, key: "first" });
      }
      if (!placements.second && loser) {
        awards.push({ college: loser, points: placementPoints.second, key: "second" });
      }
    } else if (!placements.third) {
      awards.push({ college: winner, points: placementPoints.third, key: "third" });
    }

    for (const award of awards) {
      placements[award.key] = award.college;
      tx.update(collegesRef.doc(award.college), {
        points: admin.firestore.FieldValue.increment(award.points),
      });
    }

    if (awards.length > 0) {
      tx.update(ref, { placements });
    }
  });
};

/**
 * Mirror of awardTournamentPlacements, used when an admin undoes the score on a
 * final or third place game. Only placements this tournament actually recorded
 * are deducted, so undoing twice cannot drain a college's points.
 */
export const reverseTournamentPlacements = async (
  year: string,
  tournamentId: string,
  slot: number
): Promise<void> => {
  if (slot !== FINAL_SLOT && slot !== THIRD_PLACE_SLOT) return;

  const ref = tournamentRef(year, tournamentId);
  const collegesRef = db
    .collection("colleges")
    .doc("seasons")
    .collection(year);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const data = snap.data() || {};
    const placementPoints = normalizePlacementPoints(data.placement_points);
    const placements = { ...(data.placements || {}) };

    const keys = slot === FINAL_SLOT ? ["first", "second"] : ["third"];
    let changed = false;

    for (const key of keys) {
      const college = placements[key];
      if (!college) continue;
      const points =
        key === "first"
          ? placementPoints.first
          : key === "second"
          ? placementPoints.second
          : placementPoints.third;

      tx.update(collegesRef.doc(college), {
        points: admin.firestore.FieldValue.increment(-points),
      });
      placements[key] = null;
      changed = true;
    }

    if (changed) {
      tx.update(ref, { placements });
    }
  });
};
