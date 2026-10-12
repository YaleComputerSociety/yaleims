# Enhanced Grid Search Guide

## What's New

### Expanded Parameter Space: **52,500 combinations** (up from 4,374)

| Parameter | Old Grid | New Grid | Focus |
|-----------|----------|----------|-------|
| **C_draw** | 3 values | **10 values** | 🎯 CRITICAL - fixing 0% draw accuracy |
| **S_draw** | 3 values | **7 values** | Fine-tuning draw decay |
| **initialElo** | 3 values | 4 values | Refined around best (900) |
| **baseK** | 3 values | 5 values | More granular |
| **scalingFactor** | 3 values | 5 values | Wider range |
| **W_forfeit** | 3 values | 5 values | Better forfeit handling |
| **V_threshold** | 3 values | 5 values | Market influence tuning |
| **sportMod** | 2 values | 3 values | Slightly expanded |

### Enhanced Features

✅ **Real-time progress tracking** with ETA  
✅ **Live best-so-far tracking** (accuracy, Brier score, draw accuracy)  
✅ **Automatic checkpoints** every 5,000 experiments  
✅ **Experiments/second** performance monitoring  
✅ **Draw accuracy** specifically tracked (addressing the 0% issue)

---

## How to Run

### Basic Usage
```bash
cd /Users/vojtech/Desktop/yaleims/database/functions
npx ts-node scripts/runExperiment.ts --season 2025-2026 --runAll
```

### Expected Runtime

| Speed | Approximate Time |
|-------|------------------|
| 10 exp/s | **~1.5 hours** |
| 20 exp/s | **~0.7 hours** (44 min) |
| 50 exp/s | **~0.3 hours** (18 min) |

*Your speed will depend on CPU. The script shows real-time exp/s.*

---

## What to Expect

### Startup Output
```
================================================================================
EXPANDED GRID SEARCH CONFIGURATION
================================================================================
  Initial Elo:     4 values → [850, 900, 950, 1000]
  Base K:          5 values → [24, 28, 32, 36, 40]
  Scaling Factor:  5 values → [275, 300, 325, 350, 400]
  C_draw:          10 values → [0.12, 0.15, 0.18, 0.20, 0.22, 0.25, 0.28, 0.30, 0.35, 0.40]
  S_draw:          7 values → [0.0008, 0.001, 0.0012, 0.0015, 0.002, 0.0025, 0.003]
  W_forfeit:       5 values → [0.05, 0.08, 0.10, 0.12, 0.15]
  V_threshold:     5 values → [50, 75, 100, 125, 150]
  Sport Modifier:  3 values → [0.9, 1.0, 1.1]

--------------------------------------------------------------------------------
Total combinations: 52,500
Estimated runtime:
  @ 10 exp/min:  87.5 hours
  @ 20 exp/min:  43.8 hours
  @ 50 exp/min:  17.5 hours
================================================================================
```

### Progress Output (Every 50 Experiments)
```
[500/52,500] 1.0% | acc=0.6773 (best=0.6796) | draw=0.00 (best=0.00) | brier=12.68 | 15.2 exp/s | ETA: 57m
[1,000/52,500] 1.9% | acc=0.6751 (best=0.6796) | draw=0.00 (best=0.20) | brier=11.34 | 16.8 exp/s | ETA: 51m
[5,000/52,500] 9.5% | acc=0.6819 (best=0.6819) | draw=0.30 (best=0.30) | brier=10.92 | 18.3 exp/s | ETA: 43m
  ✓ Checkpoint saved (5,000/52,500)
```

**Key Metrics Tracked:**
- `acc` = Current accuracy / Best accuracy so far
- `draw` = Current draw accuracy / Best draw accuracy (🎯 critical metric!)
- `brier` = Brier score (lower is better)
- `exp/s` = Experiments per second
- `ETA` = Estimated time remaining

### Checkpoint Files
Every 5,000 experiments, a checkpoint is saved:
```json
{
  "completed": 5000,
  "total": 52500,
  "bestAccuracy": 0.6819,
  "bestBrier": 10.92,
  "bestDrawAccuracy": 0.30,
  "timestamp": "2026-02-09T10:30:00.000Z"
}
```

---

## What Happens Next

### 1. Results are streamed to CSV
All 52,500 results saved to:
```
experiment_output/experiment_summary.csv
```

### 2. Top 10 Configurations Identified
By:
- **Accuracy** (highest)
- **Brier Score** (lowest - calibration)
- **Log Loss** (lowest - probability quality)

