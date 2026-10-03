// elo_odds_calculator.ts
// -----------------------------------------------------------------------------
// PURPOSE
// Turn Elo-based strength + historical forfeit behavior into a 3-outcome
// probability distribution (Home/Away/Draw).
//
// SIDELINED (see README.md): betting was removed, so the v1.1 betting-volume
// ("market sentiment") blend and the moneyline conversion are gone; this is
// the pure model.
//
// v1.1 CHANGES:
// - Forfeits are NO LONGER a predicted outcome
// - Forfeit history TIPS the Home/Away odds via Delta_F adjustment
// - Returns only 3 outcomes: team1Win, team2Win, draw
// - Laplace smoothing for low-sample forfeit rates
//
// DEPENDS ON
// - elo_system.ts  -> getEloWinProbabilities(...), ELO_CONFIG
// - Firestore docs created/updated by initEloSeason.ts + updateEloRatings(...)
// -----------------------------------------------------------------------------
import admin from "../../firebaseAdmin.js";
import { getEloWinProbabilities, ELO_CONFIG } from "./elo_system.js";

const db = admin.firestore();

export interface Odds {
  team1Win: number;
  team2Win: number;
  draw: number;
}

/**
 * Calculate forfeit tipping factor (Delta_F) based on team reliability.
 * Positive Delta_F means away forfeits more -> boost home odds.
 * Uses Laplace smoothing for teams with fewer than threshold matches.
 *
 * NOTE: Uses matches_total (includes forfeits) as denominator, matching
 * the experiment's forfeits_initiated / matches_total.
 */
function calculateForfeitTipping(
  homeDefaults: number,
  homeMatchesTotal: number,
  awayDefaults: number,
  awayMatchesTotal: number
): number {
  const { laplaceSmoothingThreshold } = ELO_CONFIG;

  const getForfeitRate = (defaults: number, matchesTotal: number): number => {
    if (matchesTotal < laplaceSmoothingThreshold) {
      // Laplace smoothing: (successes + 1) / (trials + 2)
      return (Math.max(0, defaults) + 1) / (Math.max(0, matchesTotal) + 2);
    }
    return matchesTotal > 0 ? Math.max(0, defaults) / matchesTotal : 0;
  };

  const homeRate = getForfeitRate(homeDefaults, homeMatchesTotal);
  const awayRate = getForfeitRate(awayDefaults, awayMatchesTotal);

  // Delta_F = Rate_F(Away) - Rate_F(Home)
  return awayRate - homeRate;
}

/**
 * Odds calculator (v1.1 without the betting-volume blend):
 *
 * 1. Get Elo base probabilities (3 outcomes)
 * 2. Apply forfeit tipping (Delta_F adjustment to home/away), normalize
 */
export async function hybridOddsCalculator(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  season: string
): Promise<Odds> {
  const defaultOdds: Odds = { team1Win: 0.45, team2Win: 0.45, draw: 0.10 };

  try {
    // Fetch the 2 team docs for forfeit stats
    const [homeDoc, awayDoc] = await Promise.all([
      db.collection("elo").doc(season).collection("sports").doc(sport)
        .collection("colleges").doc(homeTeam).get(),
      db.collection("elo").doc(season).collection("sports").doc(sport)
        .collection("colleges").doc(awayTeam).get(),
    ]);

    const homeData = homeDoc.data() ?? {};
    const awayData = awayDoc.data() ?? {};

    // Use defaults (= forfeits_initiated) and matches_total for forfeit tipping
    const homeDefaults  = (homeData as any).defaults ?? 0;
    const homeMatchesTotal = (homeData as any).matches_total ?? 0;
    const awayDefaults  = (awayData as any).defaults ?? 0;
    const awayMatchesTotal = (awayData as any).matches_total ?? 0;

    // STEP 1: Base Elo probabilities (P_home + P_away + P_draw = 1)
    const { PHome: eloHome, PDraw: eloDraw, PAway: eloAway } =
      await getEloWinProbabilities(homeTeam, awayTeam, sport, season);

    // STEP 2: Forfeit tipping factor (Delta_F adjusts home/away)
    const deltaF = calculateForfeitTipping(
      homeDefaults, homeMatchesTotal, awayDefaults, awayMatchesTotal
    );

    let modelHome = eloHome + ELO_CONFIG.W_forfeit * deltaF;
    let modelAway = eloAway - ELO_CONFIG.W_forfeit * deltaF;
    let modelDraw = eloDraw;

    // Clamp to [0, 1] and renormalize
    modelHome = Math.max(0, modelHome);
    modelAway = Math.max(0, modelAway);
    modelDraw = Math.max(0, modelDraw);
    const modelSum = modelHome + modelAway + modelDraw;
    if (modelSum <= 0) return defaultOdds;
    modelHome /= modelSum;
    modelAway /= modelSum;
    modelDraw /= modelSum;

    return { team1Win: modelHome, team2Win: modelAway, draw: modelDraw };
  } catch (err) {
    console.error("Error in hybrid odds calculation:", err);
    return defaultOdds;
  }
}
