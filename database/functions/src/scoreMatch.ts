import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

// interface Prediction {
//   betOption: string;
//   betAmount: number;
//   betOdds: number;
// }

// interface PredictionsMap {
//   [email: string]: Prediction;
// }

const settleParlayLegs = async (matchId: string, winningTeam: string) => {
  const legsSnap = await db
    .collectionGroup("betArray")
    .where("matchId", "==", matchId)
    .where("won", "==", null)
    .get();

  await Promise.all(
    legsSnap.docs.map(async (legDoc) =>
      db.runTransaction(async (tx) => {
        const legRef = legDoc.ref;
        const leg = legDoc.data() as any;

        const parlayRef = legRef.parent.parent!;
        const userRef = parlayRef.parent.parent!;

        const parlaySnap = await tx.get(parlayRef);
        const parlay = parlaySnap.data()!;

        const legWon =
          (winningTeam === "Draw" && leg.betOption === "Draw") ||
          (winningTeam === leg.home_college && leg.betOption === leg.home_college) ||
          (winningTeam === leg.away_college && leg.betOption === leg.away_college);

        tx.update(legRef, {winner:winningTeam, won: legWon });

        const currentCashed = (parlay.currentCashed ?? 0) + 1;
        const lostLegs   = (parlay.lostLegs   ?? 0) + (legWon ? 0 : 1);

        tx.update(parlayRef, {
          currentCashed,
          lostLegs,
        });

        if (currentCashed === parlay.legCount) {
          const parlayWon = lostLegs === 0;
          const payout    = parlayWon ? parlay.betAmount * parlay.betOdds : 0;

          tx.update(parlayRef, { settled: true, won: parlayWon, payout });

          if (payout > 0) {
            tx.update(userRef, {
              points: admin.firestore.FieldValue.increment(payout),
              correctPredictions: admin.firestore.FieldValue.increment(1),
            });
          }
        }
      })
    )
  );
};

const getPointsForWinBySportName = async (sportName: string) => {
  const sportsRef = db.collection("sports");
  const querySnapshot = await sportsRef.where("name", "==", sportName).get();

  if (querySnapshot.empty) {
    throw new Error(`No sport found with the name: ${sportName}`);
  }

  const sportDoc = querySnapshot.docs[0];
  const sportData = sportDoc.data();

  const pointsForWin = sportData.points_for_win;

  return pointsForWin || 0;
};

export const scoreMatch = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const {
        matchId,
        homeScore,
        awayScore,
        homeForfeit,
        awayForfeit,
        homeTeam,
        awayTeam,
        sport,
      } = req.body;

      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      // validate request parameters
      if (
        !matchId ||
        typeof homeScore !== "number" ||
        typeof awayScore !== "number" ||
        typeof homeForfeit !== "boolean" ||
        typeof awayForfeit !== "boolean" ||
        typeof homeTeam !== "string" ||
        typeof awayTeam !== "string" ||
        typeof sport !== "string"
      ) {
        return res.status(400).send("Error with parameters");
      }

      // Check if the match has already been scored
      const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();

      if (!matchDoc.exists) {
        return res.status(404).send("Match not found.");
      }

      const existingMatchData = matchDoc.data();
      if (existingMatchData?.winner) {
        return res.status(400).send("This match has already been scored.");
      }

      let winningTeam: string;
      const doubleForfeit = homeForfeit && awayForfeit;

      // there's some forfeit logic here that i'm a little confused about
      if (doubleForfeit) {
        winningTeam = "Default"; // not sure if i understood this correctly
      } else if (homeForfeit || awayForfeit) {
        homeForfeit ? (winningTeam = awayTeam) : (winningTeam = homeTeam);
      } else if (homeScore == awayScore) {
        winningTeam = "Draw";
      } else {
        homeScore > awayScore
          ? (winningTeam = homeTeam)
          : (winningTeam = awayTeam);
      }

      // update match data in Firestore
      const matchUpdateData = {
        home_college_score: homeScore,
        away_college_score: awayScore,
        forfeit: homeForfeit || awayForfeit,
        winner: winningTeam,
      };

      // update college stats
      const collegeUpdateData: any = {};
      const pointsForWin = await getPointsForWinBySportName(sport); // evetually change this to get from firestore - but right now the data is stored weird; change id to string of the sport name rather than a number

      // all cases for updating college stats of win, loss, tie, forfeit, points (all cases increment games played)
      // this code is veryyy lengthy, but i'm unsure if there's a more concise way since there are just a lot of cases to manage
      if (doubleForfeit) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          forfeits: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin / 2),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          forfeits: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin / 2),
        };
      } else if (winningTeam === "Draw") {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          ties: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin / 2),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          ties: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin / 2),
        };
      } else if (homeForfeit) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          forfeits: admin.firestore.FieldValue.increment(1),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          wins: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin),
        };
      } else if (awayForfeit) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          wins: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          forfeits: admin.firestore.FieldValue.increment(1),
        };
      } else if (homeScore > awayScore) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          wins: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          losses: admin.firestore.FieldValue.increment(1),
        };
      } else if (homeScore < awayScore) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          losses: admin.firestore.FieldValue.increment(1),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          wins: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin),
        };
      }

      // doc refs
      const awayCollegeRef = db.collection("colleges").doc(awayTeam); // change to colleges
      const homeCollegeRef = db.collection("colleges").doc(homeTeam); // change to colleges

      // batch write
      const batch = db.batch();

      batch.update(matchRef, matchUpdateData);
      batch.update(awayCollegeRef, collegeUpdateData[awayTeam]);
      batch.update(homeCollegeRef, collegeUpdateData[homeTeam]);

      await batch.commit();

      // update ranks -- may be a good idea to have a separate function for this as well, scheduled to run every so often, to protect against failures (if this section doesn't run properly for some reason)
      const collegesSnapshot = await db.collection("colleges").get();
      const colleges: { id: string; points: number; wins: number }[] = [];

      collegesSnapshot.forEach((doc) => {
        colleges.push({
          id: doc.id,
          points: doc.data().points,
          wins: doc.data().wins, // tiebreaker -- need to look into how they actually break ties
        });
      });

      colleges.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return b.wins - a.wins; // Tie-breaker: descending by wins; might change
      });

      // ranks batch write
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

      // reward singles and parlays after dat
      const matchData = await db.collection("matches").doc(matchId).get();
      
      await settleParlayLegs(matchId, matchData.data()!.winner);

      return res
        .status(200)
        .send("Match, colleges, bets and parlays updated successfully.");
    } catch (error) {
      console.error("Error scoring match:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
