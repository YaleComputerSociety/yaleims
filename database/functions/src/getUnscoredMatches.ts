import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";
import jwt from "jsonwebtoken";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

const userCanAccess = (mRoles: string[]) => {
  return mRoles.includes("admin") || mRoles.includes("dev");
};

// gets unscored matches (winner is null) that have already occurred (timestamp is in the past)
export const getUnscoredMatches = functions.https.onRequest(
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        const authHeader = req.headers.authorization || "";
        if (!authHeader.startsWith("Bearer ")) {
          return res.status(401).json({ error: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!isValidDecodedToken(decoded)) {
          console.error("Invalid token structure");
          return res.status(401).json({ error: "Invalid Token Structure" });
        }
        // const { role } = decoded as { role: string };
        const seasonId = req.query.seasonId as string;
        if (!seasonId)
          return res.status(400).json({ error: "SeasonId must be a query" });

        if (!userCanAccess(decoded.mRoles)) {
          return res.status(401).json({ error: "Unauthorized User" });
        }
        const currentDate = admin.firestore.Timestamp.now();

        const snapshot = await db
          .collection("matches")
          .doc("seasons")
          .collection(seasonId)
          .where("winner", "==", null)
          .where("timestamp", "<", currentDate)
          .orderBy("timestamp", "asc")
          .get();

        if (snapshot.empty) {
          return res.status(200).json({ success: true, matches: [] });
        }

        const matches = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return res.status(200).json({ success: true, matches: matches });
      } catch (error) {
        console.error("Error fetching unscored matches:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);
