// Scoring a match and undoing it. The result and both colleges' standings
// change in one transaction (which also refuses a second score / undo);
// then playoff and tournament brackets advance, tournament placement bonuses
// are settled, and the season is re-ranked.
import "server-only";
import { recalculateRanks } from "../data/colleges";
import { matchRef, type MatchDoc } from "../data/matches";
import { getPointsForWin } from "../data/sports";
import { runTransaction } from "../data/util";
import { applyStandingChanges, standingChanges, type Winner } from "./standings";
import { awardPlacements, reversePlacements } from "./tournaments";

const isDecisive = (winner: Winner) => !!winner && winner !== "Default" && winner !== "Draw";

export interface ScoreInput {
  seasonId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  homeForfeit: boolean;
  awayForfeit: boolean;
  /** Used only when the match doc has no college on that side. */
  homeTeam?: string;
  awayTeam?: string;
  /** The sport whose points_for_win applies (as sent by the admin page). */
  sport: string;
}

export async function scoreMatch(input: ScoreInput): Promise<"scored" | "not-found" | "already-scored"> {
  const { seasonId, homeScore, awayScore, homeForfeit, awayForfeit } = input;
  const ref = matchRef(seasonId, input.matchId);

  const scored = await runTransaction(async (tx) => {
    const match = (await tx.get(ref)).data();
    if (!match) return "not-found" as const;
    if (match.winner) return "already-scored" as const;

    const home = match.home_college || input.homeTeam!;
    const away = match.away_college || input.awayTeam!;
    let winner: Winner;
    if (homeForfeit && awayForfeit) winner = "Default";
    else if (homeForfeit) winner = away;
    else if (awayForfeit) winner = home;
    else if (homeScore == awayScore) winner = "Draw";
    else winner = homeScore > awayScore ? home : away;
    const forfeit = homeForfeit || awayForfeit;

    const pointsForWin = await getPointsForWin(input.sport, tx);
    tx.update(ref, {
      home_college_score: homeScore,
      away_college_score: awayScore,
      forfeit,
      winner,
    });
    applyStandingChanges(tx, seasonId, standingChanges(home, away, winner, forfeit, pointsForWin), 1);
    return { match, home, away, winner };
  });
  if (typeof scored === "string") return scored;

  await advanceBrackets(seasonId, scored.match, scored.home, scored.away, scored.winner);
  await recalculateRanks(seasonId);
  return "scored";
}

/**
 * Moves a decisive result through the bracket. Playoff winners go to
 * next_match_id (not from a Regular game or the Final, and only when the
 * winner has a seed); tournament semifinal losers go to next_match_loser_id.
 * An odd slot fills the destination's away side, an even slot its home side.
 * Then tournament placement bonuses are settled; their failure is logged and
 * the score stands.
 */
async function advanceBrackets(
  seasonId: string,
  match: MatchDoc,
  home: string,
  away: string,
  winner: Winner
): Promise<void> {
  if (!isDecisive(winner)) return;
  const slot = match.playoff_bracket_slot;
  const side = (s: number) => (s % 2 === 1 ? "away" : "home");

  const type = match.type || "Regular";
  if (type !== "Regular" && type !== "Final") {
    const winnerSeed = winner == home ? match.home_seed : match.away_seed;
    if (match.next_match_id && slot && winnerSeed) {
      await matchRef(seasonId, match.next_match_id).update({
        [`${side(slot)}_college`]: winner,
        [`${side(slot)}_seed`]: winnerSeed,
      });
    }
  }

  if (!match.tournament_id) return;
  const loser = winner === home ? away : home;
  if (match.next_match_loser_id && slot) {
    const loserSeed = winner === home ? match.away_seed : match.home_seed;
    await matchRef(seasonId, match.next_match_loser_id).update({
      [`${side(slot)}_college`]: loser,
      [`${side(slot)}_seed`]: loserSeed ?? null,
    });
  }
  try {
    await awardPlacements(seasonId, match.tournament_id, slot!, winner, loser);
  } catch (err) {
    console.error("Placement points failed (match already scored):", err);
  }
}

/**
 * Clears a match's result and takes its points back. Bracket advancement is
 * not undone (the next match keeps the advanced college). A bye has no
 * score to undo (D23).
 */
export async function undoScore(
  seasonId: string,
  matchId: string
): Promise<"undone" | "not-found" | "incomplete" | "bye"> {
  const ref = matchRef(seasonId, matchId);
  const undone = await runTransaction(async (tx) => {
    const match = (await tx.get(ref)).data();
    if (!match) return "not-found" as const;
    if (match.type === "Bye") return "bye" as const;
    const { home_college: home, away_college: away, winner, sport, forfeit } = match;
    if (!home || !away || !sport || !winner || typeof forfeit !== "boolean") {
      return "incomplete" as const;
    }

    const pointsForWin = await getPointsForWin(sport, tx);
    tx.update(ref, {
      home_college_score: null,
      away_college_score: null,
      forfeit: null,
      winner: null,
    });
    applyStandingChanges(tx, seasonId, standingChanges(home, away, winner, forfeit, pointsForWin), -1);
    return match;
  });
  if (typeof undone === "string") return undone;

  if (undone.tournament_id && undone.playoff_bracket_slot) {
    try {
      await reversePlacements(seasonId, undone.tournament_id, undone.playoff_bracket_slot);
    } catch (err) {
      console.error("Reversing placement points failed (score already undone):", err);
    }
  }
  await recalculateRanks(seasonId);
  return "undone";
}
