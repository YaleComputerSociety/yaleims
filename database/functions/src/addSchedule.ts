import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { isValidDecodedToken } from "./helpers.js";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { Timestamp } from "firebase-admin/firestore";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

interface ScheduleMatch {
  timestamp: string;
  homeCollege: string;
  awayCollege: string;
  location: string;
  locationExtra?: string;
}

const canAddSchedule = (role: string) => {
  return role === "admin" || role === "dev";
};

export const addSchedule = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: "projects/yims-125a2/secrets/JWT_SECRET/versions/1",
    });
    if (!version.payload || !version.payload.data) {
      console.error("JWT secret payload is missing");
      return res.status(500).send("Internal Server Error");
    }
    const JWT_SECRET = version.payload.data.toString();
    const idToken = authHeader.split("Bearer ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(idToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (!isValidDecodedToken(decoded) || !canAddSchedule(decoded.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
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
        .collection("matches")
        .doc("seasons")
        .collection(season);

      matches.forEach((match: ScheduleMatch) => {
        const docRef = scheduleCollection.doc(nextId.toString());

        let firestoreTimestamp = null;
        const dateObj = new Date(match.timestamp);

        if (isNaN(dateObj.getTime())) {
          console.error(`Invalid date for match.timestamp:`, match.timestamp);
          firestoreTimestamp = null;
        } else {
          firestoreTimestamp = Timestamp.fromDate(dateObj);
        }

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
          timestamp: firestoreTimestamp,
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
