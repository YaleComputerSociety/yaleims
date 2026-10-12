#!/usr/bin/env python3
"""Analyze grid search results and find optimal configuration"""

import pandas as pd

# Read all results
df = pd.read_csv('experiment_output/experiment_summary.csv')

print("=" * 100)
print("GRID SEARCH ANALYSIS - 525,000 EXPERIMENTS")
print("=" * 100)

# Overall stats
print(f"\nTotal experiments: {len(df):,}")
print(f"Best overall accuracy: {df['accuracy'].max():.4f} ({df['accuracy'].max()*100:.2f}%)")
print(f"Best draw accuracy: {df['drawAccuracy'].max():.4f} ({df['drawAccuracy'].max()*100:.2f}%)")
print(f"Best Brier score: {df['brierScore'].min():.4f}")

# Non-zero draw accuracy
draw_configs = df[df['drawAccuracy'] > 0]
print(f"\nConfigurations with draw predictions: {len(draw_configs):,} ({len(draw_configs)/len(df)*100:.1f}%)")
if len(draw_configs) > 0:
    print(f"  Best draw accuracy: {draw_configs['drawAccuracy'].max():.4f}")
    print(f"  Best overall accuracy among those: {draw_configs['accuracy'].max():.4f}")

# Top by overall accuracy
print("\n" + "=" * 100)
print("TOP 5 BY OVERALL ACCURACY:")
print("=" * 100)
top5 = df.nlargest(5, 'accuracy')
for idx, row in top5.iterrows():
    print(f"\n#{list(top5.index).index(idx) + 1} - Accuracy: {row['accuracy']:.4f} ({row['accuracy']*100:.2f}%)")
    print(f"  Home: {row['homeWinAccuracy']:.3f}, Away: {row['awayWinAccuracy']:.3f}, Draw: {row['drawAccuracy']:.3f}")
    print(f"  Params: Elo={int(row['initialElo'])} K={int(row['baseK_Regular'])} Scale={int(row['eloScalingFactor'])}")
    print(f"          C_draw={row['C_draw']:.3f} S_draw={row['S_draw']:.4f}")
    print(f"          W_forfeit={row['W_forfeit']:.2f} V_thresh={int(row['V_threshold'])} SportMod={row['defaultSportModifier']:.1f}")
    print(f"  Brier: {row['brierScore']:.4f}, LogLoss: {row['logLoss']:.4f}")

# Best with non-zero draw accuracy
if len(draw_configs) > 0:
    print("\n" + "=" * 100)
    print("TOP 5 WITH NON-ZERO DRAW ACCURACY:")
    print("=" * 100)
    top5_draw = draw_configs.nlargest(5, 'accuracy')
    for idx, row in top5_draw.iterrows():
        print(f"\n#{list(top5_draw.index).index(idx) + 1} - Accuracy: {row['accuracy']:.4f} ({row['accuracy']*100:.2f}%)")
        print(f"  Home: {row['homeWinAccuracy']:.3f}, Away: {row['awayWinAccuracy']:.3f}, Draw: {row['drawAccuracy']:.3f} ✓")
        print(f"  Params: Elo={int(row['initialElo'])} K={int(row['baseK_Regular'])} Scale={int(row['eloScalingFactor'])}")
        print(f"          C_draw={row['C_draw']:.3f} S_draw={row['S_draw']:.4f}")
        print(f"          W_forfeit={row['W_forfeit']:.2f} V_thresh={int(row['V_threshold'])} SportMod={row['defaultSportModifier']:.1f}")
        print(f"  Brier: {row['brierScore']:.4f}, LogLoss: {row['logLoss']:.4f}")

# Recommended configuration (balance between accuracy and draw prediction)
print("\n" + "=" * 100)
print("RECOMMENDED CONFIGURATION:")
print("=" * 100)

# Strategy: Find configs with drawAcc > 0 and best overall accuracy
if len(draw_configs) > 0:
    best_balanced = draw_configs.nlargest(1, 'accuracy').iloc[0]
else:
    best_balanced = df.nlargest(1, 'accuracy').iloc[0]

print(f"\nOverall Accuracy: {best_balanced['accuracy']:.4f} ({best_balanced['accuracy']*100:.2f}%)")
print(f"  Home Win: {best_balanced['homeWinAccuracy']:.3f} ({int(best_balanced['homeWinCorrect'])}/{int(best_balanced['homeWinTotal'])})")
print(f"  Away Win: {best_balanced['awayWinAccuracy']:.3f} ({int(best_balanced['awayWinCorrect'])}/{int(best_balanced['awayWinTotal'])})")
print(f"  Draw: {best_balanced['drawAccuracy']:.3f} ({int(best_balanced['drawCorrect'])}/{int(best_balanced['drawTotal'])})")

print(f"\nOptimal Parameters:")
print(f"  initialElo: {int(best_balanced['initialElo'])}")
print(f"  baseK_Regular: {int(best_balanced['baseK_Regular'])}")
print(f"  eloScalingFactor: {int(best_balanced['eloScalingFactor'])}")
print(f"  C_draw: {best_balanced['C_draw']:.4f}")
print(f"  S_draw: {best_balanced['S_draw']:.4f}")
print(f"  W_forfeit: {best_balanced['W_forfeit']:.2f}")
print(f"  V_threshold: {int(best_balanced['V_threshold'])}")
print(f"  defaultSportModifier: {best_balanced['defaultSportModifier']:.1f}")

print(f"\nCalibration Metrics:")
print(f"  Brier Score: {best_balanced['brierScore']:.4f}")
print(f"  Log Loss: {best_balanced['logLoss']:.4f}")

# Save best config to file
best_config = {
    'initialElo': int(best_balanced['initialElo']),
    'baseK_Regular': int(best_balanced['baseK_Regular']),
    'baseK_Playoff': int(best_balanced['baseK_Playoff']),
    'baseK_Final': int(best_balanced['baseK_Final']),
    'eloScalingFactor': int(best_balanced['eloScalingFactor']),
    'C_draw': float(best_balanced['C_draw']),
    'S_draw': float(best_balanced['S_draw']),
    'W_forfeit': float(best_balanced['W_forfeit']),
    'V_threshold': int(best_balanced['V_threshold']),
    'defaultSportModifier': float(best_balanced['defaultSportModifier']),
}

import json
with open('experiment_output/best_config.json', 'w') as f:
    json.dump(best_config, f, indent=2)

print(f"\n✓ Best configuration saved to: experiment_output/best_config.json")
print("=" * 100)
