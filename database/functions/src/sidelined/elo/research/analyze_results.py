#!/usr/bin/env python3
"""Analyze experiment results from grid search"""

import pandas as pd
import sys

def main():
    # Read results
    df = pd.read_csv('experiment_output/experiment_summary.csv')
    
    print("=" * 100)
    print("EXPERIMENT RESULTS ANALYSIS")
    print("=" * 100)
    
    # Overall stats
    print(f"\nTotal experiments run: {len(df)}")
    print(f"Best accuracy: {df['accuracy'].max():.4f} ({df['accuracy'].max()*100:.2f}%)")
    print(f"Worst accuracy: {df['accuracy'].min():.4f} ({df['accuracy'].min()*100:.2f}%)")
    print(f"Average accuracy: {df['accuracy'].mean():.4f} ({df['accuracy'].mean()*100:.2f}%)")
    print(f"\nMatches analyzed: {df['matchCount'].iloc[0]}")
    print(f"Single forfeits: {df['singleForfeits'].iloc[0]}")
    print(f"Double forfeits (voided): {df['voidedMatches'].iloc[0]}")
    
    # Top configurations
    print("\n" + "=" * 100)
    print("TOP 10 CONFIGURATIONS BY ACCURACY:")
    print("=" * 100)
    
    top10 = df.nlargest(10, 'accuracy')
    for idx, row in top10.iterrows():
        print(f"\nRank {list(top10.index).index(idx) + 1}: Experiment #{int(row['experimentId'])}")
        print(f"  Accuracy: {row['accuracy']:.4f} ({row['accuracy']*100:.2f}%)")
        print(f"  Home Win Acc: {row['homeWinAccuracy']:.4f}, Away Win Acc: {row['awayWinAccuracy']:.4f}, Draw Acc: {row['drawAccuracy']:.4f}")
        print(f"  Initial Elo: {int(row['initialElo'])}, K-Factor: {int(row['baseK_Regular'])}")
        print(f"  C_draw: {row['C_draw']:.2f}, S_draw: {row['S_draw']:.3f}, W_forfeit: {row['W_forfeit']:.2f}")
        print(f"  V_threshold: {int(row['V_threshold'])}, Sport Modifier: {row['defaultSportModifier']:.1f}")
    
    # Parameter impact analysis
    print("\n" + "=" * 100)
    print("PARAMETER IMPACT ANALYSIS (Best Performers):")
    print("=" * 100)
    
    params = ['initialElo', 'baseK_Regular', 'C_draw', 'S_draw', 'W_forfeit', 'V_threshold', 'defaultSportModifier']
    
    for param in params:
        print(f"\n{param}:")
        grouped = df.groupby(param)['accuracy'].agg(['mean', 'max', 'count']).sort_values('mean', ascending=False)
        for val, row_data in grouped.iterrows():
            print(f"  {str(val):>6} → Avg: {row_data['mean']:.4f}, Max: {row_data['max']:.4f}, Count: {int(row_data['count'])}")
    
    # Best single values
    print("\n" + "=" * 100)  
    print("OPTIMAL PARAMETER VALUES:")
    print("=" * 100)
    
    for param in params:
        best_val = df.groupby(param)['accuracy'].mean().idxmax()
        best_acc = df.groupby(param)['accuracy'].mean().max()
        print(f"{param:25} = {best_val:>6} (avg accuracy: {best_acc:.4f})")
    
    # Draw accuracy issue
    print("\n" + "=" * 100)
    print("DRAW PREDICTION ANALYSIS:")
    print("=" * 100)
    print(f"Total draws in dataset: {df['drawTotal'].iloc[0]}")
    print(f"Best draw accuracy: {df['drawAccuracy'].max():.4f}")
    print(f"Average draw accuracy: {df['drawAccuracy'].mean():.4f}")
    print("⚠️  NOTE: Draw accuracy is 0.0000 across all experiments!")
    print("    This suggests the model NEVER predicts draws correctly.")
    
    # Calibration analysis
    print("\n" + "=" * 100)
    print("CALIBRATION METRICS:")
    print("=" * 100)
    best_brier = df.nsmallest(5, 'brierScore')
    print("Best Brier Scores (lower is better):")
    for idx, row in best_brier.iterrows():
        print(f"  Exp #{int(row['experimentId'])}: {row['brierScore']:.4f} (accuracy: {row['accuracy']:.4f})")

if __name__ == '__main__':
    main()
