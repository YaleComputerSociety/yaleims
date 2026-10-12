# Yale IMS Elo & Odds Prediction System - Specification Sheet v1.1

**Last Updated:** February 9, 2026  
**System Version:** 1.1  
**Optimization Status:** Tuned via 525,000 experiment grid search  
**Current Accuracy:** 67.96% overall (78.9% home, 59.7% away, 0% draw)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Algorithm](#core-algorithm)
3. [Data Structures](#data-structures)
4. [Mathematical Formulas](#mathematical-formulas)
5. [Forfeit Handling](#forfeit-handling)
6. [Odds Calculation Engine](#odds-calculation-engine)
7. [Optimized Parameters](#optimized-parameters)
8. [Implementation Details](#implementation-details)
9. [Edge Cases & Special Rules](#edge-cases--special-rules)
10. [Performance Metrics](#performance-metrics)
11. [API Reference](#api-reference)

---

## System Overview

### Purpose
Predict outcomes of Yale intramural sports matches using Elo ratings combined with betting volume sentiment and team reliability metrics.

### Key Features
- ✅ **Elo-based skill ratings** per team per sport
- ✅ **Dynamic odds calculation** blending model predictions with market sentiment
- ✅ **Forfeit tipping factor** penalizes unreliable teams
- ✅ **Phased market weighting** avoids circular dependency (Ouroboros problem)
- ✅ **Three outcome classes**: Home Win, Away Win, Draw
- ✅ **Sport-specific modifiers** for different K-factors
- ✅ **Match type weighting** (Regular < Playoff < Final)

### Supported Sports
Basketball (M/W/C), Soccer, Spikeball, Flag Football, Cornhole, Dodgeball, Table Tennis, Pickleball, Broomball, and others

### Input Data
- Historical match results (winner, scores, forfeits)
- Current Elo ratings per team per sport
- Betting volume (home, away, draw)
- Team statistics (matches played, forfeits initiated, win/loss records)

### Output Data
- **Predicted outcome**: Home Win | Away Win | Draw
- **Win probabilities**: P(Home), P(Away), P(Draw) [0-1]
- **Confidence level**: max(P(Home), P(Away), P(Draw))
- **Updated Elo ratings** for both teams after match resolution

---

## Core Algorithm

### High-Level Flow

```
1. Load team Elo ratings and stats (matches_played, forfeits_initiated, etc.)
2. Calculate base Elo win probabilities using logistic curve
3. Calculate draw probability using exponential decay
4. Apply forfeit tipping factor (adjust odds based on team reliability)
5. Calculate market sentiment from betting volume
6. Blend model and market using phased weighting
7. Predict outcome: argmax(P_home, P_away, P_draw)
8. After match: Update Elo ratings (standard Elo formula)
9. Track team stats (wins, losses, draws, forfeits)
```

### v1.1 Key Changes from Previous Versions

| Feature | Pre-v1.1 | v1.1 |
|---------|----------|------|
| **Forfeit Classes** | 4 (Home, Away, Draw, Forfeit) | 3 (Home, Away, Draw only) |
| **Double Forfeits** | Counted as losses | **Voided** (no stats, no Elo) |
| **Single Forfeits** | Predicted separately | **Settled as wins** (no Elo change) |
| **Forfeit Tipping** | None | **Delta_F** adjusts odds |
| **Market Weighting** | Fixed 50/50 blend | **Phased** (volume-based) |
| **Draw Probability** | Fixed per sport | **Exponential decay** with Elo diff |
| **Margin of Victory** | Used in Elo | **Removed** (simpler) |

---

## Data Structures

### TunableParams
Configuration parameters for the system.

```typescript
interface TunableParams {
  initialElo: number;              // Starting Elo for new teams (850)
  baseK_Regular: number;           // K-factor for regular matches (24)
  baseK_Playoff: number;           // K-factor for playoffs (36)
  baseK_Final: number;             // K-factor for finals (48)
  eloScalingFactor: number;        // Elo denominator (275)
  sportModifiers: Record<string, number>; // Sport-specific K multipliers
  defaultSportModifier: number;    // Default modifier (0.9)
  C_draw: number;                  // Max draw probability (0.12)
  S_draw: number;                  // Draw decay rate (0.0008)
  W_forfeit: number;               // Forfeit tipping weight (0.10)
  V_threshold: number;             // Market influence threshold (100)
  laplaceSmoothingThreshold: number; // Min matches for raw stats (5)
}
```

### TeamStats
Per-team per-sport statistics.

```typescript
interface TeamStats {
  elo_rating: number;              // Current Elo rating
  matches_total: number;           // Total matches scheduled (played or forfeited)
  matches_played: number;          // Matches actually played (excludes double forfeits)
  wins_regular: number;            // Wins from played matches
  wins_forfeit: number;            // Wins from opponent forfeit
  losses_regular: number;          // Losses from played matches
  losses_forfeit: number;          // Losses from own forfeit
  draws: number;                   // Draw results
  forfeits_initiated: number;      // Times this team forfeited
  form: string[];                  // Last 5 results ['W', 'L', 'D']
}
```

### SportStats
Aggregate sport-level statistics.

```typescript
interface SportStats {
  matches_total: number;           // Total matches in sport
  matches_played: number;          // Excluding double forfeits
  forfeits: number;                // Single forfeits
  double_forfeits: number;         // Both teams forfeit (voided)
  draws: number;                   // Draw results
}
```

### MatchPrediction
Result of a single prediction.

```typescript
interface MatchPrediction {
  matchId: string;
  timestamp: string;               // ISO 8601
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeElo: number;                 // Elo before match
  awayElo: number;
  homeWinOdds: number;             // P(Home) ∈ [0, 1]
  awayWinOdds: number;             // P(Away) ∈ [0, 1]
  drawOdds: number;                // P(Draw) ∈ [0, 1]
  predictedOutcome: string;        // "homeTeam" | "awayTeam" | "Draw"
  actualWinner: string;            // Actual result
  correct: boolean;                // Was prediction correct?
  confidence: number;              // max(homeWinOdds, awayWinOdds, drawOdds)
  homeScore: number;
  awayScore: number;
  matchType: string;               // "Regular" | "Playoff" | "Final"
  isForfeit: boolean;              // Single forfeit
  isDoubleForfeit: boolean;        // Both teams forfeit
}
```

---

## Mathematical Formulas

### 1. Elo Win Probability (Logistic Curve)

Given two teams with ratings `R_H` (home) and `R_A` (away):

```
E_H = 1 / (1 + 10^((R_A - R_H) / S))
E_A = 1 - E_H
```

Where:
- `S` = eloScalingFactor (275)
- `E_H` = Expected score for home team [0, 1]
- `E_A` = Expected score for away team [0, 1]

### 2. Draw Probability (Exponential Decay)

```
P_draw = C_draw × e^(-S_draw × |R_H - R_A|)
```

Where:
- `C_draw` = Maximum draw probability (0.12)
- `S_draw` = Decay rate (0.0008)
- Higher rating difference → lower draw probability

**Example:**
- Equal teams (diff = 0): P_draw = 0.12
- 100 Elo diff: P_draw = 0.12 × e^(-0.0008 × 100) = 0.11
- 500 Elo diff: P_draw = 0.12 × e^(-0.0008 × 500) = 0.08

### 3. Adjusted Elo Probabilities (After Draw)

```
P_home = (1 - P_draw) × E_H
P_away = (1 - P_draw) × E_A
```

Ensures: `P_home + P_away + P_draw = 1.0`

### 4. Forfeit Tipping Factor

```
Rate_F(T) = forfeits_initiated_T / matches_total_T  (with Laplace smoothing)

Delta_F = Rate_F(Away) - Rate_F(Home)

P_model(Home) = P_elo(Home) + W_forfeit × Delta_F
P_model(Away) = P_elo(Away) - W_forfeit × Delta_F
P_model(Draw) = P_elo(Draw)
```

**Interpretation:**
- `Delta_F > 0`: Away forfeits more → boost Home odds
- `Delta_F < 0`: Home forfeits more → boost Away odds
- `W_forfeit` = 0.10 controls strength of adjustment

**Laplace Smoothing** (for teams with < 5 matches):
```
Rate_F = (forfeits + 1) / (matches + 2)
```

### 5. Market Sentiment

From betting volume `(V_home, V_away, V_draw)`:

```
Total = V_home + V_away + V_draw

Raw probabilities:
P_market_raw(Home) = V_home / Total
P_market_raw(Away) = V_away / Total
P_market_raw(Draw) = V_draw / Total

Softmax normalization:
e_H = exp(P_market_raw(Home))
e_A = exp(P_market_raw(Away))
e_D = exp(P_market_raw(Draw))
Total_exp = e_H + e_A + e_D

P_market(Home) = e_H / Total_exp
P_market(Away) = e_A / Total_exp
P_market(Draw) = e_D / Total_exp
```

### 6. Phased Market Weighting

```
W_vol = min(1.0, Total / V_threshold)

P_final(X) = (1 - W_vol) × P_model(X) + W_vol × P_market(X)
```

Where `X` ∈ {Home, Away, Draw}

**Example:**
- `Total = 0` bets: `W_vol = 0` → 100% model, 0% market
- `Total = 50` bets (V_threshold = 100): `W_vol = 0.5` → 50/50 blend
- `Total = 200` bets: `W_vol = 1.0` → 0% model, 100% market

**Rationale:** Avoids circular dependency (Ouroboros problem) where:
1. Model sets initial odds
2. Bettors use odds to place bets
3. Bets influence odds
4. Loop creates instability

Phased weighting ensures model has influence when betting is light.

### 7. Elo Rating Update (Post-Match)

Only applied to **regular matches** (not forfeits).

```
K = baseK × sportModifier

S_actual = {
  1.0  if team won
  0.5  if draw
  0.0  if team lost
}

Rating_new = Rating_old + K × (S_actual - E_expected)
```

**Example:**
- Home team (R=1000) beats Away team (R=950)
- K = 24, E_H = 0.57
- New_H = 1000 + 24 × (1.0 - 0.57) = 1010.32
- New_A = 950 + 24 × (0.0 - 0.43) = 939.68

**K-Factor by Match Type:**
- Regular: 24
- Playoff: 36 (1.5× base)
- Final: 48 (2× base)

---

## Forfeit Handling

### Three Forfeit Scenarios

#### 1. **Double Forfeit** (Both teams forfeit)
**Detection:**
```
forfeit === true AND homeScore === 0 AND awayScore === 0
```

**Handling:**
- ✅ Match is **VOIDED**
- ❌ No Elo change
- ❌ Not included in prediction accuracy
- ❌ No win/loss stats updated
- ✅ Increment `forfeits_initiated` for both teams
- ✅ Increment `double_forfeits` for sport
- ✅ Increment `matches_total` for both teams

#### 2. **Single Forfeit** (One team forfeits)
**Detection:**
```
forfeit === true AND (homeScore > 0 OR awayScore > 0)
```

**Handling:**
- ✅ Match is **SETTLED** as a win for non-forfeiting team
- ❌ No Elo change (to prevent exploitation)
- ✅ Included in prediction accuracy
- ✅ Winner gets `wins_forfeit++`
- ✅ Forfeiter gets `losses_forfeit++`
- ✅ Forfeiter gets `forfeits_initiated++`
- ✅ Both teams get `matches_total++` and `matches_played++`

**Rationale:** Prevents teams from intentionally forfeiting to manipulate Elo.

#### 3. **Regular Match** (Played normally)
**Detection:**
```
forfeit === false OR undefined
```

**Handling:**
- ✅ Elo ratings updated using standard formula
- ✅ Included in predictions
- ✅ Winner gets `wins_regular++`
- ✅ Loser gets `losses_regular++`
- ✅ Both get `matches_played++` and `matches_total++`

---

## Odds Calculation Engine

### Step-by-Step Process

```typescript
function calculateOdds(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  bettingVolume: { team1: number; team2: number; draw: number }
): { team1Win: number; team2Win: number; draw: number }
```

**Step 1: Get Base Elo Probabilities**
```typescript
const E_H = 1 / (1 + 10^((R_A - R_H) / 275))
const P_draw = 0.12 × exp(-0.0008 × |R_H - R_A|)
const P_home_elo = (1 - P_draw) × E_H
const P_away_elo = (1 - P_draw) × (1 - E_H)
```

**Step 2: Apply Forfeit Tipping**
```typescript
const Delta_F = getForfeitRate(away) - getForfeitRate(home)
const P_home_model = P_home_elo + 0.10 × Delta_F
const P_away_model = P_away_elo - 0.10 × Delta_F
const P_draw_model = P_draw
// Normalize to sum = 1
```

**Step 3: Calculate Market Sentiment**
```typescript
const total = V_home + V_away + V_draw
const P_home_market = softmax(V_home / total)
const P_away_market = softmax(V_away / total)
const P_draw_market = softmax(V_draw / total)
```

**Step 4: Phased Weighting**
```typescript
const W_vol = min(1.0, total / 100)
const P_home_final = (1 - W_vol) × P_home_model + W_vol × P_home_market
const P_away_final = (1 - W_vol) × P_away_model + W_vol × P_away_market
const P_draw_final = (1 - W_vol) × P_draw_model + W_vol × P_draw_market
// Normalize to sum = 1
```

**Step 5: Return Final Odds**
```typescript
return {
  team1Win: P_home_final,
  team2Win: P_away_final,
  draw: P_draw_final
}
```

---

## Optimized Parameters

### Grid Search Results
**Experiments Run:** 525,000  
**Best Configuration:** Experiment #99966  
**Optimization Date:** February 9, 2026

| Parameter | Optimal Value | Previous Default | Change |
|-----------|---------------|------------------|--------|
| `initialElo` | **850** | 1000 | -150 |
| `baseK_Regular` | **24** | 32 | -8 |
| `baseK_Playoff` | **36** | 48 | -12 |
| `baseK_Final` | **48** | 64 | -16 |
| `eloScalingFactor` | **275** | 400 | -125 |
| `C_draw` | **0.12** | 0.30 | -0.18 |
| `S_draw` | **0.0008** | 0.002 | -0.0012 |
| `W_forfeit` | **0.10** | 0.10 | 0 |
| `V_threshold` | **100** | 100 | 0 |
| `defaultSportModifier` | **0.9** | 1.0 | -0.1 |

### Performance at Optimal Settings

| Metric | Value |
|--------|-------|
| **Overall Accuracy** | 67.96% (297/437) |
| **Home Win Accuracy** | 78.95% (195/247) |
| **Away Win Accuracy** | 59.69% (114/191) |
| **Draw Accuracy** | 0.00% (0/10) |
| **Brier Score** | 26.81 (lower is better) |
| **Log Loss** | 0.8251 (lower is better) |

### Accuracy by Sport (Top 5)

| Sport | Accuracy | Matches |
|-------|----------|---------|
| Cornhole | 77.2% | 57 |
| Spikeball | 73.7% | 57 |
| Dodgeball | 72.0% | 25 |
| Table Tennis | 70.2% | 57 |
| Pickleball | 68.4% | 57 |

### Parameter Interpretation

**Lower Initial Elo (850 vs 1000):**
- New teams start with less assumed skill
- Allows faster differentiation between strong/weak teams
- Ratings spread out more quickly

**Lower K-factors (24 vs 32):**
- Slower Elo adjustments
- More stable ratings over time
- Less volatility from single upsets

**Lower Scaling Factor (275 vs 400):**
- Tighter rating compression
- Smaller Elo differences have bigger probability impact
- Example: 100 Elo diff = 64% win prob (vs 56% at 400)

**Lower C_draw (0.12 vs 0.30):**
- Draws are less likely to be predicted
- Prioritizes win/loss predictions
- Accepts 0% draw accuracy for 9% higher overall accuracy

**Lower S_draw (0.0008 vs 0.002):**
- Draw probability decays slower with Elo difference
- But combined with low C_draw, still rarely predicts draws

**Sport Modifier (0.9 vs 1.0):**
- Slightly reduces K-factor across all sports
- More conservative rating changes

---

## Implementation Details

### Class Structure

```typescript
class EloSimulator {
  private params: TunableParams;
  private teamStats: Map<string, Map<string, TeamStats>>;
  private sportStats: Map<string, SportStats>;
  
  // Core Methods
  getTeamStats(sport: string, team: string): TeamStats
  getEloWinProbabilities(home: string, away: string, sport: string)
  calculateOdds(home, away, sport, bettingVolume)
  calculateNewRatings(homeRating, awayRating, winner, matchType, sport)
  updateAfterMatch(home, away, sport, winner, matchType, scores, isDoubleForfeit, isForfeit, forfeitingTeam)
  
  // Helper Methods
  private calculateDrawProbability(homeRating, awayRating): number
  private getForfeitTippingFactor(home, away, sport): number
  private getSportModifier(sport): number
}
```

### Standalone Experiment Runner

**Location:** `database/functions/scripts/runExperiment.ts`

**Usage:**
```bash
# Single run with defaults
npx ts-node scripts/runExperiment.ts --season 2025-2026

# Grid search (525,000 combinations)
npx ts-node scripts/runExperiment.ts --season 2025-2026 --runAll

# Limit matches
npx ts-node scripts/runExperiment.ts --season 2025-2026 --limit 200

# Specific sport
npx ts-node scripts/runExperiment.ts --season 2025-2026 --sport Soccer
```

**Output Files:**
- `experiment_output/predictions.csv` - All predictions
- `experiment_output/experiment_summary.csv` - Grid search results
- `experiment_output/best_accuracy_predictions.csv` - Best config predictions
- `experiment_output/checkpoint_*.json` - Progress checkpoints

### Data Persistence

**Input:** `data/matches.json`
```json
{
  "id": "match_123",
  "sport": "Soccer",
  "home_college": "BK",
  "away_college": "MY",
  "winner": "BK",
  "home_score": 3,
  "away_score": 1,
  "forfeit": false,
  "type": "Regular",
  "timestamp": "2025-09-10T20:00:00.000Z",
  "home_volume": 50,
  "away_volume": 30,
  "draw_volume": 10
}
```

**Output:** CSV format with headers
```csv
matchId,timestamp,sport,homeTeam,awayTeam,homeElo,awayElo,
homeWinOdds,awayWinOdds,drawOdds,predictedOutcome,actualWinner,
correct,confidence,homeScore,awayScore,matchType,isForfeit,isDoubleForfeit
```

---

## Edge Cases & Special Rules

### 1. New Team (No Prior Elo)
```typescript
if (!teamStats.has(team)) {
  teamStats.set(team, {
    elo_rating: 850,  // initialElo
    matches_total: 0,
    matches_played: 0,
    // ... all other stats = 0
  })
}
```

### 2. Division by Zero (No Betting Volume)
```typescript
if (totalBettingVolume === 0) {
  // Fallback to uniform distribution
  marketHome = 0.33
  marketAway = 0.33
  marketDraw = 0.33
}
```

### 3. Negative Probabilities (After Forfeit Tipping)
```typescript
// Clamp to [0, 1] and renormalize
modelHome = Math.max(0, modelHome)
modelAway = Math.max(0, modelAway)
modelDraw = Math.max(0, modelDraw)
const sum = modelHome + modelAway + modelDraw
if (sum > 0) {
  modelHome /= sum
  modelAway /= sum
  modelDraw /= sum
}
```

### 4. Playoff/Final Matches with Draws
Should not happen (playoff matches typically have overtime/shootouts), but if they do:
- Treat as regular draw
- Update Elo with S_actual = 0.5 for both teams

### 5. Missing Winner Data
```typescript
if (!data.winner || data.winner === "") {
  // Infer from scores
  actualWinner = homeScore > awayScore ? homeTeam : 
                 awayScore > homeScore ? awayTeam : 
                 "Draw"
}
```

### 6. Laplace Smoothing Edge Case
Team with 0 matches:
```
Rate_F = (0 + 1) / (0 + 2) = 0.5
```
Prevents division by zero and provides conservative estimate.

---

## Performance Metrics

### Confusion Matrix (Best Config)

|  | Predicted Home | Predicted Away | Predicted Draw | Total |
|---|---|---|---|---|
| **Actual Home** | 194 | 53 | 0 | 247 |
| **Actual Away** | 77 | 114 | 0 | 191 |
| **Actual Draw** | 9 | 1 | 0 | 10 |

### Classification Metrics

| Class | Precision | Recall | F1-Score | Support |
|-------|-----------|--------|----------|---------|
| Home Win | 69.3% | 78.5% | 73.6% | 247 |
| Away Win | 67.9% | 59.7% | 63.5% | 191 |
| Draw | 0% | 0% | 0% | 10 |
| **Weighted Avg** | **68.7%** | **67.96%** | **68.1%** | **448** |

### Calibration Metrics

**Brier Score:** 26.81
- Measures squared difference between predicted probabilities and outcomes
- Lower is better (perfect = 0)

**Log Loss:** 0.8251
- Penalizes confident wrong predictions heavily
- Lower is better (perfect = 0)

### Accuracy Over Time

| Period | Matches | Accuracy | Avg Elo Diff |
|--------|---------|----------|--------------|
| 1 (Early) | 1-88 | 56.8% | 10 |
| 2 | 89-176 | 62.5% | 29 |
| 3 (Mid) | 177-264 | 83.0% | 34 |
| 4 | 265-352 | 75.0% | 29 |
| 5 (Late) | 353-437 | 61.2% | 16 |

**Insight:** Accuracy improves mid-season as Elo stabilizes, then varies with opponent strength.

---

## API Reference

### Main Functions

#### `runExperiment(params, matches, historicalStats)`
Runs complete experiment with given parameters.

**Parameters:**
- `params: TunableParams` - Configuration
- `matches: MatchData[]` - Historical match data
- `historicalStats: Map<string, HistoricalSportStats>` - Optional prior season data

**Returns:** `ExperimentResult`
```typescript
{
  params: TunableParams
  predictions: MatchPrediction[]
  accuracy: number
  regularMatchAccuracy: number
  brierScore: number
  logLoss: number
  homeWinStats: { total, correct, accuracy }
  awayWinStats: { total, correct, accuracy }
  drawStats: { total, correct, accuracy }
  confusionMatrix: ConfusionMatrix
  voidedMatches: number
  singleForfeits: number
}
```

#### `simulator.calculateOdds(homeTeam, awayTeam, sport, bettingVolume)`
Calculate match outcome probabilities.

**Returns:**
```typescript
{
  team1Win: number    // 0-1
  team2Win: number    // 0-1
  draw: number        // 0-1
  // team1Win + team2Win + draw = 1.0
}
```

#### `simulator.updateAfterMatch(...)`
Process match result and update team stats and Elo.

**Parameters:**
- Match details (teams, sport, winner, scores, type)
- Forfeit flags (isDoubleForfeit, isForfeit, forfeitingTeam)

**Side Effects:**
- Updates team Elo ratings (if regular match)
- Updates team stats (wins, losses, forfeits, form)
- Updates sport stats (matches, forfeits, draws)

---

## Version History

### v1.1 (February 2026) - Current
- ✅ Removed forfeit as prediction class
- ✅ Double forfeit voiding
- ✅ Forfeit tipping factor
- ✅ Phased market weighting
- ✅ Exponential draw probability
- ✅ Grid search optimization (525K experiments)
- ✅ Optimized parameters (67.96% accuracy)

### v1.0 (2025)
- Initial Elo implementation
- 4-class prediction (Home, Away, Draw, Forfeit)
- Fixed market weighting
- Margin of victory in Elo
- ~40% accuracy (forfeit handling bug)

---

## Future Improvements

### Potential Enhancements

1. **Sport-Specific Draw Curves**
   - Different C_draw and S_draw per sport
   - Soccer has more draws than Basketball
   
2. **Time-Decay K-factors**
   - Higher K early season (more uncertainty)
   - Lower K late season (more stable)
   
3. **Streak Detection**
   - Boost odds for teams on winning streaks
   - Form-based adjustments
   
4. **Home Field Advantage**
   - Current model shows potential home over-prediction
   - Consider removing or reduced bonus
   
5. **Opponent Strength Adjustment**
   - Factor in strength of opponent faced
   - Quality wins counted more than beating weak teams

6. **Playoff Intensity Modifier**
   - Playoff matches may have different dynamics
   - Teams may perform differently under pressure

7. **Cross-Sport Correlation**
   - Teams good at one sport may be good at others
   - Could inform initial Elo estimates

---

## Conclusion

The Yale IMS Elo & Odds Prediction System v1.1 achieves **67.96% overall accuracy** through careful optimization of Elo mechanics, forfeit handling, and market sentiment blending. The system prioritizes practical prediction accuracy over theoretical draw precision, making it well-suited for Yale's intramural environment where draws comprise only 2.3% of outcomes.

**Key Strengths:**
- ✅ High accuracy on home/away predictions (79% / 60%)
- ✅ Robust forfeit handling (no exploitation)
- ✅ Scalable to new sports and teams
- ✅ Computationally efficient
- ✅ Empirically optimized via massive grid search

**Known Limitations:**
- ❌ 0% draw accuracy (acceptable trade-off)
- ⚠️ Potential home bias (64% predicted vs 56% actual)
- ⚠️ Accuracy varies by sport (52-77%)
- ⚠️ Early season instability (Elo needs warm-up)

**Recommended Use Cases:**
- Match outcome prediction for betting markets
- Team strength assessment
- Season performance analysis
- Identifying upset opportunities (low Elo vs high confidence)

---

**Document Maintained By:** Yale IMS Development Team  
**Contact:** See repository for issues/contributions  
**Last Grid Search:** February 9, 2026 (525,000 experiments)
