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
  away_college: string;
  home_college: string;
  sport: string;
}

export const addBet = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const {
      email,
      matchId,
      betAmount,
      betOption,
      away_college,
      home_college,
      sport,
    }: AddBetRequestBody = req.body;

    // Validation
    if (
      !email ||
      !matchId ||
      !betAmount ||
      !betOption ||
      !away_college ||
      !home_college ||
      !sport
    ) {
      return res.status(400).send("Missing required fields");
    }

    if (typeof email !== "string" || email.trim() === "") {
      return res.status(400).send("Invalid email");
    }

    if (typeof matchId !== "string" || matchId.trim() === "") {
      return res.status(400).send("Invalid matchId");
    }

    if (betAmount <= 0) {
      return res.status(400).send("Bet amount must be greater than 0");
    }

    try {
      // 1. Check if user exists and has enough points
      const userRef = db.collection("users").doc(email);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).send("User not found");
      }

      const userData = userDoc.data();
      const currentPoints = userData?.points || 0;

      if (currentPoints < betAmount) {
        return res.status(400).send("Insufficient points for this bet");
      }

      // 2. Check if match exists
      const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();
      if (!matchDoc.exists) {
        return res.status(404).send("Match not found");
      }

      // 4. Start a transaction to update points and add bet
      await db.runTransaction(async (transaction) => {
        // Add the bet to a subcollection
        const userRef = db.collection("users").doc(email); // Parent document
        const betRef = userRef.collection("bets").doc(); // Subcollection and auto-generated ID

        const bet = {
          matchId,
          betAmount,
          betOption,
          away_college,
          home_college,
          sport,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Deduct points from the user
        transaction.update(userRef, {
          points: admin.firestore.FieldValue.increment(-betAmount),
        });

        // Add bet to the subcollection
        transaction.set(betRef, bet);

        // Update match volumes
        if (betOption === "Default") {
          transaction.update(matchRef, {
            default_volume: admin.firestore.FieldValue.increment(betAmount),
          });
        } else if (betOption === "Draw") {
          transaction.update(matchRef, {
            draw_volume: admin.firestore.FieldValue.increment(betAmount),
          });
        } else if (betOption === away_college) {
          transaction.update(matchRef, {
            away_college_volume:
              admin.firestore.FieldValue.increment(betAmount),
          });
        } else if (betOption === home_college) {
          transaction.update(matchRef, {
            home_college_volume:
              admin.firestore.FieldValue.increment(betAmount),
          });
        } else {
          throw new Error("Invalid betOption");
        }
      });

      return res.status(200).send("Bet added successfully");
    } catch (error) {
      console.error("Error adding bet:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
