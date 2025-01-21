import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

interface Prediction {
  betOption: string;
  betAmount: number;
  betOdds: number;
}

interface MatchData {
  home_college: string;
  away_college: string;
  winner: string;
  sport: string;
  predictions: Record<string, Prediction>;
}

const getPointsForWinBySportName = async (
  sportName: string
): Promise<number> => {
  const sportsRef = db.collection("sports");
  const querySnapshot = await sportsRef.where("name", "==", sportName).get();

  if (querySnapshot.empty) {
    throw new Error(`No sport found with the name: ${sportName}`);
  }

  const sportDoc = querySnapshot.docs[0];
  const sportData = sportDoc.data();

  return sportData?.points_for_win || 0; // Default to 0 if undefined
};

export const undoScoreMatch = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const { matchId } = req.body;

      if (!matchId) {
        return res.status(400).send("Match ID is required.");
      }

      const matchRef = db.collection("matches").doc(matchId);
      const matchSnapshot = await matchRef.get();

      if (!matchSnapshot.exists) {
        throw new Error(`Match with ID ${matchId} does not exist in matches.`);
      }

      const matchData = matchSnapshot.data() as MatchData;

      const {
        home_college: homeTeam,
        away_college: awayTeam,
        winner,
        sport,
        predictions,
      } = matchData;

      if (!homeTeam || !awayTeam || !sport || !winner) {
        throw new Error("Match data is incomplete or invalid.");
      }

      const collegeUpdateData: Record<
        string,
        Record<string, admin.firestore.FieldValue>
      > = {};
      const pointsForWin = await getPointsForWinBySportName(sport);

      if (winner === homeTeam) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(-1),
          wins: admin.firestore.FieldValue.increment(-1),
          points: admin.firestore.FieldValue.increment(-pointsForWin),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(-1),
          losses: admin.firestore.FieldValue.increment(-1),
        };
      } else if (winner === awayTeam) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(-1),
          losses: admin.firestore.FieldValue.increment(-1),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(-1),
          wins: admin.firestore.FieldValue.increment(-1),
          points: admin.firestore.FieldValue.increment(-pointsForWin),
        };
      } else if (winner === "Draw") {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(-1),
          ties: admin.firestore.FieldValue.increment(-1),
          points: admin.firestore.FieldValue.increment(-(pointsForWin / 2)),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(-1),
          ties: admin.firestore.FieldValue.increment(-1),
          points: admin.firestore.FieldValue.increment(-(pointsForWin / 2)),
        };
      }

      const rewardBatch = db.batch();
      Object.entries(predictions || {}).forEach(
        ([sanitizedEmail, prediction]) => {
          if (prediction.betOption === winner) {
            const rewardAmount = parseFloat(
              (
                prediction.betAmount *
                (1 + (1 - prediction.betOdds) / prediction.betOdds)
              ).toFixed(2)
            );

            const userRef = db
              .collection("users")
              .doc(sanitizedEmail.replace(/_/g, "."));
            rewardBatch.update(userRef, {
              points: admin.firestore.FieldValue.increment(-rewardAmount),
              correctPredictions: admin.firestore.FieldValue.increment(-1), // Increment correctPredictions field
            });
          }
        }
      );
      await rewardBatch.commit();

      await matchRef.update({
        home_college_score: null,
        away_college_score: null,
        forfeit: null,
        winner: null,
      });

      const homeCollegeRef = db.collection("colleges").doc(homeTeam);
      const awayCollegeRef = db.collection("colleges").doc(awayTeam);

      const batch = db.batch();
      batch.update(homeCollegeRef, collegeUpdateData[homeTeam]);
      batch.update(awayCollegeRef, collegeUpdateData[awayTeam]);
      await batch.commit();

      // Recalculate college ranks
      const collegesSnapshot = await db.collection("colleges").get();
      const colleges: { id: string; points: number; wins: number }[] = [];

      collegesSnapshot.forEach((doc) => {
        colleges.push({
          id: doc.id,
          points: doc.data().points || 0,
          wins: doc.data().wins || 0,
        });
      });

      colleges.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return b.wins - a.wins; // Tie-breaker: descending by wins
      });

      const rankBatch = db.batch();
      const dateToday = new Date();
      const formattedCurrentDate = `${dateToday.getDate()}-${
        dateToday.getMonth() + 1
      }-${dateToday.getFullYear()}`;

      for (const [index, college] of colleges.entries()) {
        const collegeDoc = await db
          .collection("colleges")
          .doc(college.id)
          .get();
        const newRank = index + 1;

        const isDateDifferent =
          formattedCurrentDate !== collegeDoc.data()?.today;

        if (isDateDifferent) {
          rankBatch.update(db.collection("colleges").doc(college.id), {
            today: formattedCurrentDate,
            prevRank: collegeDoc.data()?.rank,
            rank: newRank,
          });
        } else {
          rankBatch.update(db.collection("colleges").doc(college.id), {
            rank: newRank,
          });
        }
      }

      await rankBatch.commit();

      return res
        .status(200)
        .send("Score match successfully undone and ranks updated.");
    } catch (error: any) {
      console.error("Error undoing score match:", error);
      return res
        .status(500)
        .send({ message: "Internal Server Error", error: error.message });
    }
  });
});
