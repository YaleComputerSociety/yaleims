interface Odds {
  team1Win: number;
  team2Win: number;
  draw: number;
  forfeit: number;
}

// Function to calculate odds
// we have each team's rates for wins, losses, draws and forfeits
// we also have the betting volume for each of the four categories
function oddsCalculator(
  team1WinPercentage: number, // Team 1's win percentage from past games (0 to 1)
  team2WinPercentage: number, // Team 2's win percentage from past games (0 to 1)
  bettingVolume: { team1: number; team2: number; draw: number; forfeit: number }, // Betting volume for each outcome
  team1ForfeitRate: number, // Team 1's forfeit rate (0 to 1)
  team2ForfeitRate: number, // Team 2's forfeit rate (0 to 1)
): Odds {
  const defaultOdds = { team1Win: 0.35, team2Win: 0.35, draw: 0.1, forfeit: 0.2 };

  const totalBettingVolume =
    bettingVolume.team1 + bettingVolume.team2 + bettingVolume.draw + bettingVolume.forfeit;

  const bettingWeight = totalBettingVolume > 0 ? 1 : 0;

  const team1BettingShare = totalBettingVolume > 0 ? bettingVolume.team1 / totalBettingVolume : 0.35;
  const team2BettingShare = totalBettingVolume > 0 ? bettingVolume.team2 / totalBettingVolume : 0.35;
  const drawBettingShare = totalBettingVolume > 0 ? bettingVolume.draw / totalBettingVolume : 0.1;
  const forfeitBettingShare = totalBettingVolume > 0 ? bettingVolume.forfeit / totalBettingVolume : 0.2;

  const pastGamesWeight = 1;

  // Calculate the draw probability based on remaining probability
  const rawDrawProbability = 1 - team1WinPercentage - team2WinPercentage;

  // Softmax win and draw probabilities
  const expTeam1 = Math.exp(team1WinPercentage);
  const expTeam2 = Math.exp(team2WinPercentage);
  const expDraw = Math.exp(rawDrawProbability);

  const totalExp = expTeam1 + expTeam2 + expDraw;

  const normalizedTeam1Performance = expTeam1 / totalExp;
  const normalizedTeam2Performance = expTeam2 / totalExp;
  const normalizedDrawPerformance = expDraw / totalExp;

  const team1Forfeit = team1ForfeitRate;
  const team2Forfeit = team2ForfeitRate;

  const remainingForfeitProbability = Math.max(
    0,
    1 - normalizedTeam1Performance - normalizedTeam2Performance - normalizedDrawPerformance
  );

  const normalizedForfeitPerformance = Math.max(
    0,
    remainingForfeitProbability - team1Forfeit - team2Forfeit
  );

  const team1Win =
    (normalizedTeam1Performance * pastGamesWeight + team1BettingShare * bettingWeight) /
    (pastGamesWeight + bettingWeight || 1);

  const team2Win =
    (normalizedTeam2Performance * pastGamesWeight + team2BettingShare * bettingWeight) /
    (pastGamesWeight + bettingWeight || 1);

  const draw =
    (normalizedDrawPerformance * pastGamesWeight + drawBettingShare * bettingWeight) /
    (pastGamesWeight + bettingWeight || 1);

  const forfeit =
    (normalizedForfeitPerformance * pastGamesWeight + forfeitBettingShare * bettingWeight) /
    (pastGamesWeight + bettingWeight || 1);

  const totalOdds = team1Win + team2Win + draw + forfeit;

  return {
    team1Win: totalOdds > 0 ? team1Win / totalOdds : defaultOdds.team1Win,
    team2Win: totalOdds > 0 ? team2Win / totalOdds : defaultOdds.team2Win,
    draw: totalOdds > 0 ? draw / totalOdds : defaultOdds.draw,
    forfeit: totalOdds > 0 ? forfeit / totalOdds : defaultOdds.forfeit,
  };
}


// Function to convert odds ratios (percentages) to moneyline values for all outcomes
function ratiosToMoneylines(odds: Odds): { team1Moneyline: number; team2Moneyline: number; drawMoneyline: number; forfeitMoneyline: number} {
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
    forfeitMoneyline: convertToMoneyline(odds.forfeit),
  };
}

// Function to convert moneyline values back to odds ratios (percentages) for all outcomes
function moneylinesToRatios(moneylines: { team1Moneyline: number; team2Moneyline: number; drawMoneyline: number; forfeitMoneyline: number}): Odds {
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
    forfeit: convertToRatio(moneylines.forfeitMoneyline),
  };
}
