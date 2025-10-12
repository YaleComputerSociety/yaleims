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
 * Enhanced odds calculator that uses Elo ratings as the primary factor
 * @param homeTeam - Home team abbreviation
 * @param awayTeam - Away team abbreviation
 * @param sport - Sport name
 * @param year - Season year
 * @param bettingVolume - Current betting volume for each outcome
 * @param homeForfeitRate - Home team's historical forfeit rate
 * @param awayForfeitRate - Away team's historical forfeit rate
 * @returns Calculated odds for all outcomes
 */
export async function eloBasedOddsCalculator(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  year: string,
  bettingVolume: BettingVolume,
  homeForfeitRate: number = 0,
  awayForfeitRate: number = 0
): Promise<Odds> {
  const defaultOdds = {
    team1Win: 0.35,
    team2Win: 0.35,
    draw: 0.1,
    forfeit: 0.2,
  };

  try {
    // Get Elo-based win probabilities
    const eloProbabilities = await getEloWinProbabilities(homeTeam, awayTeam, sport, year);
    
    // Calculate betting volume weights
    const totalBettingVolume = bettingVolume.team1 + bettingVolume.team2 + bettingVolume.draw + bettingVolume.forfeit;
    const bettingWeight = totalBettingVolume > 0 ? 1 : 0;

    const team1BettingShare = totalBettingVolume > 0 ? bettingVolume.team1 / totalBettingVolume : 0.35;
    const team2BettingShare = totalBettingVolume > 0 ? bettingVolume.team2 / totalBettingVolume : 0.35;
    const drawBettingShare = totalBettingVolume > 0 ? bettingVolume.draw / totalBettingVolume : 0.1;
    const forfeitBettingShare = totalBettingVolume > 0 ? bettingVolume.forfeit / totalBettingVolume : 0.2;

    // Weight factors
    const eloWeight = 7; // Higher weight for Elo ratings (more reliable than win percentage)
    const bettingWeightValue = bettingWeight;

    // Calculate forfeit probability based on team forfeit rates
    const averageForfeitRate = (homeForfeitRate + awayForfeitRate) / 2;
    const forfeitProbability = Math.max(0.05, Math.min(0.25, averageForfeitRate + 0.05)); // Clamp between 5% and 25%

    // Combine Elo probabilities with betting market sentiment
    const team1Win = (eloProbabilities.homeWin * eloWeight + team1BettingShare * bettingWeightValue) / 
                     (eloWeight + bettingWeightValue || 1);
    const team2Win = (eloProbabilities.awayWin * eloWeight + team2BettingShare * bettingWeightValue) / 
                     (eloWeight + bettingWeightValue || 1);
    const draw = (eloProbabilities.draw * eloWeight + drawBettingShare * bettingWeightValue) / 
                 (eloWeight + bettingWeightValue || 1);
    const forfeit = (forfeitProbability * eloWeight + forfeitBettingShare * bettingWeightValue) / 
                   (eloWeight + bettingWeightValue || 1);

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
    console.error("Error in Elo-based odds calculation:", error);
    return defaultOdds;
  }
}

/**
 * Hybrid odds calculator that combines Elo ratings with traditional win percentages
 * This provides a fallback when Elo ratings are insufficient
 * @param homeTeam - Home team abbreviation
 * @param awayTeam - Away team abbreviation
 * @param sport - Sport name
 * @param year - Season year
 * @param homeWinPercentage - Traditional win percentage for home team
 * @param awayWinPercentage - Traditional win percentage for away team
 * @param bettingVolume - Current betting volume for each outcome
 * @param homeForfeitRate - Home team's historical forfeit rate
 * @param awayForfeitRate - Away team's historical forfeit rate
 * @returns Calculated odds for all outcomes
 */
export async function hybridOddsCalculator(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  year: string,
  homeWinPercentage: number,
  awayWinPercentage: number,
  bettingVolume: BettingVolume,
  homeForfeitRate: number = 0,
  awayForfeitRate: number = 0
): Promise<Odds> {
  const defaultOdds = {
    team1Win: 0.35,
    team2Win: 0.35,
    draw: 0.1,
    forfeit: 0.2,
  };

  try {
    // Get Elo-based probabilities
    const eloProbabilities = await getEloWinProbabilities(homeTeam, awayTeam, sport, year);
    
    // Calculate betting volume weights
    const totalBettingVolume = bettingVolume.team1 + bettingVolume.team2 + bettingVolume.draw + bettingVolume.forfeit;
    const bettingWeight = totalBettingVolume > 0 ? 1 : 0;

    const team1BettingShare = totalBettingVolume > 0 ? bettingVolume.team1 / totalBettingVolume : 0.35;
    const team2BettingShare = totalBettingVolume > 0 ? bettingVolume.team2 / totalBettingVolume : 0.35;
    const drawBettingShare = totalBettingVolume > 0 ? bettingVolume.draw / totalBettingVolume : 0.1;
    const forfeitBettingShare = totalBettingVolume > 0 ? bettingVolume.forfeit / totalBettingVolume : 0.2;

    // Weight factors
    const eloWeight = 5;
    const traditionalWeight = 3;
    const bettingWeightValue = bettingWeight;

    // Calculate traditional probabilities (normalized)
    const rawDrawProbability = Math.max(0, 1 - homeWinPercentage - awayWinPercentage);
    const totalTraditional = homeWinPercentage + awayWinPercentage + rawDrawProbability;
    
    const normalizedHomeWin = totalTraditional > 0 ? homeWinPercentage / totalTraditional : 0.35;
    const normalizedAwayWin = totalTraditional > 0 ? awayWinPercentage / totalTraditional : 0.35;
    const normalizedDraw = totalTraditional > 0 ? rawDrawProbability / totalTraditional : 0.1;

    // Calculate forfeit probability
    const averageForfeitRate = (homeForfeitRate + awayForfeitRate) / 2;
    const forfeitProbability = Math.max(0.05, Math.min(0.25, averageForfeitRate + 0.05));

    // Combine all three factors (Elo, traditional, betting)
    const team1Win = (eloProbabilities.homeWin * eloWeight + 
                     normalizedHomeWin * traditionalWeight + 
                     team1BettingShare * bettingWeightValue) / 
                     (eloWeight + traditionalWeight + bettingWeightValue || 1);
    
    const team2Win = (eloProbabilities.awayWin * eloWeight + 
                     normalizedAwayWin * traditionalWeight + 
                     team2BettingShare * bettingWeightValue) / 
                     (eloWeight + traditionalWeight + bettingWeightValue || 1);
    
    const draw = (eloProbabilities.draw * eloWeight + 
                 normalizedDraw * traditionalWeight + 
                 drawBettingShare * bettingWeightValue) / 
                 (eloWeight + traditionalWeight + bettingWeightValue || 1);
    
    const forfeit = (forfeitProbability * (eloWeight + traditionalWeight) + 
                    forfeitBettingShare * bettingWeightValue) / 
                   (eloWeight + traditionalWeight + bettingWeightValue || 1);

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
