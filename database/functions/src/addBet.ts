import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

interface AddBetRequestBody {
  email: string;
  matchId: string;
  betAmount: number;
  betOption: string;
  betOdds: number;
  away_college: string;
  home_college: string;
  sport: string;
  timestamp: string;
}

export const addBet = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const {
      email,
      matchId,
      betAmount,
      betOption,
      betOdds,
      away_college,
      home_college,
      sport,
      timestamp,
    }: AddBetRequestBody = req.body;

    // Validation
    if (
      !email ||
      !matchId ||
      !betAmount ||
      !betOption ||
      !away_college ||
      !home_college ||
      !sport ||
      !timestamp
    ) {
      return res.status(400).send("Missing required fields");
    }

    if (betAmount <= 0) {
      return res.status(400).send("Bet amount must be greater than 0");
    }

    try {
      // 1. Check if user exists
      const userRef = db.collection("users_dha_testing").doc(email);
      // const userRef = db.collection("users").doc(email);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).send("User not found");
      }

      // 2. Check if match exists
      const matchRef = db.collection("matches_dha_testing").doc(matchId);
      // const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();
      if (!matchDoc.exists) {
        return res.status(404).send("Match not found");
      }

      console.log("Request body:", req.body);
      console.log("User document data:", userDoc.data());
      console.log("Match document data:", matchDoc.data());

      // 3. Create the bet
      const bet = {
        matchId,
        betAmount,
        betOption,
        betOdds,
        away_college,
        home_college,
        sport,
        timestamp,
        // createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // 4. Update the user's bets
      await userRef.update({
        bets: admin.firestore.FieldValue.arrayUnion(bet),
      });

      // 5. Update the match's betting volume
      if (betOption == "Forfeit") {
        matchRef.update({
          forfeit_volume: admin.firestore.FieldValue.increment(betAmount),
        });
      } else if (betOption == "Draw") {
        matchRef.update({
          draw_volume: admin.firestore.FieldValue.increment(betAmount),
        });
      } else if (betOption == away_college) {
        matchRef.update({
          away_college_volume: admin.firestore.FieldValue.increment(betAmount),
        });
      } else if (betOption == home_college) {
        matchRef.update({
          home_college_volume: admin.firestore.FieldValue.increment(betAmount),
        });
      } else {
        console.error("betOption doesn't exist");
      }

      return res.status(200).send("Bet added successfully");
    } catch (error) {
      console.error("Error adding bet:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
