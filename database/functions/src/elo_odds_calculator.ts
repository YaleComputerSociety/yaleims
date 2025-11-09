// elo_odds_calculator.ts
// -----------------------------------------------------------------------------
// PURPOSE
// Turn Elo-based strength + historical forfeit behavior + current betting
// volume into a 4-outcome probability distribution, then (optionally) into
// American moneyline numbers.
//
// DEPENDS ON
// - elo_system.ts  -> getEloWinProbabilities(...)
// - Firestore docs created/updated by initEloSeason.ts + updateEloRatings(...)
// -----------------------------------------------------------------------------
import admin from "./firebaseAdmin.js";
import { getEloWinProbabilities } from "./elo_system.js";

const db = admin.firestore();

interface Odds {
  team1Win: number;
  team2Win: number;
  draw: number;
  forfeit: number;
}

interface BettingVolume {
  team1?: number;
  team2?: number;
  draw?: number;
  forfeit?: number;
}

// convert raw volumes → probabilities
function probabilitiesFromBettingVolume(volume: BettingVolume): Odds {
  const v1 = volume.team1 ?? 0;
  const v2 = volume.team2 ?? 0;
  const vD = volume.draw ?? 0;
  const vF = volume.forfeit ?? 0;
  const total = v1 + v2 + vD + vF;

  if (total <= 0) {
    // “no market yet” placeholder
    return {
      team1Win: 0.25,
      team2Win: 0.25,
      draw: 0.25,
      forfeit: 0.25,
    };
  }

  const p1 = v1 / total;
  const p2 = v2 / total;
  const pD = vD / total;
  const pF = vF / total;
  const sum = p1 + p2 + pD + pF;

  return {
    team1Win: p1 / sum,
    team2Win: p2 / sum,
    draw: pD / sum,
    forfeit: pF / sum,
  };
}

// estimate match-level forfeit chance from team + sport history
function forfeitProbability(
  homeForfeits: number,
  homeMatches: number,
  awayForfeits: number,
  awayMatches: number,
  sportForfeits: number,
  sportMatches: number
): number {
  // tunables
  const ALPHA = 150;
  const BETA = 1.0;
  const W_TEAM = 1.0;
  const FLOOR = 0.0;
  const CEIL = 0.6;

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  const pSport = sportMatches > 0 ? clamp01(sportForfeits / sportMatches) : 0;

  const pHome =
    (Math.max(0, homeForfeits) + ALPHA * pSport) /
    Math.max(1, Math.max(0, homeMatches) + ALPHA);
  const pAway =
    (Math.max(0, awayForfeits) + ALPHA * pSport) /
    Math.max(1, Math.max(0, awayMatches) + ALPHA);

  const termSport = 1 - clamp01(BETA * pSport);
  const termHome = 1 - clamp01(W_TEAM * pHome);
  const termAway = 1 - clamp01(W_TEAM * pAway);

  let pMatch = 1 - termSport * termHome * termAway;
  pMatch = Math.min(Math.max(pMatch, FLOOR), CEIL);

  return pMatch;
}

export async function hybridOddsCalculator(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  season: string,
  bettingVolume: BettingVolume
): Promise<Odds> {
  const defaultOdds: Odds = {
    team1Win: 0.35,
    team2Win: 0.35,
    draw: 0.1,
    forfeit: 0.2,
  };

  try {
    // fetch the 3 docs we need to estimate forfeit
    const [homeDoc, awayDoc, sportDoc] = await Promise.all([
      db
        .collection("elo")
        .doc(season)
        .collection("sports")
        .doc(sport)
        .collection("colleges")
        .doc(homeTeam)
        .get(),
      db
        .collection("elo")
        .doc(season)
        .collection("sports")
        .doc(sport)
        .collection("colleges")
        .doc(awayTeam)
        .get(),
      db.collection("elo").doc(season).collection("sports").doc(sport).get(),
    ]);

    const homeData = homeDoc.data() ?? {};
    const awayData = awayDoc.data() ?? {};
    const sportData = sportDoc.data() ?? {};

    const homeForfeits = (homeData as any).defaults ?? 0;
    const homeMatches = (homeData as any).matches_played ?? 0;
    const awayForfeits = (awayData as any).defaults ?? 0;
    const awayMatches = (awayData as any).matches_played ?? 0;
    const sportForfeits = (sportData as any).defaults ?? 0;
    const sportMatches = (sportData as any).matches_played ?? 0;

    // match-level forfeit chance
    const Pdefault = forfeitProbability(
      homeForfeits,
      homeMatches,
      awayForfeits,
      awayMatches,
      sportForfeits,
      sportMatches
    );

    // Elo-based non-forfeit probabilities
    let { PHome: eloHome, PDraw: eloDraw, PAway: eloAway } =
      await getEloWinProbabilities(homeTeam, awayTeam, sport, season);

    // take out forfeit mass
    eloHome = eloHome * (1 - Pdefault);
    eloAway = eloAway * (1 - Pdefault);
    eloDraw = eloDraw * (1 - Pdefault);

    // market-based probabilities
    const vol = probabilitiesFromBettingVolume(bettingVolume);
    const totalBettingVolume =
      (bettingVolume.team1 ?? 0) +
      (bettingVolume.team2 ?? 0) +
      (bettingVolume.draw ?? 0) +
      (bettingVolume.forfeit ?? 0);

    const volWeight = totalBettingVolume > 0 ? 1 : 0;
    const eloWeight = 5;

    // softmax the market part
    const e1 = Math.exp(vol.team1Win);
    const e2 = Math.exp(vol.team2Win);
    const eD = Math.exp(vol.draw);
    const eF = Math.exp(vol.forfeit);
    const s = e1 + e2 + eD + eF;

    const n1 = e1 / s;
    const n2 = e2 / s;
    const nD = eD / s;
    const nF = eF / s;

    const denom = eloWeight + volWeight || 1;

    const team1Win = (eloWeight * eloHome + volWeight * n1) / denom;
    const team2Win = (eloWeight * eloAway + volWeight * n2) / denom;
    const draw = (eloWeight * eloDraw + volWeight * nD) / denom;
    const forfeit = (eloWeight * Pdefault + volWeight * nF) / denom;

    // normalize to 1
    const total = team1Win + team2Win + draw + forfeit;
    if (total <= 0) {
      return defaultOdds;
    }

    return {
      team1Win: team1Win / total,
      team2Win: team2Win / total,
      draw: draw / total,
      forfeit: forfeit / total,
    };
  } catch (err) {
    console.error("Error in hybrid odds calculation:", err);
    return defaultOdds;
  }
}

// optional helper: turn Odds → moneyline
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
    forfeitML: toML(odds.forfeit),
  };
}
