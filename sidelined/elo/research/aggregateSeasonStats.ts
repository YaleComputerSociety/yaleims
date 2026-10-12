#!/usr/bin/env npx ts-node
/**
 * Aggregate match statistics by sport from a season.
 * 
 * Usage:
 *   npx ts-node scripts/aggregateSeasonStats.ts --season 2025-2026
 *   npx ts-node scripts/aggregateSeasonStats.ts --season 2025-2026 --output ./stats/season_stats.csv
 *   npx ts-node scripts/aggregateSeasonStats.ts --season 2025-2026 --data-file ./data/matches.json
 */

import * as fs from "fs";
import * as path from "path";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------
interface ExportedData {
  season: string;
  exportedAt: string;
  totalMatches: number;
  sports: {
    [sport: string]: any[];
  };
}

interface SportStats {
  sport: string;
  totalMatches: number;
  scoredMatches: number;
  draws: number;
  forfeits: number;
  totalPoints: number;
  totalScoreDifference: number;
  avgPointsPerMatch: number;
  avgScoreDifferencePerMatch: number;
}

// -----------------------------------------------------------------------------
// AGGREGATION
// -----------------------------------------------------------------------------
function aggregateStats(matches: any[]): SportStats[] {
  const sportMap = new Map<string, any[]>();

  // Group by sport
  for (const match of matches) {
    const sport = match.sport || "Unknown";
    if (!sportMap.has(sport)) {
      sportMap.set(sport, []);
    }
    sportMap.get(sport)!.push(match);
  }

  const results: SportStats[] = [];

  for (const [sport, sportMatches] of sportMap.entries()) {
    const scoredMatches = sportMatches.filter(
      (m) => m.winner || m.forfeit === true
    );

    const draws = scoredMatches.filter((m) => m.winner === "Draw").length;
    const forfeits = scoredMatches.filter(
      (m) => m.forfeit === true || m.winner === "Default"
    ).length;

    let totalPoints = 0;
    let totalScoreDifference = 0;

    for (const match of scoredMatches) {
      const homeScore = match.home_college_score ?? 0;
      const awayScore = match.away_college_score ?? 0;

      totalPoints += homeScore + awayScore;
      totalScoreDifference += Math.abs(homeScore - awayScore);
    }

    const avgPointsPerMatch =
      scoredMatches.length > 0 ? totalPoints / scoredMatches.length : 0;
    const avgScoreDifferencePerMatch =
      scoredMatches.length > 0 ? totalScoreDifference / scoredMatches.length : 0;

    results.push({
      sport,
      totalMatches: sportMatches.length,
      scoredMatches: scoredMatches.length,
      draws,
      forfeits,
      totalPoints,
      totalScoreDifference,
      avgPointsPerMatch,
      avgScoreDifferencePerMatch,
    });
  }

  // Sort by total matches descending
  results.sort((a, b) => b.totalMatches - a.totalMatches);

  return results;
}

// -----------------------------------------------------------------------------
// OUTPUT
// -----------------------------------------------------------------------------
function statsToCSV(stats: SportStats[]): string {
  const header = [
    "sport",
    "totalMatches",
    "scoredMatches",
    "draws",
    "forfeits",
    "totalPoints",
    "totalScoreDifference",
    "avgPointsPerMatch",
    "avgScoreDifferencePerMatch",
  ].join(",");

  const rows = stats.map((s) =>
    [
      s.sport,
      s.totalMatches,
      s.scoredMatches,
      s.draws,
      s.forfeits,
      s.totalPoints,
      s.totalScoreDifference,
      s.avgPointsPerMatch.toFixed(2),
      s.avgScoreDifferencePerMatch.toFixed(2),
    ].join(",")
  );

  return header + "\n" + rows.join("\n");
}

function printStats(stats: SportStats[], season: string): void {
  console.log(`\n=== SEASON ${season} STATISTICS BY SPORT ===\n`);

  const totalMatches = stats.reduce((sum, s) => sum + s.totalMatches, 0);
  const totalScored = stats.reduce((sum, s) => sum + s.scoredMatches, 0);
  const totalDraws = stats.reduce((sum, s) => sum + s.draws, 0);
  const totalForfeits = stats.reduce((sum, s) => sum + s.forfeits, 0);

  console.log(`Overall: ${totalMatches} total, ${totalScored} scored, ${totalDraws} draws, ${totalForfeits} forfeits\n`);

  for (const stat of stats) {
    console.log(`${stat.sport}:`);
    console.log(`  Total Matches: ${stat.totalMatches} (${stat.scoredMatches} scored)`);
    console.log(`  Draws: ${stat.draws} (${((stat.draws / stat.scoredMatches) * 100).toFixed(1)}%)`);
    console.log(`  Forfeits: ${stat.forfeits} (${((stat.forfeits / stat.scoredMatches) * 100).toFixed(1)}%)`);
    console.log(`  Avg Points/Match: ${stat.avgPointsPerMatch.toFixed(2)}`);
    console.log(`  Avg Score Diff/Match: ${stat.avgScoreDifferencePerMatch.toFixed(2)}`);
    console.log();
  }
}

// -----------------------------------------------------------------------------
// DATA LOADING
// -----------------------------------------------------------------------------
function loadMatchesFromFile(filePath: string): any[] {
  console.log(`Loading matches from ${filePath}...`);
  const content = fs.readFileSync(filePath, "utf-8");
  const data: ExportedData = JSON.parse(content);

  let allMatches: any[] = [];
  for (const sportName in data.sports) {
    allMatches = allMatches.concat(data.sports[sportName]);
  }

  return allMatches;
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let season = "";
  let outputPath: string | undefined;
  let dataFile = "./data/matches.json";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--season" && args[i + 1]) {
      season = args[++i];
    } else if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[++i];
    } else if (args[i] === "--data-file" && args[i + 1]) {
      dataFile = args[++i];
    }
  }

  if (!season) {
    console.error(
      "Usage: npx ts-node scripts/aggregateSeasonStats.ts --season <season> [--output <path>] [--data-file <path>]"
    );
    console.error(
      "Example: npx ts-node scripts/aggregateSeasonStats.ts --season 2025-2026"
    );
    process.exit(1);
  }

  // Load matches
  const matches = loadMatchesFromFile(dataFile);
  console.log(`Loaded ${matches.length} total matches`);

  // Aggregate stats
  const stats = aggregateStats(matches);

  // Print to console
  printStats(stats, season);

  // Save to CSV if requested
  if (outputPath) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, statsToCSV(stats));
    console.log(`Saved statistics to ${outputPath}`);
  }

  process.exit(0);
}

main();
