import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const getPendingBets = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const { email } = req.query;

    if (typeof email !== "string") {
      return res.status(400).send("Email must be a valid string");
    }

    try {
      // 1. Check if user exists
      const userRef = db.collection("users_dha_testing").doc(email);
      // const userRef = db.collection("users").doc(email);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).send("User not found");
      }

      const userData = userDoc.data();

      console.log("User document data:", userData);

      // Ensure the user has a 'bets' field, which is an array
      if (!userData || !Array.isArray(userData.bets)) {
        return res.status(404).send("No bets found for this user");
      }

      const sortedBets = userData.bets.sort((a, b) => {
        // Ensure timestamps are valid
        const timestampA = new Date(a.timestamp).getTime();
        const timestampB = new Date(b.timestamp).getTime();
        return timestampA - timestampB; // ascending order (latest last)
      });

      // Prepare an array to hold bets without a winner
      const betsWithoutWinner = [];

      // Iterate over the user's bets to check the corresponding match's winner
      for (const bet of sortedBets) {
        // Fetch the match document using the matchId
        const matchRef = admin
          .firestore()
          .collection("matches_dha_testing")
          .doc(bet.matchId);
        // const matchRef = admin.firestore().collection("matches").doc(bet.matchId);
        const matchDoc = await matchRef.get();

        if (!matchDoc.exists) {
          console.log(`Match not found for matchId: ${bet.matchId}`);
          continue; // Skip if match not found
        }

        const matchData = matchDoc.data();

        // If the match does not have a winner attribute, add this bet to the result list
        if (
          !matchData ||
          ((matchData.winner === undefined ||
            matchData.winner === null ||
            matchData.winner === "") &&
            matchData.forfeit === false)
        ) {
          betsWithoutWinner.push(bet);
        }
      }

      // Return the filtered list of bets
      return res.status(200).json(betsWithoutWinner);
    } catch (error) {
      console.error("Error adding bet:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
