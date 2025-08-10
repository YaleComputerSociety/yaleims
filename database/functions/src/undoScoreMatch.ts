import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";

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
  forfeit: boolean;
  predictions: Record<string, Prediction>;
}

const canUndoScoreMatch = (role: string): boolean => {
  return role === "admin" || role === "dev";
};

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
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(idToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (!isValidDecodedToken(decoded) || !canUndoScoreMatch(decoded.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { matchId, year } = req.body;

      if (!matchId) {
        return res.status(400).json({ error: "Match ID is required." });
      }

      const matchRef = db
        .collection("matches")
        .doc("seasons")
        .collection(year)
        .doc(matchId);
      const matchSnapshot = await matchRef.get();

      if (!matchSnapshot.exists) {
        return res
          .status(404)
          .json({ error: `Match with ID ${matchId} does not exist.` });
      }

      const matchData = matchSnapshot.data() as MatchData;

      const {
        home_college: homeTeam,
        away_college: awayTeam,
        winner,
        sport,
        forfeit,
        predictions,
      } = matchData;

      if (
        !homeTeam ||
        !awayTeam ||
        !sport ||
        !winner ||
        typeof forfeit !== "boolean"
      ) {
        return res
          .status(400)
          .json({ error: "Match data is incomplete or invalid." });
      }

      const collegeUpdateData: Record<
        string,
        Record<string, admin.firestore.FieldValue>
      > = {};
      const pointsForWin = await getPointsForWinBySportName(sport);

      if (winner === "Default") {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(-1),
          forfeits: admin.firestore.FieldValue.increment(-1),
          points: admin.firestore.FieldValue.increment(pointsForWin / -2),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(-1),
          forfeits: admin.firestore.FieldValue.increment(-1),
          points: admin.firestore.FieldValue.increment(pointsForWin / -2),
        };
      } else if (winner === homeTeam) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(-1),
          wins: admin.firestore.FieldValue.increment(-1),
          points: admin.firestore.FieldValue.increment(-pointsForWin),
        };
        if (forfeit) {
          collegeUpdateData[awayTeam] = {
            games: admin.firestore.FieldValue.increment(-1),
            forfeits: admin.firestore.FieldValue.increment(-1),
          };
        } else {
          collegeUpdateData[awayTeam] = {
            games: admin.firestore.FieldValue.increment(-1),
            losses: admin.firestore.FieldValue.increment(-1),
          };
        }
      } else if (winner === awayTeam) {
        if (forfeit) {
          collegeUpdateData[homeTeam] = {
            games: admin.firestore.FieldValue.increment(-1),
            forfeits: admin.firestore.FieldValue.increment(-1),
          };
        } else {
          collegeUpdateData[homeTeam] = {
            games: admin.firestore.FieldValue.increment(-1),
            losses: admin.firestore.FieldValue.increment(-1),
          };
        }
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
              .doc(sanitizedEmail.replace(/_/g, "."))
              .collection("seasons")
              .doc(year);
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

      const homeCollegeRef = db
        .collection("colleges")
        .doc("seasons")
        .collection(year)
        .doc(homeTeam);
      const awayCollegeRef = db
        .collection("colleges")
        .doc("seasons")
        .collection(year)
        .doc(awayTeam);

      const batch = db.batch();
      if (collegeUpdateData[homeTeam]) {
        batch.update(homeCollegeRef, collegeUpdateData[homeTeam]);
      }
      if (collegeUpdateData[awayTeam]) {
        batch.update(awayCollegeRef, collegeUpdateData[awayTeam]);
      }

      await batch.commit();

      // Recalculate college ranks
      const collegesSnapshot = await db
        .collection("colleges")
        .doc("seasons")
        .collection(year)
        .get();
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
          .doc("seasons")
          .collection(year)
          .doc(college.id)
          .get();
        const newRank = index + 1;

        const isDateDifferent =
          formattedCurrentDate !== collegeDoc.data()?.today;

        if (isDateDifferent) {
          rankBatch.update(
            db
              .collection("colleges")
              .doc("seasons")
              .collection(year)
              .doc(college.id),
            {
              today: formattedCurrentDate,
              prevRank: collegeDoc.data()?.rank,
              rank: newRank,
            }
          );
        } else {
          rankBatch.update(
            db
              .collection("colleges")
              .doc("seasons")
              .collection(year)
              .doc(college.id),
            {
              rank: newRank,
            }
          );
        }
      }

      await rankBatch.commit();

      return res.status(200).json({
        message: "Score match successfully undone and ranks updated.",
      });
    } catch (error: any) {
      console.error("Error undoing score match:", error);
      return res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  });
});
