# Error Analysis Guide

## How to Use the Error Analysis to Improve Your Model

The error analysis breaks down prediction accuracy across multiple dimensions to help you identify where the model struggles and why. Here's how to interpret each section and what actions to take.

---

## 1. **Accuracy by Sport**

### What it shows:
- Which sports are easy vs hard to predict
- Average Elo difference (skill gap between teams)
- Home win rate, draw rate, forfeit rate per sport

### What to look for:
- **Low accuracy sports** (<60%): These sports may need sport-specific tuning
- **High forfeit rates**: Forfeits add noise; high forfeit sports may need different parameters
- **High draw rates**: Sports with frequent draws need different C_draw values

### Example insights from the output:
```
Flag Football: 51.9% accuracy, 40.7% home win rate, 33.3% forfeit rate
```
**Action**: Flag Football has high forfeits and low accuracy. Consider:
- Increasing `W_forfeit` parameter for this sport specifically
- Using sport-specific modifiers in `sportModifiers` dictionary
- The high forfeit rate (33%) suggests unreliable team commitment

---

## 2. **Accuracy by Elo Difference**

### What it shows:
- How accuracy varies with skill gap between teams
- Average confidence level for each bracket

### What to look for:
- **Close matches (0-50 Elo diff)**: Should be harder to predict (~50% if truly even)
- **Blowouts (400+ Elo diff)**: Should have very high accuracy (>80%)
- **Confidence vs accuracy gap**: If confidence is much lower than actual accuracy, model is underconfident

### Example insights:
```
0-50: 61.5% accuracy, 40.9% avg confidence
50-100: 100% accuracy, 41.2% avg confidence
```
**Action**: The model is **underconfident** - it's achieving 61.5% accuracy but only 40.9% confidence on close matches. Consider:
- Adjusting `C_draw` and `S_draw` to reduce draw probability in close matches
- The model might be predicting too many draws, reducing confidence

---

## 3. **Calibration Analysis**

### What it shows:
- **Well-calibrated**: 70% confidence predictions should be correct 70% of the time
- Each bracket shows if predictions match reality

### What to look for:
- **Overconfident**: Accuracy < Confidence (predicting 80% confident but only 60% accurate)
- **Underconfident**: Accuracy > Confidence (predicting 50% confident but 70% accurate)
- **Good calibration**: ✓ marker indicates accurate calibration

### Example insights:
```
40-50% confidence: 66.7% accuracy → ✗ Poor calibration
```
**Action**: Model is **underconfident** across the board. When it says 40-50% confident, it's actually right 67% of the time. This means:
- Elo ratings might be too conservative
- Draw probabilities might be too high (reducing confidence in winners)
- Consider reducing `C_draw` from 0.30 to 0.20

---

## 4. **Accuracy Over Time**

### What it shows:
- Whether predictions improve as the season progresses
- Average Elo difference increases over time as ratings spread out

### What to look for:
- **Improving accuracy**: Good sign - Elo ratings are stabilizing
- **Flat accuracy**: Model isn't learning from results
- **Decreasing accuracy**: Red flag - model may be overfitting to early-season noise

### Example insights:
```
Period 1: 50.0% accuracy (matches 1-40)
Period 5: 87.5% accuracy (matches 161-200)
```
**Action**: **Strong improvement over time** (50% → 87.5%). This is EXCELLENT! It means:
- Initial Elo (1000) is reasonable as a starting point
- Elo ratings stabilize and become more predictive
- Early season is inherently unpredictable (teams unknown)
- **Recommendation**: For betting, increase stake sizes later in season when accuracy is higher

---

## 5. **Home Field Advantage Analysis**

### What it shows:
- Actual home/away/draw distribution
- Model's prediction bias

### What to look for:
- **Reality**: What % of matches do home teams actually win?
- **Predictions**: What % does the model predict?
- **Bias**: If predictions >> reality, model is overvaluing home field

### Example insights:
```
Reality: 48.0% home wins, 47.5% away wins
Predictions: 64.0% home, 36.0% away
```
**Action**: **Strong home bias in predictions!** Model predicts home win 64% of the time but home only wins 48%. This is a MAJOR issue:
- Yale intramural sports may have **no home field advantage** (neutral venues?)
- The Elo logistic curve naturally favors the higher-rated team, and if home teams tend to have higher Elo early on, this creates bias
- **Fix**: Consider using symmetric Elo (no home advantage) or even reversed home advantage
- The 53.7% away win prediction accuracy vs 80.2% home win accuracy suggests the model struggles more with away predictions

---

## 6. **Key Insights Summary**

Quick actionable takeaways from the analysis.

---

## Action Items Based on This Analysis:

### Immediate fixes:
1. **Home bias correction**: The model heavily over-predicts home wins (64% predicted vs 48% actual)
   - Consider removing home advantage or even giving away teams a small bonus
   - Check if "home" vs "away" is even meaningful in your setup

2. **Underconfidence problem**: The model is too conservative with its predictions
   - Reduce `C_draw` from 0.30 to 0.15-0.20
   - This will make the model more confident in winners

3. **Sport-specific tuning**: Flag Football needs help
   - Add a sport modifier: `sportModifiers: { "Flag Football": 0.8 }`
   - Increase `W_forfeit` weight for high-forfeit sports

### Parameter tuning recommendations:

```typescript
const TUNED_PARAMS: TunableParams = {
  initialElo: 1000,        // Keep - good improvement over time
  baseK_Regular: 32,       // Keep or test 40 for faster learning
  C_draw: 0.15,            // REDUCE from 0.30 - too many draws predicted
  S_draw: 0.002,           // Keep
  W_forfeit: 0.15,         // INCREASE from 0.10 - forfeits are important signal
  V_threshold: 100,        // Keep
  sportModifiers: {
    "Flag Football": 0.8,  // Reduce K-factor for noisy sport
    "Soccer": 1.2,         // Increase for more predictable sport
  },
};
```

### Additional investigation:
- Run `--runAll` to do a full grid search with these hypotheses
- Pay special attention to C_draw values [0.10, 0.15, 0.20, 0.25]
- Test both with and without home field advantage

### Expected improvements:
- **Calibration**: Should improve significantly with lower C_draw
- **Overall accuracy**: May improve 5-10% by fixing home bias
- **Flag Football**: May remain difficult due to high forfeit rate (inherent noise)
- **Later season predictions**: Already excellent (87.5%), focus on early season

---

## Advanced Analysis (Future Additions)

Consider adding these analyses:
1. **Match type breakdown**: Are playoffs harder to predict than regular season?
2. **Opponent strength**: Does the model do better against weak or strong opponents?
3. **Upset analysis**: When the underdog wins, what were the characteristics?
4. **Betting value**: Where is the model most confident but wrong? (Expensive mistakes)
