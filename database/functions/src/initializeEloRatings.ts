import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { initializeEloRatings, getEloLeaderboard } from "./elo_system.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

/**
 * Cloud Function to initialize Elo ratings for all colleges in a sport for a season
 */
export const initializeEloRatingsFunction = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
      const { sport, year } = req.body;

      if (!sport || !year) {
        return res.status(400).json({ 
          error: "Missing required parameters: sport and year" 
        });
      }

      // Get all colleges
      const collegesSnapshot = await db
        .collection("colleges")
        .doc("seasons")
        .collection(year)
        .get();

      if (collegesSnapshot.empty) {
        return res.status(404).json({ 
          error: `No colleges found for season ${year}` 
        });
      }

      const colleges = collegesSnapshot.docs.map(doc => doc.id);
      
      // Initialize Elo ratings
      await initializeEloRatings(colleges, sport, year);

      return res.status(200).json({
        success: true,
        message: `Initialized Elo ratings for ${colleges.length} colleges in ${sport} for season ${year}`,
        colleges: colleges.length
      });
    } catch (error: any) {
      console.error("Error initializing Elo ratings:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  });
});

/**
 * Cloud Function to get Elo leaderboard for a sport
 */
export const getEloLeaderboardFunction = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { sport, year } = req.query;

      if (!sport || !year) {
        return res.status(400).json({ 
          error: "Missing required parameters: sport and year" 
        });
      }

      const leaderboard = await getEloLeaderboard(sport as string, year as string);

      return res.status(200).json({
        success: true,
        sport,
        year,
        leaderboard
      });
    } catch (error: any) {
      console.error("Error getting Elo leaderboard:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  });
});

