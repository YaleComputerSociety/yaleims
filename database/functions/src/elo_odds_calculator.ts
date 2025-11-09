import admin from "./firebaseAdmin.js";
const db = admin.firestore();

import { getEloWinProbabilities } from "./elo_system.js";

interface Odds {
  team1Win: number;
  team2Win: number;
  draw: number;
  forfeit: number;
}

interface BettingVolume {
  team1: number;
  team2: number;
  draw: number;
  forfeit: number;
}

/**
 * Calculate probabilities from betting volume.
 */
function probabilitiesFromBettingVolume(
  volume: BettingVolume,
): Odds {
  const total =
    (volume.team1 ?? 0) +
    (volume.team2 ?? 0) +
    (volume.draw ?? 0) +
    (volume.forfeit ?? 0);
  
  if (total <= 0) {
    return {
      // arbitrary equal probabilities if no volume (weight in odds calculation will be 0)
      team1Win: 0.25,
      team2Win: 0.25,
      draw: 0.25,
      forfeit: 0.25,
    };
  }

  const pTeam1 = (volume.team1 ?? 0) / total;
  const pTeam2 = (volume.team2 ?? 0) / total;
  const pDraw = (volume.draw ?? 0) / total;
  const pForfeit = (volume.forfeit ?? 0) / total;

  // Normalize to handle possible rounding
  const sum = pTeam1 + pTeam2 + pDraw + pForfeit;

  return {
    team1Win: pTeam1 / sum,
    team2Win: pTeam2 / sum,
    draw: pDraw / sum,
    forfeit: pForfeit / sum,
  };
}

function forfeitProbability(
  homeForfeits: number,
  homeMatches: number,
  awayForfeits: number,
  awayMatches: number,
  sportForfeits: number,
  sportMatches: number
): number {
  // ---- Tunables (can be adjusted later or made parameters) ----
  const ALPHA = 150;     // prior strength for shrinkage toward sport rate (virtual matches)
  const BETA  = 1.0;     // sport baseline weight in noisy-OR
  const W_TEAM = 1.0;    // team influence weight
  const FLOOR = 0.0;     // min match-level forfeit probability
  const CEIL  = 0.60;    // max match-level forfeit probability

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  // Sport baseline rate (safe if sportMatches = 0)
  const pSport = sportMatches > 0 ? clamp01(sportForfeits / sportMatches) : 0;

  // Shrink team rates toward sport baseline (Beta-Binomial posterior mean)
  const pHome =
    (Math.max(0, homeForfeits) + ALPHA * pSport) /
    Math.max(1, Math.max(0, homeMatches) + ALPHA);

  const pAway =
    (Math.max(0, awayForfeits) + ALPHA * pSport) /
    Math.max(1, Math.max(0, awayMatches) + ALPHA);

  // Noisy-OR combination of independent hazards (sport, home, away)
  const termSport = 1 - clamp01(BETA * pSport);
  const termHome  = 1 - clamp01(W_TEAM * pHome);
  const termAway  = 1 - clamp01(W_TEAM * pAway);

  let pMatch = 1 - termSport * termHome * termAway;

  // Safety clamp to reasonable bounds
  pMatch = Math.min(Math.max(pMatch, FLOOR), CEIL);

  return pMatch;
}

/**
 * Hybrid odds calculator that combines Elo ratings with traditional win percentages
 * This provides a fallback when Elo ratings are insufficient
 * @param homeTeam - Home team abbreviation
 * @param awayTeam - Away team abbreviation
 * @param sport - Sport name
 * @param season - Season year
 * @param bettingVolume - Current betting volume for each outcome
 * @returns Calculated odds for all outcomes
 */
