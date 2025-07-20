import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const getSeasons = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split("Bearer ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (!isValidDecodedToken(decoded)) {
      return res.status(401).json({ error: "Invalid Token Structure" });
    }

    try {
      const currentRef = db.collection("seasons").doc("current");
      const pastRef = db.collection("seasons").doc("past");

      const [currentSnap, pastSnap] = await Promise.all([
        currentRef.get(),
        pastRef.get()
      ]);

      if (!currentSnap.exists) {
        return res.status(404).json({ error: "current season doc missing" });
      }
      if (!pastSnap.exists) {
        return res.status(404).json({ error: "past season doc missing" });
      }

      let years: string[] = [];
      if (pastSnap.exists) {
        const raw = pastSnap.data();
        if (raw && Array.isArray(raw.years)) {
          years = raw.years.filter(y => typeof y === "string");
        } else {
          await pastRef.set({ years: [] }, { merge: true });
        }
      } else {
        await pastRef.set({ years: [] }, { merge: true });
      }

      const result = {
        current: { ...currentSnap.data() },
        past: { years }
      };

      return res.status(200).json(result);
    } catch (err) {
      console.error("Error fetching seasons:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});

