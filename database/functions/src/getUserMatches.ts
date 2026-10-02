import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { isValidDecodedToken } from "./helpers.js";
import { authenticateRequest } from "./auth.js";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const getUserMatches = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const auth = await authenticateRequest(req);
      if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
      }
      const decoded = auth.decoded;
  
      if (!isValidDecodedToken(decoded)) {
        console.error("Invalid token structure");
        return res.status(401).json({error: "Invalid Token Structure"})
      }
      const email = decoded.email;
      const seasonId = req.query.seasonId

      const userDoc = await db
        .collection("users")
        .doc(email)
        .collection("seasons")
        .doc(seasonId as string)
        .get();

      if (!userDoc.exists) {
        res.status(404).send("User not found");
        return;
      }

      const userData = userDoc.data();
      const matches = userData?.matches || []; // Default to empty array if no matches

      // // Filter matches to include only those happening in the future
      const now = new Date();
      const futureMatches = matches.filter((match: any) => {
        const matchTimestamp = new Date(match.timestamp);
        return matchTimestamp > now; // Include matches with a timestamp in the future
      });

      return res.status(200).json(futureMatches);
    } catch (error) {
      console.error("Error fetching user matches:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
