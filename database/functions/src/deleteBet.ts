import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

interface DelBetRequestBody {
  email: string;
  matchId: string;
  sport: string;
  betAmount: string;
  betOption: string;
}

function isDelBetRequestBody(query: any): query is DelBetRequestBody {
  return (
    typeof query.email === "string" &&
    typeof query.matchId === "string" &&
    typeof query.sport === "string" &&
    typeof query.betAmount === "string" && // betAmount comes as string from query params, so we need to cast it
    typeof query.betOdds === "string" && // same for betOdds
    typeof query.betOption === "string"
  );
}

export const deleteBet = functions.https.onRequest(async (req, res) => {
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
    if (!isDelBetRequestBody(req.query)) {
      return res
        .status(400)
        .send("Required parameters are missing or incorrect.");
    }

    const { email, matchId, sport, betAmount, betOption }: DelBetRequestBody =
      req.query;

    const betAmountNumber = parseFloat(betAmount);

    try {
      const userRef = db.collection("users").doc(email);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).send("User not found");
      }

      const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();
      if (!matchDoc.exists) {
        return res.status(404).send("Match not found");
      }

      const matchData = matchDoc.data();
      const matchTime = matchData?.timestamp?.toDate(); // Assuming `scheduledTime` is a Firestore Timestamp
      const now = new Date();

      if (
        !matchTime ||
        now > new Date(matchTime.getTime() - 24 * 60 * 60 * 1000)
      ) {
        return res
          .status(400)
          .send("Predictions cannot be deleted within 24 hours of a match.");
      }

      // Query the user's bets subcollection to find the bet
      const betsRef = userRef.collection("bets");
      const betSnapshot = await betsRef
        .where("matchId", "==", matchId)
        .where("betAmount", "==", betAmountNumber)
        .where("betOption", "==", betOption)
        .where("sport", "==", sport)
        .limit(1)
        .get();

      if (betSnapshot.empty) {
        return res
          .status(404)
          .send("Bet not found with the specified parameters");
      }

      const betDoc = betSnapshot.docs[0];
      const betData = betDoc.data();

      // Start a transaction to return points, delete the bet, and update the bets map
      await db.runTransaction(async (transaction) => {
        const sanitizedEmail = email.replace(/\./g, "_");
        // Return points to user
        transaction.update(userRef, {
          points: admin.firestore.FieldValue.increment(betAmountNumber),
        });

        // Delete the bet document
        transaction.delete(betsRef.doc(betDoc.id));

        // Update match volumes
        if (betData.betOption === "Default") {
          transaction.update(matchRef, {
            default_volume: admin.firestore.FieldValue.increment(
              -betAmountNumber
            ),
          });
        } else if (betData.betOption === "Draw") {
          transaction.update(matchRef, {
            draw_volume: admin.firestore.FieldValue.increment(-betAmountNumber),
          });
        } else if (betData.betOption === betData.away_college) {
          transaction.update(matchRef, {
            away_volume: admin.firestore.FieldValue.increment(-betAmountNumber),
          });
        } else if (betData.betOption === betData.home_college) {
          transaction.update(matchRef, {
            home_volume: admin.firestore.FieldValue.increment(-betAmountNumber),
          });
        } else {
          throw new Error("Invalid betOption");
        }

        // Remove the user from the bets map
        transaction.update(matchRef, {
          [`predictions.${sanitizedEmail}`]:
            admin.firestore.FieldValue.delete(),
        });
      });

      return res.status(200).send("Bet deleted successfully");
    } catch (error) {
      console.error("Error deleting bet:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