export async function hybridOddsCalculator(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  season: string,
  bettingVolume: BettingVolume
): Promise<Odds> {
  const defaultOdds = {
    team1Win: 0.35,
    team2Win: 0.35,
    draw: 0.1,
    forfeit: 0.2,
  };

  try {
    const [homeDoc, awayDoc, sportDoc] = await Promise.all([
      // Home team stats: /elo/{season}/sports/{sport}/colleges/{homeTeam}
      db.collection("elo").doc(season).collection("sports").doc(sport).collection("colleges").doc(homeTeam).get(),

      // Away team stats: /elo/{season}/sports/{sport}/colleges/{awayTeam}
      db.collection("elo").doc(season).collection("sports").doc(sport).collection("colleges").doc(awayTeam).get(),

      // Sport-wide stats: /elo/{season}/sports/{sport}
      db.collection("elo").doc(season).collection("sports").doc(sport).get()
    ]);

    const homeData = homeDoc.data();
    const awayData = awayDoc.data();
    const sportData = sportDoc.data();

    const homeForfeits = homeData?.defaults || 0;        // ← "defaults" = forfeits
    const homeMatches = homeData?.matches_played || 0;
    const awayForfeits = awayData?.defaults || 0;        // ← "defaults" = forfeits
    const awayMatches = awayData?.matches_played || 0;
    const sportForfeits = sportData?.defaults || 0;      // ← Sport-wide defaults
    const sportMatches = sportData?.matches_played || 0;

    const Pdefault = forfeitProbability(homeForfeits, homeMatches, awayForfeits, awayMatches, sportForfeits, sportMatches);

    // Get Elo-based probabilities
    let {PHome: eloHome, PDraw: eloDraw, PAway: eloAway} = await getEloWinProbabilities(homeTeam, awayTeam, sport, season);
    eloHome = eloHome * (1 - Pdefault);
    eloAway = eloAway * (1 - Pdefault);
    eloDraw = eloDraw * (1 - Pdefault);

    // Calculate betting volume weights
    const totalBettingVolume = bettingVolume.team1 + bettingVolume.team2 + bettingVolume.draw + bettingVolume.forfeit;
    const volWeight = totalBettingVolume > 0 ? 1 : 0;
    const eloWeight = 5;

    const {team1Win: volHome, team2Win: volAway, draw: volDraw, forfeit: volForfeit} = probabilitiesFromBettingVolume(bettingVolume);

    const e1 = Math.exp(volHome),
      e2 = Math.exp(volAway),
      eD = Math.exp(volDraw),
      eF = Math.exp(volForfeit);
    const sum = e1 + e2 + eD + eF;
    const n1 = e1 / sum,
      n2 = e2 / sum,
      nD = eD / sum,
      nF = eF / sum;

    const team1Win = (eloWeight * eloHome + volWeight * n1) / (eloWeight + volWeight || 1);
    const team2Win = (eloWeight * eloAway + volWeight * n2) / (eloWeight + volWeight || 1);
    const draw = (eloWeight * eloDraw + volWeight * nD) / (eloWeight + volWeight || 1);
    const forfeit = (eloWeight * Pdefault + volWeight * nF) / (eloWeight + volWeight || 1);

    // Normalize probabilities to sum to 1
    const totalOdds = team1Win + team2Win + draw + forfeit;

    if (totalOdds <= 0) {
      console.warn(`Invalid total odds calculated: ${totalOdds}, using default odds`);
      return defaultOdds;
    }

    return {
      team1Win: team1Win / totalOdds,
      team2Win: team2Win / totalOdds,
      draw: draw / totalOdds,
      forfeit: forfeit / totalOdds,
    };
  } catch (error) {
    console.error("Error in hybrid odds calculation:", error);
    return defaultOdds;
  }
}

/**
 * Convert odds ratios (percentages) to moneyline values for all outcomes
 * @param odds - Odds object with probabilities
 * @returns Moneyline values for each outcome
 */
export function oddsToMoneyline(odds: Odds): { team1ML: number; team2ML: number; drawML: number; forfeitML: number } {
  const convertToMoneyline = (probability: number): number => {
    if (probability >= 0.5) {
      return Math.round(-100 * probability / (1 - probability));
    } else {
      return Math.round(100 * (1 - probability) / probability);
    }
  };

  return {
    team1ML: convertToMoneyline(odds.team1Win),
    team2ML: convertToMoneyline(odds.team2Win),
    drawML: convertToMoneyline(odds.draw),
    forfeitML: convertToMoneyline(odds.forfeit),
  };
}
