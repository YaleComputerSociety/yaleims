import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

/**
 * Simple function to show current Elo ratings - designed for Firebase shell testing
 */
export const simpleEloCheck = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { sport = "Flag Football", year = "2024-2025" } = req.body;
      
      console.log(`\n=== CHECKING ELO RATINGS FOR ${sport.toUpperCase()} (${year}) ===`);
      
      // Get current ratings (without orderBy to avoid index requirement)
      const ratingsSnapshot = await db
        .collection("elo_ratings")
        .doc("seasons")
        .collection(year)
        .where("sport", "==", sport)
        .get();

      if (ratingsSnapshot.empty) {
        console.log(`❌ No Elo ratings found for ${sport} in ${year}`);
        console.log("💡 Try running initializeEloFromHistory first to create ratings from match data");
        
        return res.status(200).json({
          success: false,
          message: `No Elo ratings found for ${sport}`,
          suggestion: "Run initializeEloFromHistory to create ratings from recent match data"
        });
      }

      console.log(`✅ Found ${ratingsSnapshot.docs.length} teams with Elo ratings:`);
      console.log("");
      
      const ratings: Array<{college: string, rating: number, gamesPlayed: number}> = [];
      ratingsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        ratings.push({
          college: data.college,
          rating: data.rating,
          gamesPlayed: data.gamesPlayed
        });
      });

      // Sort by rating (descending) in JavaScript instead of Firestore
      ratings.sort((a, b) => b.rating - a.rating);

      console.log(`✅ Found ${ratings.length} teams with Elo ratings:`);
      console.log("");
      
      ratings.forEach((team, index) => {
        const ratingInfo = `${index + 1}. ${team.college}: ${team.rating} (${team.gamesPlayed} games)`;
        console.log(ratingInfo);
      });

      console.log("");
      console.log("🏆 Top 3 Teams:");
      ratings.slice(0, 3).forEach((team, index) => {
        console.log(`   ${index + 1}. ${team.college}: ${team.rating}`);
      });

      return res.status(200).json({
        success: true,
        sport,
        year,
        teamCount: ratings.length,
        ratings,
        top3: ratings.slice(0, 3)
      });

    } catch (error: any) {
      console.error("❌ Error checking Elo ratings:", error);
      return res.status(500).json({
        error: "Failed to check ratings",
        message: error.message
      });
    }
  });
});

/**
 * Simple function to initialize Elo ratings from recent match data
 */
export const simpleEloInit = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { sport = "Flag Football", year = "2024-2025", weeksBack = 2 } = req.body;
      
      console.log(`\n🚀 INITIALIZING ELO RATINGS FOR ${sport.toUpperCase()}`);
      console.log(`📅 Looking at matches from the last ${weeksBack} weeks`);
      
      // Calculate date range
      const now = new Date();
      const startDate = new Date(now.getTime() - (weeksBack * 7 * 24 * 60 * 60 * 1000));

      // Get matches for this sport (simplified query to avoid index issues)
      const matchesSnapshot = await db
        .collection("matches")
        .doc("seasons")
        .collection(year)
        .where("sport", "==", sport)
        .where("winner", "!=", null)
        .get();

      if (matchesSnapshot.empty) {
        console.log(`❌ No completed matches found for ${sport} in the last ${weeksBack} weeks`);
        return res.status(404).json({
          error: `No matches found for ${sport} in the last ${weeksBack} weeks`,
          sport,
          year,
          weeksBack
        });
      }

      console.log(`📊 Found ${matchesSnapshot.docs.length} completed matches total`);
      
      // Filter matches by date range on the client side
      const recentMatches = matchesSnapshot.docs.filter(doc => {
        const data = doc.data();
        const matchTime = data.timestamp?.toDate?.() || new Date(data.timestamp);
        return matchTime >= startDate && matchTime <= now;
      });

      console.log(`📅 Found ${recentMatches.length} matches in the last ${weeksBack} weeks`);
      
      if (recentMatches.length === 0) {
        console.log(`❌ No completed matches found for ${sport} in the last ${weeksBack} weeks`);
        return res.status(404).json({
          error: `No matches found for ${sport} in the last ${weeksBack} weeks`,
          sport,
          year,
          weeksBack
        });
      }
      
      // Get all unique teams from recent matches
      const teams = new Set<string>();
      recentMatches.forEach(doc => {
        const data = doc.data();
        if (data.home_college) teams.add(data.home_college);
        if (data.away_college) teams.add(data.away_college);
      });

      console.log(`👥 Teams found: ${Array.from(teams).join(", ")}`);

      // Initialize all teams with default rating (1500)
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
            rating: 1500,
            gamesPlayed: 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      console.log(`✅ Initialized Elo ratings for ${teamArray.length} teams`);
      console.log(`💡 Now run simpleEloCheck to see the ratings!`);

      return res.status(200).json({
        success: true,
        message: `Initialized Elo ratings for ${sport}`,
        summary: {
          sport,
          year,
          weeksBack,
          matchesFound: matchesSnapshot.docs.length,
          teamsProcessed: teamArray.length,
          teams: teamArray
        }
      });

    } catch (error: any) {
      console.error("❌ Error initializing Elo ratings:", error);
      return res.status(500).json({
        error: "Failed to initialize ratings",
        message: error.message
      });
    }
  });
});
