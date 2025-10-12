import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { getEloRating, updateEloRatings, EloMatchResult, ELO_CONFIG } from "./elo_system.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

interface EloHistoryEntry {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  winner: string;
  homeRatingBefore: number;
  awayRatingBefore: number;
  homeRatingAfter: number;
  awayRatingAfter: number;
  homeChange: number;
  awayChange: number;
  matchType: string;
  timestamp: admin.firestore.Timestamp;
}

/**
 * Initialize Elo ratings based on recent match data (last 2 weeks)
 */
export const initializeEloFromHistory = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
      const { sport, year = "2024-2025", weeksBack = 2 } = req.body;

      if (!sport) {
        return res.status(400).json({ 
          error: "Missing required parameter: sport" 
        });
      }

      console.log(`Initializing Elo ratings for ${sport} based on last ${weeksBack} weeks of data`);

      // Calculate date range (weeksBack weeks ago to now)
      const now = new Date();
      const startDate = new Date(now.getTime() - (weeksBack * 7 * 24 * 60 * 60 * 1000));

      // Get all completed matches for this sport in the date range
      const matchesSnapshot = await db
        .collection("matches")
        .doc("seasons")
        .collection(year)
        .where("sport", "==", sport)
        .where("timestamp", ">=", startDate)
        .where("timestamp", "<=", now)
        .where("winner", "!=", null)
        .orderBy("timestamp", "asc")
        .get();

      if (matchesSnapshot.empty) {
        return res.status(404).json({ 
          error: `No completed matches found for ${sport} in the last ${weeksBack} weeks` 
        });
      }

      console.log(`Found ${matchesSnapshot.docs.length} matches to process`);

      // Get all unique teams from these matches
      const teams = new Set<string>();
      matchesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.home_college) teams.add(data.home_college);
        if (data.away_college) teams.add(data.away_college);
      });

      console.log(`Teams found: ${Array.from(teams).join(", ")}`);

      // Initialize all teams with default rating
      const teamArray = Array.from(teams);
      for (const team of teamArray) {
        const eloRef = db
          .collection("elo_ratings")
          .doc("seasons")
          .collection(year)
          .doc(`${sport}_${team}`);
        
        const eloDoc = await eloRef.get();
        if (!eloDoc.exists) {
          await eloRef.set({
            college: team,
            sport,
            rating: ELO_CONFIG.INITIAL_RATING,
            gamesPlayed: 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      // Process matches chronologically to update Elo ratings
      let processedMatches = 0;
      for (const doc of matchesSnapshot.docs) {
        const data = doc.data();
        
        if (!data.home_college || !data.away_college || !data.winner) {
          continue;
        }

        // Skip forfeits for Elo calculation
        if (data.winner === "Default") {
          continue;
        }

        const matchResult: EloMatchResult = {
          homeTeam: data.home_college,
          awayTeam: data.away_college,
          sport,
          winner: data.winner,
          matchType: data.type || "Regular",
          timestamp: data.timestamp
        };

        // Get ratings before the match
        const homeRatingBefore = await getEloRating(data.home_college, sport, year);
        const awayRatingBefore = await getEloRating(data.away_college, sport, year);

        // Update Elo ratings
        await updateEloRatings(matchResult, year);

        // Get ratings after the match
        const homeRatingAfter = await getEloRating(data.home_college, sport, year);
        const awayRatingAfter = await getEloRating(data.away_college, sport, year);

        // Log the change
        await logEloChange({
          matchId: doc.id,
          homeTeam: data.home_college,
          awayTeam: data.away_college,
          sport,
          winner: data.winner,
          homeRatingBefore: homeRatingBefore.rating,
          awayRatingBefore: awayRatingBefore.rating,
          homeRatingAfter: homeRatingAfter.rating,
          awayRatingAfter: awayRatingAfter.rating,
          homeChange: homeRatingAfter.rating - homeRatingBefore.rating,
          awayChange: awayRatingAfter.rating - awayRatingBefore.rating,
          matchType: data.type || "Regular",
          timestamp: data.timestamp
        });

        processedMatches++;
      }

      // Get final Elo leaderboard
      const leaderboard = await db
        .collection("elo_ratings")
        .doc("seasons")
        .collection(year)
        .where("sport", "==", sport)
        .orderBy("rating", "desc")
        .get();

      const finalRatings = leaderboard.docs.map(doc => ({
        college: doc.data().college,
        rating: doc.data().rating,
        gamesPlayed: doc.data().gamesPlayed
      }));

      return res.status(200).json({
        success: true,
        message: `Initialized Elo ratings for ${sport} based on ${processedMatches} matches`,
        summary: {
          sport,
          year,
          weeksBack,
          matchesProcessed: processedMatches,
          teamsProcessed: teamArray.length,
          finalRatings
        }
      });

    } catch (error: any) {
      console.error("Error initializing Elo from history:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  });
});

/**
 * Log Elo rating changes to history
 */
async function logEloChange(change: EloHistoryEntry): Promise<void> {
  const historyRef = db.collection("elo_history").doc();
  await historyRef.set(change);
}

/**
 * Get Elo history for a team or sport
 */
export const getEloHistory = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { team, sport, year, limit = 50 } = req.query;

      if (!sport || !year) {
        return res.status(400).json({ 
          error: "Missing required parameters: sport and year" 
        });
      }

      let query = db
        .collection("elo_history")
        .where("sport", "==", sport)
        .where("timestamp", ">=", new Date(`${year}-01-01`))
        .where("timestamp", "<=", new Date(`${year}-12-31`))
        .orderBy("timestamp", "desc")
        .limit(parseInt(limit as string));

      if (team) {
        query = query.where("homeTeam", "==", team);
        // Note: This only gets matches where the team was home. 
        // For complete history, we'd need a more complex query or different data structure
      }

      const snapshot = await query.get();
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return res.status(200).json({
        success: true,
        sport,
        year,
        team: team || "all",
        history
      });

    } catch (error: any) {
      console.error("Error getting Elo history:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  });
});

/**
 * Get current Elo ratings with history summary
 */
export const getEloRatingsWithHistory = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { sport, year } = req.query;

      if (!sport || !year) {
        return res.status(400).json({ 
          error: "Missing required parameters: sport and year" 
        });
      }

      // Get current ratings
      const ratingsSnapshot = await db
        .collection("elo_ratings")
        .doc("seasons")
        .collection(year as string)
        .where("sport", "==", sport)
        .orderBy("rating", "desc")
        .get();

      const ratings = ratingsSnapshot.docs.map(doc => ({
        college: doc.data().college,
        rating: doc.data().rating,
        gamesPlayed: doc.data().gamesPlayed,
        lastUpdated: doc.data().lastUpdated
      }));

      // Get recent history (last 20 changes)
      const historySnapshot = await db
        .collection("elo_history")
        .where("sport", "==", sport)
        .orderBy("timestamp", "desc")
        .limit(20)
        .get();

      const recentHistory = historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return res.status(200).json({
        success: true,
        sport,
        year,
        currentRatings: ratings,
        recentHistory
      });

    } catch (error: any) {
      console.error("Error getting Elo ratings with history:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  });
});

/**
 * Print Elo ratings to console (for debugging)
 */
export const printEloRatings = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { sport, year = "2024-2025" } = req.body;

      if (!sport) {
        return res.status(400).json({ 
          error: "Missing required parameter: sport" 
        });
      }

      // Get current ratings
      const ratingsSnapshot = await db
        .collection("elo_ratings")
        .doc("seasons")
        .collection(year)
        .where("sport", "==", sport)
        .orderBy("rating", "desc")
        .get();

      console.log(`\n=== ELO RATINGS FOR ${sport.toUpperCase()} (${year}) ===`);
      
      if (ratingsSnapshot.empty) {
        console.log("No Elo ratings found for this sport/year combination.");
        return res.status(404).json({
          error: "No Elo ratings found",
          sport,
          year
        });
      }

      ratingsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.college}: ${data.rating} (${data.gamesPlayed} games)`);
      });

      // Get recent changes
      const historySnapshot = await db
        .collection("elo_history")
        .where("sport", "==", sport)
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();

      if (!historySnapshot.empty) {
        console.log(`\n=== RECENT ELO CHANGES ===`);
        historySnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`${data.homeTeam} vs ${data.awayTeam}: ${data.winner} won`);
          console.log(`  ${data.homeTeam}: ${data.homeRatingBefore} → ${data.homeRatingAfter} (${data.homeChange > 0 ? '+' : ''}${data.homeChange})`);
          console.log(`  ${data.awayTeam}: ${data.awayRatingBefore} → ${data.awayRatingAfter} (${data.awayChange > 0 ? '+' : ''}${data.awayChange})`);
        });
      }

      return res.status(200).json({
        success: true,
        message: `Elo ratings printed to console for ${sport}`,
        sport,
        year,
        teamCount: ratingsSnapshot.docs.length
      });

    } catch (error: any) {
      console.error("Error printing Elo ratings:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  });
});

