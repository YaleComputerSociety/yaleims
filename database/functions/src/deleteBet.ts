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
  betOdds: string;
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
  // TODO: fix this. There is no ID attached to a bet; they are in an array. It should iterate through all bets to check for common elements. Check that MatchID, betAmount, betOption, betOdds all match
  corsHandler(req, res, async () => {
    if (!isDelBetRequestBody(req.query)) {
      return res
        .status(400)
        .send("Required parameters are missing or incorrect.");
    }

    const {
      email,
      matchId,
      sport,
      betAmount,
      betOdds,
      betOption,
    }: DelBetRequestBody = req.query;
    // const { email, matchId, sport, betAmount, betOdds, betOption }: DelBetRequestBody = req.query as DelBetRequestBody;

    const betAmountNumber = parseFloat(betAmount);
    const betOddsNumber = parseFloat(betOdds);

    // Validation
    // if (!email || !matchId || !sport || !betAmount || !betOdds || !betOption) {
    // return res.status(400).send("Required parameters are missing");
    // }

    try {
      const userRef = db.collection("users_dha_testing").doc(email);
      // const userRef = db.collection("users").doc(email);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).send("User not found");
      }
      const userData = userDoc.data();

      if (!userData || !Array.isArray(userData.bets)) {
        return res.status(404).send("No bets found for this user");
      }

      const matchRef = db.collection("matches_dha_testing").doc(matchId);
      // const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();
      if (!matchDoc.exists) {
        return res.status(404).send("Match not found");
      }

      // 1. Update the match's betting volume
      const bet = userData.bets.find(
        (bet: any) =>
          bet.matchId === matchId &&
          // bet.betAmount === betAmount &&
          bet.betAmount === betAmountNumber &&
          // bet.betOdds === betOdds &&
          bet.betOdds === betOddsNumber &&
          bet.betOption === betOption &&
          bet.sport === sport
      );

      if (!bet) {
        return res
          .status(404)
          .send("Bet not found with the specified parameters");
      }

      // const bet = userData.bets.find((bet: any) => bet.matchId === matchId);
      if (bet.betOption == "Forfeit") {
        matchRef.update({
          forfeit_volume: admin.firestore.FieldValue.increment(bet.betAmount),
        });
      } else if (bet.betOption == "Draw") {
        matchRef.update({
          draw_volume: admin.firestore.FieldValue.increment(bet.betAmount),
        });
      } else if (bet.betOption == bet.away_college) {
        matchRef.update({
          away_college_volume: admin.firestore.FieldValue.increment(
            bet.betAmount
          ),
        });
      } else if (bet.betOption == bet.home_college) {
        matchRef.update({
          home_college_volume: admin.firestore.FieldValue.increment(
            bet.betAmount
          ),
        });
      } else {
        console.error("betOption doesn't exist");
      }

      // 2. Find the bet and remove it
      const updatedBets = userData.bets.filter(
        (bet: any) =>
          !(
            bet.matchId === matchId &&
            // bet.betAmount === betAmount &&
            bet.betAmount === betAmountNumber &&
            // bet.betOdds === betOdds &&
            bet.betOdds === betOddsNumber &&
            bet.betOption === betOption &&
            bet.sport === sport
          )
      );
      // const updatedBets = (userData?.bets || []).filter(
      // (bet: any) => bet.matchId !== matchId
      // );

      // 3. Update user's bets
      await userRef.update({
        bets: updatedBets,
      });

      return res.status(200).send("Bet deleted successfully");
    } catch (error) {
      console.error("Error deleting bet:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
