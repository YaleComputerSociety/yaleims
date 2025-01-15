import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { Query } from "firebase-admin/firestore";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const getCollegeMatches = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { type, sortOrder = "desc", college } = req.query; // Retrieve 'type', 'sortOrder', and 'college' query parameters
      const currentDate = new Date();
      let query: Query = db.collection("matches"); // Explicitly use Query type

      // Apply filtering based on the 'type' query parameter (all, past, or future)
      if (type === "past") {
        query = query.where("timestamp", "<", currentDate); // Get past matches
      } else if (type === "future") {
        query = query.where("timestamp", ">", currentDate); // Get future matches
      }

      // Add orderBy to the base query
      const baseQuery = query.orderBy("timestamp", sortOrder as "asc" | "desc");

      // Fetch the matches for home_college and away_college
      const homeMatchesQuery = baseQuery.where("home_college", "==", college);
      const awayMatchesQuery = baseQuery.where("away_college", "==", college);

      // Execute both queries
      const [homeMatchesSnapshot, awayMatchesSnapshot] = await Promise.all([
        homeMatchesQuery.get(),
        awayMatchesQuery.get(),
      ]);

      // Combine the results from both queries
      const allMatches = [
        ...homeMatchesSnapshot.docs.map((doc) => doc.data()),
        ...awayMatchesSnapshot.docs.map((doc) => doc.data()),
      ];

      // Re-sort the combined results
      const sortedMatches = allMatches.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      });

      // Process and format the results
      const matches = sortedMatches.map((data) => ({
        id: data.id,
        home_college: data.home_college,
        away_college: data.away_college,
        sport: data.sport,
        home_college_score: data.home_college_score,
        away_college_score: data.away_college_score,
        home_college_participants: data.home_college_participants,
        away_college_participants: data.away_college_participants,
        location: data.location,
        location_extra: data.location_extra,
        winner: data.winner,
        type: data.type,
        timestamp:
          data.timestamp && data.timestamp.toDate
            ? data.timestamp.toDate().toISOString()
            : null, // Fallback if timestamp is missing or invalid
      }));

      // Return the matches as a JSON response
      return res.status(200).json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
