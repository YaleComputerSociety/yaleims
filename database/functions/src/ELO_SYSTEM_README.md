# Elo Rating System Implementation

This document describes the implementation of an Elo rating system for the Yale IMS betting platform. The system replaces the previous win-percentage-based odds calculation with a more sophisticated rating system that provides better bet line initialization based on team performance in specific sports.

## Overview

The Elo system assigns numerical ratings to teams in each sport, with ratings changing based on match results. Higher-rated teams are expected to win more often, and the system automatically adjusts ratings based on actual performance.

## Key Features

- **Per-Sport Ratings**: Each college has separate Elo ratings for each sport
- **Automatic Updates**: Ratings update automatically when matches are scored
- **Bet Line Integration**: Elo ratings are used to initialize more accurate betting lines
- **Match Type Weighting**: Different K-factors for regular season, playoff, and championship matches
- **Fallback System**: Falls back to traditional win percentage if Elo data is insufficient

## Files Added/Modified

### New Files
- `elo_system.ts` - Core Elo rating calculation and management
- `elo_odds_calculator.ts` - Elo-based odds calculation functions
- `initializeEloRatings.ts` - Cloud functions for initializing and managing Elo ratings
- `test_elo_system.ts` - Test functions to verify Elo system functionality

### Modified Files
- `yodds_helpers.ts` - Added Elo-based odds calculator function
- `scoreMatch.ts` - Added automatic Elo rating updates when matches are scored
- `undoScoreMatch.ts` - Added Elo rating reversal when matches are unscored
- `getMatchesPaginated.ts` - Updated to use Elo-based odds calculation
- `index.ts` - Exported new Elo-related functions

## Configuration

### Elo Parameters
```typescript
ELO_CONFIG = {
  INITIAL_RATING: 1500,  // Starting rating for all teams
  K_FACTOR: {
    REGULAR: 32,         // Regular season matches
    PLAYOFF: 48,         // Playoff matches (higher weight)
    FINAL: 64,           // Championship matches (highest weight)
  },
  SPORT_MODIFIERS: {     // Sport-specific volatility adjustments
    "Soccer": 1.0,
    "Flag Football": 1.0,
    // ... other sports
  }
}
```

## Data Structure

### Elo Rating Document
```typescript
interface EloRating {
  college: string;           // College abbreviation (e.g., "BF", "BK")
  sport: string;            // Sport name (e.g., "Flag Football")
  rating: number;           // Current Elo rating
  gamesPlayed: number;      // Number of games played
  lastUpdated: Timestamp;   // Last update timestamp
}
```

### Storage Location
```
/elo_ratings/seasons/{year}/{sport}_{college}
```

## Core Functions

### 1. Rating Calculation
- `calculateExpectedScore(teamRating, opponentRating)` - Calculate expected win probability
- `calculateNewRatings(homeRating, awayRating, result, kFactor)` - Calculate rating changes after a match
- `getKFactor(matchType, sport)` - Get appropriate K-factor for match type and sport

### 2. Rating Management
- `getEloRating(college, sport, year)` - Get or create Elo rating for a team
- `updateEloRatings(matchResult, year)` - Update ratings after a match
- `initializeEloRatings(colleges, sport, year)` - Initialize ratings for all teams

### 3. Odds Calculation
- `eloBasedOddsCalculator()` - Primary odds calculation using Elo ratings
- `getEloWinProbabilities()` - Get win probabilities based on Elo ratings

## API Endpoints

### Initialize Elo Ratings
```
POST /initializeEloRatingsFunction
Body: { "sport": "Flag Football", "year": "2024-2025" }
```

### Get Elo Leaderboard
```
GET /getEloLeaderboardFunction?sport=Flag Football&year=2024-2025
```

### Test Elo System
```
POST /testEloSystem
Body: { "sport": "Flag Football", "year": "2024-2025" }
```

### Calculate Elo Demo
```
POST /calculateEloDemo
Body: { 
  "homeRating": 1500, 
  "awayRating": 1500, 
  "result": 1, 
  "kFactor": 32 
}
```

## Integration Points

### 1. Match Scoring
When a match is scored via `scoreMatch.ts`, the system automatically:
- Updates Elo ratings for both teams
- Uses the match type (Regular/Playoff/Final) to determine K-factor
- Handles draws, forfeits, and regular wins appropriately

### 2. Match Unscoring
When a match is unscored via `undoScoreMatch.ts`, the system:
- Reverses the Elo rating changes
- Applies the opposite result to restore previous ratings

### 3. Odds Calculation
The `getMatchesPaginated.ts` function now uses:
- Elo-based win probabilities as the primary factor
- Betting volume as a secondary factor
- Traditional win percentages as a fallback

## Usage Examples

### Initialize Ratings for a New Season
```typescript
await initializeEloRatings(["BF", "BK", "BR", "DC"], "Flag Football", "2024-2025");
```

### Get Win Probabilities
```typescript
const probabilities = await getEloWinProbabilities("BF", "BK", "Flag Football", "2024-2025");
// Returns: { homeWin: 0.65, awayWin: 0.25, draw: 0.1 }
```

### Calculate Odds
```typescript
const odds = await eloBasedOddsCalculator(
  "BF", "BK", "Flag Football", "2024-2025",
  { team1: 100, team2: 50, draw: 10, forfeit: 5 },
  0.05, 0.02
);
```

## Benefits

1. **More Accurate Bet Lines**: Elo ratings provide better estimates of team strength than simple win percentages
2. **Sport-Specific Ratings**: Teams can have different strengths in different sports
3. **Automatic Updates**: No manual intervention required - ratings update with match results
4. **Match Importance**: Playoff and championship matches have higher impact on ratings
5. **Fallback Safety**: System gracefully falls back to traditional methods if needed

## Migration Notes

- Existing betting data is preserved
- The system can be initialized for any sport/season combination
- Ratings start at 1500 for all teams and adjust based on match results
- No breaking changes to existing API endpoints

## Testing

Use the `testEloSystem` function to verify:
- Rating initialization
- Expected score calculations
- Rating updates after wins/losses/draws
- Win probability calculations
- Leaderboard generation

## Future Enhancements

1. **Home Field Advantage**: Currently set to 40 Elo points, could be sport-specific
2. **Recency Weighting**: Give more weight to recent matches
3. **Strength of Schedule**: Adjust ratings based on opponent quality
4. **Individual Player Ratings**: Track individual player contributions
5. **Seasonal Adjustments**: Reset ratings between seasons with carryover bonuses

## Monitoring

Monitor the system through:
- Elo leaderboards for each sport
- Rating change logs
- Odds accuracy compared to actual results
- System performance metrics

The Elo system provides a robust foundation for more accurate bet line initialization while maintaining compatibility with the existing betting infrastructure.