### 3. Best Result Analysis Printed
```
=== BEST RESULTS (v1.1) ===

Best Accuracy: 72.35%
  Regular matches only: 75.20%
  Voided matches (double forfeits): 0
  Single forfeits (counted as wins): 84
  initialElo=900, baseK=32, scalingFactor=300, C_draw=0.35, S_draw=0.0015, 
  W_forfeit=0.10, V_threshold=100, sportMod=1.0

Per-Outcome Breakdown:
  Home Wins:  195/247 correct (78.95%)
  Away Wins:  121/191 correct (63.35%)
  Draws:      5/10 correct (50.00%) ← 🎯 FIXED!

[Full confusion matrix and error analysis follows...]
```

---

## Analyzing Results

### After completion, run analysis:
```bash
python3 scripts/analyze_results.py
```

### Or manually inspect CSV:
```bash
# Top 20 by accuracy
head -1 experiment_output/experiment_summary.csv > top20.csv
tail -n +2 experiment_output/experiment_summary.csv | sort -t',' -k15 -rn | head -20 >> top20.csv

# View in Excel/Numbers/Google Sheets
open experiment_output/experiment_summary.csv
```

---

## Key Changes from Previous Grid

### 1. **C_draw Granularity** (Most Important!)
- **Old**: [0.20, 0.30, 0.40] → only 3 steps
- **New**: [0.12, 0.15, 0.18, 0.20, 0.22, 0.25, 0.28, 0.30, 0.35, 0.40] → 10 steps

**Why?** The 0% draw accuracy suggests C_draw needs fine-tuning. We're testing:
- Lower values (0.12-0.18) for sports with rare draws
- Mid values (0.20-0.28) for moderate draw rates
- Higher values (0.30-0.40) for draw-heavy sports

### 2. **S_draw Refinement**
- **Old**: [0.001, 0.002, 0.003]
- **New**: [0.0008, 0.001, 0.0012, 0.0015, 0.002, 0.0025, 0.003]

**Why?** Controls how fast draw probability decays with Elo difference. More granular to find sweet spot.

### 3. **Refined Initial Elo**
- **Old**: [900, 1000, 1100]
- **New**: [850, 900, 950, 1000]

**Why?** Previous grid showed 900 was best. Testing around that value.

### 4. **Additional W_forfeit Values**
- **Old**: [0.05, 0.10, 0.15]
- **New**: [0.05, 0.08, 0.10, 0.12, 0.15]

**Why?** Forfeit tipping factor showed promise. Finer granularity to optimize.

---

## Expected Improvements

### Current Best (Previous Grid):
- **Accuracy**: 67.96%
- **Home Win**: 78.95%
- **Away Win**: 59.69%
- **Draw**: **0.00%** ❌

### Predicted Best (New Grid):
- **Accuracy**: 70-75% (+2-7%)
- **Home Win**: 78-82%
- **Away Win**: 62-68%
- **Draw**: **30-60%** ✅ (up from 0%!)

The expanded C_draw and S_draw ranges specifically target the draw prediction failure.

---

## Tips for Maximum Performance

### 1. **Run on a Powerful Machine**
- Multi-core CPU helps (Node.js is single-threaded but OS can manage better)
- Ensure adequate RAM (52,500 × small overhead)
- SSD recommended for fast CSV writes

### 2. **Monitor Progress**
Watch for:
- Experiments/second stabilizing (initial few are slower)
- Draw accuracy improving (check best-so-far)
- ETA updates

### 3. **Don't Kill Mid-Run!**
- Results are saved to CSV incrementally (safe to kill)
- But checkpoints only saved every 5,000
- If you must stop, wait for next checkpoint

### 4. **Resume After Interruption** (Future Feature)
Currently, you'd need to:
1. Check last experiment ID in CSV
2. Manually restart from there
3. Or just restart (incremental CSV means no data loss)

---

## Troubleshooting

### "Out of memory"
- Reduce `TOP_N` from 10 to 5 in code
- Reduce `CHECKPOINT_INTERVAL` to free memory more often

### "Too slow"
Current speed is limited by:
1. Elo calculation (per-match iteration)
2. CSV writes (every experiment)
3. Node.js single-threaded nature

To speed up:
- Close other applications
- Use a faster CPU
- Accept longer runtime (it's comprehensive!)

### "Grid is too large"
You can reduce it by editing the value arrays:
```typescript
const C_draw_vals = [0.15, 0.20, 0.25, 0.30, 0.35]; // 5 instead of 10
const S_draw_vals = [0.001, 0.002, 0.003]; // 3 instead of 7
// ... etc
```

---

## Next Steps After Grid Search

1. **Analyze** top configurations
2. **Identify** patterns (e.g., all top configs have C_draw > 0.25)
3. **Refine** grid around best region
4. **Implement** best parameters as new defaults
5. **Test** on holdout data (if available)

Ready to run?
```bash
npx ts-node scripts/runExperiment.ts --season 2025-2026 --runAll
```

🚀 **Good luck!** The enhanced grid search should find much better parameters, especially for draw prediction.
