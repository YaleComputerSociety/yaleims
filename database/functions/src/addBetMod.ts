import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

interface Bet {
  matchId: string;
  betAmount: number;
  betOdds: number;
  betOption: string;
  away_college: string;
  home_college: string;
  sport: string;
}

interface AddBetRequestBody {
  email: string;
  matchId: string;
  betAmount: number;
  betOdds: number;
  betOption: string;
  away_college: string;
  home_college: string;
  sport: string;
  isParlay: boolean;
  bets: Bet[];
  currentCashed: number;
}

const calculateParlayOdds = (bets: Bet[]): number => {
  return bets.reduce((acc, bet) => {
    if (!bet.betOdds || bet.betOdds <= 1) {
      throw new Error(`Invalid odds for match ${bet.matchId}: ${bet.betOdds}`);
    }
    return acc * bet.betOdds;
  }, 1);
};

export const addBetMod = functions.https.onRequest(async (req, res) => {
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
      isParlay,
      bets,
      currentCashed,
    }: AddBetRequestBody = req.body;

    // Validate required fields
    if (
      !email ||
      !matchId ||
      !betAmount ||
      !betOption ||
      !away_college ||
      !home_college ||
      !sport ||
      isParlay === undefined ||
      (isParlay && (!bets || !Array.isArray(bets) || bets.length === 0)) ||
      currentCashed === undefined
    ) {
      return res.status(400).send("Missing or invalid required fields");
    }

    if (betAmount <= 0) {
      return res.status(400).send("Bet amount must be greater than 0");
    }

    let finalOdds: number;
    if (isParlay) {
      try {
        finalOdds = calculateParlayOdds(bets);
      } catch (error) {
        return res.status(400).send(error);
      }
    } else {
      if (!betOdds || betOdds <= 1) {
        return res.status(400).send("Invalid odds for single bet");
      }
      finalOdds = betOdds;
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

      const matchesToCheck = isParlay ? bets : [{ matchId, away_college, home_college, sport, betAmount, betOdds, betOption }];

      for (const bet of matchesToCheck) {
        const matchRef = db.collection("matches").doc(bet.matchId);
        const matchDoc = await matchRef.get();
        if (!matchDoc.exists) {
          return res.status(404).send(`Match not found: ${bet.matchId}`);
        }
      }

      await db.runTransaction(async (transaction) => {
        const sanitizedEmail = email.replace(/\./g, "_");
        const betDoc = {
          matchId,
          betAmount,
          betOption,
          betOdds: finalOdds,
          away_college,
          home_college,
          sport,
          isParlay,
          bets: isParlay ? bets : [],
          currentCashed,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        transaction.update(userRef, {
          points: admin.firestore.FieldValue.increment(-betAmount),
        });

        const betRef = userRef.collection("bets").doc();
        transaction.set(betRef, betDoc);

        const betsToProcess = isParlay ? bets : [{ ...betDoc, betOdds }]; // Use original odds for single bet predictions

        for (const bet of betsToProcess) {
          const matchRef = db.collection("matches").doc(bet.matchId);
          const predictionsUpdate = {
            [`predictions.${sanitizedEmail}`]: {
              betOption: bet.betOption,
              betAmount: bet.betAmount,
              betOdds: bet.betOdds,
            },
          };

          transaction.update(matchRef, predictionsUpdate);

          if (bet.betOption === "Default") {
            transaction.update(matchRef, {
              default_volume: admin.firestore.FieldValue.increment(bet.betAmount),
            });
          } else if (bet.betOption === "Draw") {
            transaction.update(matchRef, {
              draw_volume: admin.firestore.FieldValue.increment(bet.betAmount),
            });
          } else if (bet.betOption === bet.away_college) {
            transaction.update(matchRef, {
              away_volume: admin.firestore.FieldValue.increment(bet.betAmount),
            });
          } else if (bet.betOption === bet.home_college) {
            transaction.update(matchRef, {
              home_volume: admin.firestore.FieldValue.increment(bet.betAmount),
            });
          } else {
            throw new Error(`Invalid betOption: ${bet.betOption}`);
          }
        }

        if (isParlay) {
          if (currentCashed < 0 || currentCashed > bets.length) {
            throw new Error("Invalid currentCashed value");
          }
        }
      });

      return res.status(200).send("Bet added successfully");
    } catch (error) {
      console.error("Error adding bet:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});