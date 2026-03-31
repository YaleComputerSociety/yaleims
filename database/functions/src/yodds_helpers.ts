interface Odds {
  team1Win: number;
  team2Win: number;
  draw: number;
}

/**
 * Legacy odds calculator (non-Elo).
 * Used by getMatchesPaginated for simple win-rate-based odds.
 *
 * v1.1: 3-outcome only (Home/Away/Draw). Forfeit is no longer a predicted class.
 */
export function oddsCalculator(
  team1WinPercentage: number,
  team2WinPercentage: number,
  bettingVolume: { team1: number; team2: number; draw: number },
): Odds {
  const defaultOdds: Odds = { team1Win: 0.45, team2Win: 0.45, draw: 0.10 };

  const totalBettingVolume =
    bettingVolume.team1 + bettingVolume.team2 + bettingVolume.draw;

  // Phased market weighting (same V_threshold = 100 as Elo system)
  const V_THRESHOLD = 100;
  const bettingWeight = Math.min(1.0, totalBettingVolume / V_THRESHOLD);

  const team1BettingShare = totalBettingVolume > 0 ? bettingVolume.team1 / totalBettingVolume : 0.45;
  const team2BettingShare = totalBettingVolume > 0 ? bettingVolume.team2 / totalBettingVolume : 0.45;
  const drawBettingShare = totalBettingVolume > 0 ? bettingVolume.draw / totalBettingVolume : 0.10;

  // Calculate the draw probability based on remaining probability
  const rawDrawProbability = Math.max(0, 1 - team1WinPercentage - team2WinPercentage);

  // Softmax for stability
  const expTeam1 = Math.exp(team1WinPercentage);
  const expTeam2 = Math.exp(team2WinPercentage);
  const expDraw = Math.exp(rawDrawProbability);
  const totalExp = expTeam1 + expTeam2 + expDraw;

  const normalizedTeam1 = expTeam1 / totalExp;
  const normalizedTeam2 = expTeam2 / totalExp;
  const normalizedDraw = expDraw / totalExp;

  // Blend model and market using phased weighting
  const team1Win = (1 - bettingWeight) * normalizedTeam1 + bettingWeight * team1BettingShare;
  const team2Win = (1 - bettingWeight) * normalizedTeam2 + bettingWeight * team2BettingShare;
  const draw = (1 - bettingWeight) * normalizedDraw + bettingWeight * drawBettingShare;

  const totalOdds = team1Win + team2Win + draw;

  return {
    team1Win: totalOdds > 0 ? team1Win / totalOdds : defaultOdds.team1Win,
    team2Win: totalOdds > 0 ? team2Win / totalOdds : defaultOdds.team2Win,
    draw: totalOdds > 0 ? draw / totalOdds : defaultOdds.draw,
  };
}

/**
 * Convert odds ratios (percentages) to moneyline values for 3 outcomes.
 */
export function ratiosToMoneylines(odds: Odds): {
  team1Moneyline: number;
  team2Moneyline: number;
  drawMoneyline: number;
} {
  const convertToMoneyline = (percentage: number): number => {
    if (percentage <= 0 || percentage >= 1) {
      throw new Error("Percentage must be between 0 and 1 (exclusive)");
    }
    return percentage >= 0.5
      ? -Math.round((percentage / (1 - percentage)) * 100)
      : Math.round(((1 - percentage) / percentage) * 100);
  };

  return {
    team1Moneyline: convertToMoneyline(odds.team1Win),
    team2Moneyline: convertToMoneyline(odds.team2Win),
    drawMoneyline: convertToMoneyline(odds.draw),
  };
}

/**
 * Convert moneyline values back to odds ratios (percentages) for 3 outcomes.
 */
export function moneylinesToRatios(moneylines: {
  team1Moneyline: number;
  team2Moneyline: number;
  drawMoneyline: number;
}): Odds {
  const convertToRatio = (moneyline: number): number => {
    if (moneyline > 0) {
      return 100 / (moneyline + 100);
    } else if (moneyline < 0) {
      return -moneyline / (-moneyline + 100);
    } else {
      throw new Error("Moneyline must not be zero");
    }
  };

  return {
    team1Win: convertToRatio(moneylines.team1Moneyline),
    team2Win: convertToRatio(moneylines.team2Moneyline),
    draw: convertToRatio(moneylines.drawMoneyline),
  };
}
