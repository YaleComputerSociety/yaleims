import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

// gets unscored matches (winner is null) that have already occurred (timestamp is in the past)
export const getUnscoredMatches = functions.https.onRequest(
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        // uncomment and redeploy once new frontend changes are deployed
        // const authHeader = req.headers.authorization || ""
        // if (!authHeader.startsWith("Bearer ")) {
        //   return res.status(401).json({error: "No token provided"});
        // }
        // //   // getting token passed from request
        // const idToken = authHeader.split("Bearer ")[1];
        // // //   //verifying the token using firebase admin
        // let decoded;
        // try {
        //   decoded = await admin.auth().verifyIdToken(idToken);
        //   if (!decoded) {
        //     return res.status(401).json({error: "Invalid Token"})
        //   }
        // } catch (error) {
        //   return res.status(401).json({error: "Invalid Token"})
        // }
        //get rid of email in the query and use the decoded users email
        const currentDate = admin.firestore.Timestamp.now();

        const snapshot = await db
          .collection("matches")
          .where("winner", "==", null)
          .where("timestamp", "<", currentDate) // get past matches
          .orderBy("timestamp", "asc") // orders oldest first
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
