import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

interface ScheduleMatch {
  timestamp: string;
  homeCollege: string;
  awayCollege: string;
  location: string;
  locationExtra?: string;
}

export const addSchedule = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(400).json({ error: "Invalid Method" });
    }

    try {
      const authHeader = req.headers.authorization || "";
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
      }
      const token = authHeader.split("Bearer ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!isValidDecodedToken(decoded)) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Validate and extract schedule from body
      const { schedule } = req.body;
      if (
        !schedule ||
        !Array.isArray(schedule.matches) ||
        !schedule.sport ||
        !schedule.season
      ) {
        return res.status(400).json({ error: "Invalid schedule format" });
      }

      // Fetch the next ID for matches
      const nextIdSnap = await db.collection("counters").doc("matches").get();
      const nextIdData = nextIdSnap.data();
      if (
        !nextIdSnap.exists ||
        !nextIdData ||
        nextIdData.count === undefined ||
        typeof nextIdData.count !== "number"
      ) {
        return res.status(500).json({ error: "Cannot find next match ID" });
      }

      let nextId = nextIdData.count;

      // Write each match as a document in a subcollection for the sport
      const batch = db.batch();
      const sport = schedule.sport;
      const matches = schedule.matches;
      const season = schedule.season;
      const scheduleCollection = db
        .collection("matches_testing")
        .doc("seasons")
        .collection(season);

      matches.forEach((match: ScheduleMatch) => {
        const docRef = scheduleCollection.doc(nextId.toString());
        batch.set(docRef, {
          id: nextId++,
          away_college: match.awayCollege,
          away_college_participants: [],
          away_college_score: null,
          home_college: match.homeCollege,
          home_college_participants: [],
          home_college_score: null,
          forfeit: null,
          location: match.location,
          location_extra: match.locationExtra || null,
          sport: sport,
          timestamp: match.timestamp,
          type: "Regular",
          winner: null,
        });
      });

      // Update the counter for next match ID
      batch.set(
        db.collection("counters").doc("matches"),
        {
          count: nextId,
        },
        { merge: true }
      );

      await batch.commit();

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Error adding schedule: ", err);
      if (err.message === "User not found") {
        return res.status(404).json({ error: "User not found" });
      }
      return res.status(500).json({ error: err.message });
    }
  });
});
