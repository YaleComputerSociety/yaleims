import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { authenticateRequest } from "./auth.js";

import { isValidDecodedToken } from "./helpers.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const getSeasonPoints = functions.https.onRequest(
  async (req, res) => {
    corsHandler(req, res, async () => { 
      const auth = await authenticateRequest(req);
      if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
      }
      const decoded = auth.decoded;
      const seasonId = req.query.seasonId as string;
      if (!seasonId) {
        return res.status(400).json({ error: "seasonId is required" });
      }

      if (!isValidDecodedToken(decoded)) {
        console.error("Invalid token structure");
        return res.status(401).json({error: "Invalid Token Structure"})
      }
      const email = decoded.email;

      if (typeof email !== "string") {
        return res.status(400).send("Email must be a valid string");
      }

      if (!email) {
        return res.status(400).send("Email query parameter is required");
      }

      try {
        const userRef = db.collection("users").doc(email).collection("seasons").doc(seasonId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return res.status(404).send("User not found");
        }

        const userData = userDoc.data();
        return res.status(200).json({
          points: userData?.points || 0,
          correctPredictions: userData?.correctPredictions || 0,
          username: userData?.username || "Anonymous",
        });
      } catch (error) {
        console.error("Error fetching user points:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);
