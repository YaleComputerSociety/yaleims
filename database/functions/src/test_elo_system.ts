import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { 
  getEloRating, 
  updateEloRatings, 
  getEloWinProbabilities,
  initializeEloRatings,
  calculateNewRatings,
  calculateExpectedScore
} from "./elo_system.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

/**
 * Test function to verify Elo system functionality
 */
export const testEloSystem = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
      const { sport = "Flag Football", year = "2024-2025" } = req.body;
      
      console.log(`Testing Elo system for ${sport} in season ${year}`);

      // Test 1: Initialize Elo ratings for test colleges
      const testColleges = ["BF", "BK", "BR", "DC"];
      await initializeEloRatings(testColleges, sport, year);
      console.log("✓ Initialized Elo ratings");

      // Test 2: Get initial ratings
      const bfRating = await getEloRating("BF", sport, year);
      const bkRating = await getEloRating("BK", sport, year);
      console.log(`✓ BF initial rating: ${bfRating.rating}`);
      console.log(`✓ BK initial rating: ${bkRating.rating}`);

      // Test 3: Calculate expected score
      const expectedScore = calculateExpectedScore(bfRating.rating, bkRating.rating);
      console.log(`✓ Expected score for BF vs BK: ${expectedScore.toFixed(3)}`);

      // Test 4: Simulate a match result
      const matchResult = {
        homeTeam: "BF",
        awayTeam: "BK", 
        sport,
        winner: "BF", // BF wins
        matchType: "Regular" as const,
        timestamp: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp
      };

      await updateEloRatings(matchResult, year);
      console.log("✓ Updated Elo ratings after BF win");

      // Test 5: Check updated ratings
      const bfRatingAfter = await getEloRating("BF", sport, year);
      const bkRatingAfter = await getEloRating("BK", sport, year);
      console.log(`✓ BF rating after win: ${bfRatingAfter.rating} (+${bfRatingAfter.rating - bfRating.rating})`);
      console.log(`✓ BK rating after loss: ${bkRatingAfter.rating} (${bkRatingAfter.rating - bkRating.rating})`);

      // Test 6: Calculate win probabilities
      const winProbabilities = await getEloWinProbabilities("BF", "BK", sport, year);
      console.log(`✓ Win probabilities - BF: ${winProbabilities.homeWin.toFixed(3)}, BK: ${winProbabilities.awayWin.toFixed(3)}, Draw: ${winProbabilities.draw.toFixed(3)}`);

      // Test 7: Simulate a draw
      const drawResult = {
        homeTeam: "BF",
        awayTeam: "BR",
        sport,
        winner: "Draw",
        matchType: "Regular" as const,
        timestamp: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp
      };

      const bfRatingBeforeDraw = await getEloRating("BF", sport, year);
      const brRatingBeforeDraw = await getEloRating("BR", sport, year);

      await updateEloRatings(drawResult, year);

      const bfRatingAfterDraw = await getEloRating("BF", sport, year);
      const brRatingAfterDraw = await getEloRating("BR", sport, year);

      console.log(`✓ After draw - BF: ${bfRatingAfterDraw.rating} (${bfRatingAfterDraw.rating - bfRatingBeforeDraw.rating}), BR: ${brRatingAfterDraw.rating} (${brRatingAfterDraw.rating - brRatingBeforeDraw.rating})`);

      // Test 8: Get leaderboard
      const leaderboard = await db
        .collection("elo_ratings")
        .doc("seasons")
        .collection(year)
        .where("sport", "==", sport)
        .orderBy("rating", "desc")
        .limit(5)
        .get();

      const topTeams = leaderboard.docs.map(doc => ({
        college: doc.data().college,
        rating: doc.data().rating,
        games: doc.data().gamesPlayed
      }));

      console.log("✓ Top 5 teams by Elo rating:");
      topTeams.forEach((team, index) => {
        console.log(`  ${index + 1}. ${team.college}: ${team.rating} (${team.games} games)`);
      });

      return res.status(200).json({
        success: true,
        message: "Elo system test completed successfully",
        results: {
          initialRatings: {
            BF: bfRating.rating,
            BK: bkRating.rating
          },
          afterBFWin: {
            BF: bfRatingAfter.rating,
            BK: bkRatingAfter.rating
          },
          afterDraw: {
            BF: bfRatingAfterDraw.rating,
            BR: brRatingAfterDraw.rating
          },
          winProbabilities,
          topTeams
        }
      });

    } catch (error: any) {
      console.error("Error testing Elo system:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
        stack: error.stack
      });
    }
  });
});

/**
 * Function to manually calculate Elo ratings for demonstration
 */
export const calculateEloDemo = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { homeRating = 1500, awayRating = 1500, result = 1, kFactor = 32 } = req.body;

      // Calculate expected scores
      const homeExpected = calculateExpectedScore(homeRating, awayRating);
      const awayExpected = calculateExpectedScore(awayRating, homeRating);

      // Calculate new ratings
      const { newHomeRating, newAwayRating } = calculateNewRatings(
        homeRating,
        awayRating,
        result, // 1 = home win, 0.5 = draw, 0 = away win
        kFactor
      );

      return res.status(200).json({
        success: true,
        inputs: {
          homeRating,
          awayRating,
          result,
          kFactor
        },
        expectedScores: {
          home: homeExpected,
          away: awayExpected
        },
        newRatings: {
          home: newHomeRating,
          away: newAwayRating
        },
        changes: {
          home: newHomeRating - homeRating,
          away: newAwayRating - awayRating
        }
      });

    } catch (error: any) {
      console.error("Error in Elo demo calculation:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  });
});
