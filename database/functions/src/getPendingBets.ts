import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const getPendingBets = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
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
    const { email } = req.query;

    if (typeof email !== "string") {
      return res.status(400).send("Email must be a valid string");
    }

    try {
      // 1. Check if the user exists
      const userRef = db.collection("users").doc(email);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).send("User not found");
      }

      // 2. Query the user's bets subcollection
      const betsRef = userRef.collection("bets");
      const betsSnapshot = await betsRef.get();

      if (betsSnapshot.empty) {
        return res.status(404).send("No bets found for this user");
      }

      const betsWithTimestamps = [];

      for (const betDoc of betsSnapshot.docs) {
        const bet = betDoc.data();

        // Fetch the match document using the matchId
        const matchRef = db.collection("matches").doc(bet.matchId);
        const matchDoc = await matchRef.get();

        if (!matchDoc.exists) {
          console.log(`Match not found for matchId: ${bet.matchId}`);
          continue; // Skip if match not found
        }

        const matchData = matchDoc.data();

        // If the match does not have a winner, add the bet with the match timestamp
        if (
          !matchData ||
          matchData.winner === undefined ||
          matchData.winner === null ||
          matchData.winner === ""
        ) {
          betsWithTimestamps.push({
            ...bet,
            matchTimestamp:
              matchData?.timestamp?.toDate()?.toISOString() || null,
          });
        }
      }

      // Return the filtered list of bets with match timestamps
      return res.status(200).json(betsWithTimestamps);
    } catch (error) {
      console.error("Error fetching pending bets:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
