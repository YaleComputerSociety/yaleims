import { Query } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const getMatches = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const {
        type,
        sortOrder = "asc",
        filterDate = new Date().toISOString(),
      } = req.query; // Retrieve the query parameters
      let query: Query = db.collection("matches"); // Explicitly use Query type

      const filterDateObj = new Date(filterDate as string); // Convert filterDate to a Date object

      // Apply filtering based on the 'type' query parameter (all, past, or future)
      if (type === "past") {
        query = query.where("timestamp", "<", filterDateObj); // Get past matches
      } else if (type === "future") {
        query = query.where("timestamp", ">=", filterDateObj); // Get future matches
      }

      query = query.orderBy("timestamp", sortOrder as "asc" | "desc");

      // Fetch the matches from Firestore
      const snapshot = await query.get();

      if (snapshot.empty) {
        return res.status(200).json([]); // Respond with an empty array instead of return res.status(404).send("No matches found");
      }

      // Process the query result and format the data
      const matches = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.id,
          home_college: data.home_college,
          away_college: data.away_college,
          sport: data.sport,
          home_college_score: data.home_college_score,
          away_college_score: data.away_college_score,
          winner: data.winner,
          timestamp:
            data.timestamp && data.timestamp.toDate
              ? data.timestamp.toDate().toISOString()
              : null, // Fallback if timestamp is missing or invalid
        };
      });

      // Return the matches as a JSON response
      return res.status(200).json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
