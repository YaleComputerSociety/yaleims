import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();
interface AddBetRequestBody {
  email: string;
  matchId: string;
  betAmount: number;
  betOdds: number;
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
      betOdds,
      betOption,
      away_college,
      home_college,
      sport,
    }: AddBetRequestBody = req.body;

    if (
      !email ||
      !matchId ||
      !betAmount ||
      !betOption ||
      !betOdds ||
      !away_college ||
      !home_college ||
      !sport
    ) {
      return res.status(400).send("Missing required fields");
    }

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

    if (betAmount <= 0) {
      return res.status(400).send("Bet amount must be greater than 0");
    }

    try {
      const userRef = db.collection("users").doc(email);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).send("User not found");
      }

      const currentPoints = userDoc.data()?.points || 0;

      if (currentPoints < betAmount) {
        return res.status(400).send("Insufficient points for this bet");
      }

      const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();
      if (!matchDoc.exists) {
        return res.status(404).send("Match not found");
      }

      await db.runTransaction(async (transaction) => {
        const bet = {
          matchId,
          betAmount,
          betOption,
          betOdds,
          away_college,
          home_college,
          sport,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Replace dots in email with underscores to prevent nesting
        const sanitizedEmail = email.replace(/\./g, "_");

        // Update predictions map for the match
        const predictionsUpdate = {
          [`predictions.${sanitizedEmail}`]: { betOption, betAmount, betOdds },
        };

        transaction.update(matchRef, predictionsUpdate);

        transaction.update(userRef, {
          points: admin.firestore.FieldValue.increment(-betAmount),
        });

        transaction.set(userRef.collection("bets").doc(), bet);

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
            away_volume: admin.firestore.FieldValue.increment(betAmount),
          });
        } else if (betOption === home_college) {
          transaction.update(matchRef, {
            home_volume: admin.firestore.FieldValue.increment(betAmount),
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
