import { getEloWinProbabilities } from "./elo_system.js";
import { oddsToMoneyline } from "./elo_odds_calculator.js";

interface InitialOdds {
  home_college_odds: number;
  away_college_odds: number;
  draw_odds: number;
  default_odds: number;
  home_volume: number;
  away_volume: number;
  draw_volume: number;
  default_volume: number;
}

/**
 * Calculate initial betting odds for a match based on ELO ratings
 * This function sets the initial bet line swayed in favor of the higher ELO team
 * @param homeTeam - Home team abbreviation
 * @param awayTeam - Away team abbreviation
 * @param sport - Sport name
 * @param year - Season year
 * @returns Initial odds and volume data for the match
 */
export async function calculateInitialEloOdds(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  year: string
): Promise<InitialOdds> {
  try {
    // Get ELO-based win probabilities
    const eloProbabilities = await getEloWinProbabilities(homeTeam, awayTeam, sport, year);
    
    // Calculate forfeit probability (typically 10-15% for IMS matches)
    const forfeitProbability = 0.12; // 12% base forfeit rate
    
    // Normalize probabilities to account for forfeits
    const totalNonForfeit = eloProbabilities.homeWin + eloProbabilities.awayWin + eloProbabilities.draw;
    const adjustedHomeWin = eloProbabilities.homeWin * (1 - forfeitProbability) / totalNonForfeit;
    const adjustedAwayWin = eloProbabilities.awayWin * (1 - forfeitProbability) / totalNonForfeit;
    const adjustedDraw = eloProbabilities.draw * (1 - forfeitProbability) / totalNonForfeit;
    
    // Convert to odds format
    const odds = {
      team1Win: adjustedHomeWin,
      team2Win: adjustedAwayWin,
      draw: adjustedDraw,
      forfeit: forfeitProbability,
    };
    
    // Convert odds to moneyline values
    const moneylines = oddsToMoneyline(odds);
    
    return {
      home_college_odds: moneylines.team1ML,
      away_college_odds: moneylines.team2ML,
      draw_odds: moneylines.drawML,
      default_odds: moneylines.forfeitML,
      home_volume: 0,
      away_volume: 0,
      draw_volume: 0,
      default_volume: 0,
    };
  } catch (error) {
    console.error(`Error calculating initial ELO odds for ${homeTeam} vs ${awayTeam}:`, error);
    
    // Fallback to default odds if ELO calculation fails
    return {
      home_college_odds: -110, // Default even odds
      away_college_odds: -110,
      draw_odds: 800, // Default draw odds
      default_odds: 600, // Default forfeit odds
      home_volume: 0,
      away_volume: 0,
      draw_volume: 0,
      default_volume: 0,
    };
  }
}

/**
 * Update match odds after ELO ratings change (e.g., after scoring a match)
 * @param homeTeam - Home team abbreviation
 * @param awayTeam - Away team abbreviation
 * @param sport - Sport name
 * @param year - Season year
 * @returns Updated odds data
 */
export async function updateMatchOddsAfterEloChange(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  year: string
): Promise<Partial<InitialOdds>> {
  try {
    // Get updated ELO-based win probabilities
    const eloProbabilities = await getEloWinProbabilities(homeTeam, awayTeam, sport, year);
    
    // Calculate forfeit probability
    const forfeitProbability = 0.12;
    
    // Normalize probabilities
    const totalNonForfeit = eloProbabilities.homeWin + eloProbabilities.awayWin + eloProbabilities.draw;
    const adjustedHomeWin = eloProbabilities.homeWin * (1 - forfeitProbability) / totalNonForfeit;
    const adjustedAwayWin = eloProbabilities.awayWin * (1 - forfeitProbability) / totalNonForfeit;
    const adjustedDraw = eloProbabilities.draw * (1 - forfeitProbability) / totalNonForfeit;
    
    // Convert to odds format
    const odds = {
      team1Win: adjustedHomeWin,
      team2Win: adjustedAwayWin,
      draw: adjustedDraw,
      forfeit: forfeitProbability,
    };
    
    // Convert odds to moneyline values
    const moneylines = oddsToMoneyline(odds);
    
    return {
      home_college_odds: moneylines.team1ML,
      away_college_odds: moneylines.team2ML,
      draw_odds: moneylines.drawML,
      default_odds: moneylines.forfeitML,
    };
  } catch (error) {
    console.error(`Error updating odds after ELO change for ${homeTeam} vs ${awayTeam}:`, error);
    
    // Return empty object if calculation fails (no update)
    return {};
  }
}
