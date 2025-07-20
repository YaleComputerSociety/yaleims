import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const getMyAvailablePoints = functions.https.onRequest(
  async (req, res) => {
    corsHandler(req, res, async () => { 
      const authHeader = req.headers.authorization || ""
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({error: "No token provided"});
      }
      const token = authHeader.split("Bearer ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

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
        const userRef = db.collection("users").doc(email);
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
