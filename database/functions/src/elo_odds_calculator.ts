// elo_odds_calculator.ts
// -----------------------------------------------------------------------------
// PURPOSE
// Turn Elo-based strength + historical forfeit behavior + current betting
// volume into a 3-outcome probability distribution (Home/Away/Draw), then
// (optionally) into American moneyline numbers.
//
// v1.1 CHANGES:
// - Forfeits are NO LONGER a predicted outcome
// - Forfeit history TIPS the Home/Away odds via Delta_F adjustment
// - Returns only 3 outcomes: team1Win, team2Win, draw
// - When no betting volume exists, pure model probabilities are returned
// - Phased market weighting when volume > 0
// - Laplace smoothing for low-sample forfeit rates
//
// DEPENDS ON
// - elo_system.ts  -> getEloWinProbabilities(...), ELO_CONFIG
// - Firestore docs created/updated by initEloSeason.ts + updateEloRatings(...)
// -----------------------------------------------------------------------------
import admin from "./firebaseAdmin.js";
import { getEloWinProbabilities, ELO_CONFIG } from "./elo_system.js";

const db = admin.firestore();

export interface Odds {
  team1Win: number;
  team2Win: number;
  draw: number;
}

interface BettingVolume {
  team1?: number;
  team2?: number;
  draw?: number;
  forfeit?: number; // kept for backward compat but ignored in predictions
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
 * 5-step hybrid odds calculator (v1.1):
 *
 * 1. Get Elo base probabilities (3 outcomes)
 * 2. Apply forfeit tipping (Delta_F adjustment to home/away)
 * 3. If no betting volume, return pure model probabilities
 * 4. If volume exists: compute market sentiment, phased weighting
 * 5. Blend model and market, normalize to sum = 1
 */
export async function hybridOddsCalculator(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  season: string,
  bettingVolume: BettingVolume
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
    if (modelSum > 0) {
      modelHome /= modelSum;
      modelAway /= modelSum;
      modelDraw /= modelSum;
    }

    // STEP 3: Check betting volume — if none, return pure model probabilities
    const v1 = bettingVolume.team1 ?? 0;
    const v2 = bettingVolume.team2 ?? 0;
    const vD = bettingVolume.draw ?? 0;
    const totalBettingVolume = v1 + v2 + vD;

    if (totalBettingVolume <= 0) {
      // No market data — use pure model probabilities
      return { team1Win: modelHome, team2Win: modelAway, draw: modelDraw };
    }

    // STEP 4: Compute market sentiment from betting volume (3 outcomes only)
    const volTotal = v1 + v2 + vD;
    let marketHome = v1 / volTotal;
    let marketAway = v2 / volTotal;
    let marketDraw = vD / volTotal;

    // Apply softmax normalization to market probabilities for stability
    const e1 = Math.exp(marketHome);
    const e2 = Math.exp(marketAway);
    const eD = Math.exp(marketDraw);
    const softmaxSum = e1 + e2 + eD;

    marketHome = e1 / softmaxSum;
    marketAway = e2 / softmaxSum;
    marketDraw = eD / softmaxSum;

    // Phased market weighting
    const volWeight = Math.min(ELO_CONFIG.maxVolWeight, totalBettingVolume / ELO_CONFIG.V_threshold);

    // STEP 5: Blend model and market, then normalize
    const finalHome = (1 - volWeight) * modelHome + volWeight * marketHome;
    const finalAway = (1 - volWeight) * modelAway + volWeight * marketAway;
    const finalDraw = (1 - volWeight) * modelDraw + volWeight * marketDraw;

    const finalSum = finalHome + finalAway + finalDraw;
    if (finalSum <= 0) return defaultOdds;

    return {
      team1Win: finalHome / finalSum,
      team2Win: finalAway / finalSum,
      draw: finalDraw / finalSum,
    };
  } catch (err) {
    console.error("Error in hybrid odds calculation:", err);
    return defaultOdds;
  }
}

/**
 * Convert 3-outcome probability to American moneylines.
 */
export function oddsToMoneyline(odds: Odds) {
  const toML = (p: number): number => {
    const probability = Math.min(Math.max(p, 0.0001), 0.9999);
    if (probability >= 0.5) {
      return Math.round((-100 * probability) / (1 - probability));
    }
    return Math.round((100 * (1 - probability)) / probability);
  };

  return {
    team1ML: toML(odds.team1Win),
    team2ML: toML(odds.team2Win),
    drawML: toML(odds.draw),
  };
}
