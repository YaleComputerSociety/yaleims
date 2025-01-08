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

      query = query.orderBy("timestamp", sortOrder as "asc" | "desc");

      // Fetch the matches for home_college
      let homeMatchesQuery = query.where("home_college", "==", college);
      let awayMatchesQuery = query.where("away_college", "==", college);

      // Execute both queries and merge the results
      const homeMatchesSnapshot = await homeMatchesQuery.get();
      const awayMatchesSnapshot = await awayMatchesQuery.get();

      // Log the results of both queries to see how many matches are being returned
      // console.log("Home Matches Snapshot:", homeMatchesSnapshot.docs.length);
      // console.log("Away Matches Snapshot:", awayMatchesSnapshot.docs.length);

      // Combine the results from both queries and ensure data is valid
      const allMatches = [
        ...homeMatchesSnapshot.docs
          .map((doc) => doc.data())
          .filter((data) => data !== undefined), // Filter out undefined data
        ...awayMatchesSnapshot.docs
          .map((doc) => doc.data())
          .filter((data) => data !== undefined), // Filter out undefined data
      ];

      // Log all matches before returning
      // console.log("All Matches:", allMatches);

      // Process and format the results
      const matches = allMatches
        .map((data) => {
          if (!data) return null; // Ensure that data is defined
          return {
            home_college: data.home_college,
            away_college: data.away_college,
            sport: data.sport,
            home_college_score: data.home_college_score,
            away_college_score: data.away_college_score,
            home_college_participants: data.home_college_participants,
            away_college_participants: data.away_college_participants,
            winner: data.winner,
            timestamp:
              data.timestamp && data.timestamp.toDate
                ? data.timestamp.toDate().toISOString()
                : null, // Fallback if timestamp is missing or invalid
          };
        })
        .filter((match) => match !== null); // Filter out null matches

      // Return the matches as a JSON response
      return res.status(200).json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
