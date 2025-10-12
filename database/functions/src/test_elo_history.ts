import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { 
  initializeEloFromHistory
} from "./elo_history.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

/**
 * Test function to initialize Elo ratings from recent match data and print results
 */
export const testEloInitialization = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
      const { sport = "Flag Football", year = "2024-2025", weeksBack = 2 } = req.body;
      
      console.log(`\n🚀 Testing Elo initialization for ${sport} based on last ${weeksBack} weeks`);
      
      // Call the initialization function directly
      console.log("\n📊 Step 1: Initializing Elo ratings from recent match data...");
      
      // Create mock req/res objects for the function call
      const mockReq = {
        method: 'POST',
        body: { sport, year, weeksBack }
      };
      const mockRes = {
        status: (code: number) => ({
          json: (data: any) => {
            console.log(`Init result:`, data);
            return data;
          }
        })
      };
      
      await initializeEloFromHistory(mockReq as any, mockRes as any);
      
      // Get and display current ratings
      console.log("\n📈 Step 2: Displaying current Elo ratings...");
      
      const ratingsSnapshot = await db
        .collection("elo_ratings")
        .doc("seasons")
        .collection(year)
        .where("sport", "==", sport)
        .orderBy("rating", "desc")
        .get();

      if (ratingsSnapshot.empty) {
        console.log("No Elo ratings found for this sport/year combination.");
        return res.status(404).json({
          error: "No Elo ratings found",
          sport,
          year
        });
      }

      console.log(`\n=== ELO RATINGS FOR ${sport.toUpperCase()} (${year}) ===`);
      
      const ratings: Array<{college: string, rating: number, gamesPlayed: number}> = [];
      ratingsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const ratingInfo = `${index + 1}. ${data.college}: ${data.rating} (${data.gamesPlayed} games)`;
        console.log(ratingInfo);
        ratings.push({
          college: data.college,
          rating: data.rating,
          gamesPlayed: data.gamesPlayed
        });
      });

      return res.status(200).json({
        success: true,
        message: `Successfully initialized and displayed Elo ratings for ${sport}`,
        summary: {
          sport,
          year,
          weeksBack,
          teamsProcessed: ratings.length,
          ratings
        }
      });

    } catch (error: any) {
      console.error("❌ Error in Elo initialization test:", error);
      return res.status(500).json({
        error: "Test failed",
        message: error.message,
        details: error.stack
      });
    }
  });
});

/**
 * Quick function to show current Elo ratings for all sports
 */
export const showAllEloRatings = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const sports = ["Flag Football", "Soccer", "Spikeball", "Cornhole", "Pickleball", "Table Tennis"];
      const year = "2024-2025";
      
      console.log(`\n🏆 CURRENT ELO RATINGS FOR ALL SPORTS (${year})`);
      console.log("=".repeat(60));
      
      const results = [];
      
      for (const sport of sports) {
        try {
          const ratingsSnapshot = await db
            .collection("elo_ratings")
            .doc("seasons")
            .collection(year)
            .where("sport", "==", sport)
            .orderBy("rating", "desc")
            .get();

          if (!ratingsSnapshot.empty) {
            console.log(`\n${sport.toUpperCase()}:`);
            ratingsSnapshot.docs.forEach((doc, index) => {
              const data = doc.data();
              console.log(`  ${index + 1}. ${data.college}: ${data.rating} (${data.gamesPlayed} games)`);
            });
            results.push({ sport, success: true, count: ratingsSnapshot.docs.length });
          } else {
            console.log(`\n${sport.toUpperCase()}: No ratings found`);
            results.push({ sport, success: false, message: `No data for ${sport}` });
          }
        } catch (error) {
          console.log(`\n${sport.toUpperCase()}: Error - ${error}`);
          results.push({ sport, success: false, message: `Error: ${error}` });
        }
      }
      
      console.log("\n" + "=".repeat(60));
      console.log("✅ Display complete");
      
      return res.status(200).json({
        success: true,
        message: "Elo ratings displayed for all sports",
        results
      });

    } catch (error: any) {
      console.error("Error showing all Elo ratings:", error);
      return res.status(500).json({
        error: "Failed to show ratings",
        message: error.message
      });
    }
  });
});
