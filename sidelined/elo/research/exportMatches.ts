#!/usr/bin/env npx ts-node
/**
 * Export matches from Firestore to a JSON file.
 * Groups matches by sport and saves in chronological order.
 * 
 * Usage:
 *   npx ts-node scripts/exportMatches.ts --season 2025-2026
 *   npx ts-node scripts/exportMatches.ts --season 2025-2026 --output ./data/matches.json
 */

import * as fs from "fs";
import * as path from "path";
import admin from "firebase-admin";

// Initialize Firebase Admin SDK with project ID
if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "yims-125a2",
  });
}

const db = admin.firestore();

interface MatchData {
  id: string;
  home_college: string;
  away_college: string;
  sport: string;
  type: "Regular" | "Playoff" | "Final";
  timestamp: string;
  winner?: string;
  forfeit?: boolean;
  home_college_score?: number;
  away_college_score?: number;
  home_volume?: number;
  away_volume?: number;
  draw_volume?: number;
  default_volume?: number;
  [key: string]: any;
}

interface ExportedData {
  season: string;
  exportedAt: string;
  totalMatches: number;
  sports: {
    [sport: string]: MatchData[];
  };
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let season = "";
  let outputPath = "./data/matches.json";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--season" && args[i + 1]) {
      season = args[++i];
    } else if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[++i];
    }
  }

  if (!season) {
    console.error("Usage: npx ts-node scripts/exportMatches.ts --season <season> [--output <path>]");
    console.error("Example: npx ts-node scripts/exportMatches.ts --season 2025-2026");
    process.exit(1);
  }

  console.log(`Exporting matches for season ${season}...`);

  // Fetch all matches from Firestore
  const q = db
    .collection("matches")
    .doc("seasons")
    .collection(season)
    .orderBy("timestamp", "asc");

  const snap = await q.get();
  
  // Convert to plain objects and filter
  const allMatches = snap.docs.map((doc) => {
    const data = doc.data();
    // Convert Firestore Timestamp to ISO string
    const timestamp = data.timestamp?.toDate?.()?.toISOString() || data.timestamp;
    return {
      id: doc.id,
      ...data,
      timestamp,
    } as MatchData;
  });

  console.log(`Fetched ${allMatches.length} total matches`);

  // Group by sport
  const sports: { [sport: string]: MatchData[] } = {};
  
  for (const match of allMatches) {
    const sport = match.sport || "Unknown";
    if (!sports[sport]) {
      sports[sport] = [];
    }
    sports[sport].push(match);
  }

  // Sort each sport's matches chronologically (already ordered by query, but ensure)
  for (const sport in sports) {
    sports[sport].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateA - dateB;
    });
  }

  // Create export data
  const exportData: ExportedData = {
    season,
    exportedAt: new Date().toISOString(),
    totalMatches: allMatches.length,
    sports,
  };

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

  console.log(`\nExport complete!`);
  console.log(`  Total matches: ${allMatches.length}`);
  console.log(`  Sports: ${Object.keys(sports).length}`);
  console.log(`  Output file: ${outputPath}`);
  
  // Show breakdown by sport
  console.log(`\nMatches by sport:`);
  for (const [sport, matches] of Object.entries(sports).sort((a, b) => b[1].length - a[1].length)) {
    const scored = matches.filter(m => m.winner || m.forfeit === true).length;
    console.log(`  ${sport}: ${matches.length} total (${scored} scored)`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
