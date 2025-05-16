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

// const getPointsForWinBySportName = async (sportName: string) => {
//   // Query Firestore for the document where the "name" field matches the sport name
//   const sportsRef = db.collection("sports");
//   const querySnapshot = await sportsRef.where("name", "==", sportName).get();

//   if (querySnapshot.empty) {
//     throw new Error(`No sport found with the name: ${sportName}`);
//   }

//   // Since names are unique, get the first document
//   const sportDoc = querySnapshot.docs[0];
//   const sportData = sportDoc.data();

//   // Retrieve points_for_win from the document
//   const pointsForWin = sportData.points_for_win;

//   return pointsForWin || 0; // Return 0 if points_for_win is undefined
// };

export const scoreMatchTesting = functions.https.onRequest(async (req, res) => {
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
        return res.status(405).json({ error: "Method Not Allowed" });
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
        return res.status(400).json({ error: "Error with parameters" });
      }

      // Check if the match has already been scored
      const matchRef = db.collection("matches_testing").doc(matchId);
      const matchDoc = await matchRef.get();

      if (!matchDoc.exists) {
        return res.status(404).json({ error: "Match not found" });
      }

      const existingMatchData = matchDoc.data();
      if (existingMatchData?.winner) {
        return res
          .status(400)
          .json({ error: "This match has already been scored." });
      }

      let winningTeam: string;
      const doubleForfeit = homeForfeit && awayForfeit;

      if (doubleForfeit) {
        winningTeam = "Default";
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

      // // update college stats
      // const collegeUpdateData: any = {};
      // const pointsForWin = await getPointsForWinBySportName(sport); // evetually change this to get from firestore - but right now the data is stored weird; change id to string of the sport name rather than a number

      // //   // all cases for updating college stats of win, loss, tie, forfeit, points (all cases increment games played)
      // if (doubleForfeit) {
      //   collegeUpdateData[homeTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     forfeits: admin.firestore.FieldValue.increment(1),
      //     points: admin.firestore.FieldValue.increment(pointsForWin / 2),
      //   };
      //   collegeUpdateData[awayTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     forfeits: admin.firestore.FieldValue.increment(1),
      //     points: admin.firestore.FieldValue.increment(pointsForWin / 2),
      //   };
      // } else if (winningTeam === "Draw") {
      //   collegeUpdateData[homeTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     ties: admin.firestore.FieldValue.increment(1),
      //     points: admin.firestore.FieldValue.increment(pointsForWin / 2),
      //   };
      //   collegeUpdateData[awayTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     ties: admin.firestore.FieldValue.increment(1),
      //     points: admin.firestore.FieldValue.increment(pointsForWin / 2),
      //   };
      // } else if (homeForfeit) {
      //   collegeUpdateData[homeTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     forfeits: admin.firestore.FieldValue.increment(1),
      //   };
      //   collegeUpdateData[awayTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     wins: admin.firestore.FieldValue.increment(1),
      //     points: admin.firestore.FieldValue.increment(pointsForWin),
      //   };
      // } else if (awayForfeit) {
      //   collegeUpdateData[homeTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     wins: admin.firestore.FieldValue.increment(1),
      //     points: admin.firestore.FieldValue.increment(pointsForWin),
      //   };
      //   collegeUpdateData[awayTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     forfeits: admin.firestore.FieldValue.increment(1),
      //   };
      // } else if (homeScore > awayScore) {
      //   collegeUpdateData[homeTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     wins: admin.firestore.FieldValue.increment(1),
      //     points: admin.firestore.FieldValue.increment(pointsForWin),
      //   };
      //   collegeUpdateData[awayTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     losses: admin.firestore.FieldValue.increment(1),
      //   };
      // } else if (homeScore < awayScore) {
      //   collegeUpdateData[homeTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     losses: admin.firestore.FieldValue.increment(1),
      //   };
      //   collegeUpdateData[awayTeam] = {
      //     games: admin.firestore.FieldValue.increment(1),
      //     wins: admin.firestore.FieldValue.increment(1),
      //     points: admin.firestore.FieldValue.increment(pointsForWin),
      //   };
      // }

      //   // doc refs
      // const awayCollegeRef = db.collection("colleges_testing").doc(awayTeam);
      // const homeCollegeRef = db.collection("colleges_testing").doc(homeTeam);

      // batch write
      const batch = db.batch();

      batch.update(matchRef, matchUpdateData);
      // batch.update(awayCollegeRef, collegeUpdateData[awayTeam]);
      // batch.update(homeCollegeRef, collegeUpdateData[homeTeam]);

      // get match data
      const matchData = matchDoc.data() || {};

      // update next match in bracket (if a playoff match and there is a definitive winner, else will have to be manual?)
      const matchType = matchData.type;

      if (
        matchType &&
        matchType !== "Regular" &&
        matchType !== "Final" &&
        winningTeam !== "Default" &&
        winningTeam !== "Draw"
      ) {
        const nextMatchId = matchData.next_match_id;

        // Determine which field to use for bracket position
        // Check both possible field names
        const bracketPosition =
          matchData.bracket_placement || matchData.playoff_bracket_slot || null;

        const winnerSeed =
          winningTeam === homeTeam ? matchData.home_seed : matchData.away_seed;

        console.log("Next match info:", {
          nextMatchId,
          bracketPosition,
          winnerSeed,
          winningTeam,
        });

        if (nextMatchId && bracketPosition !== null) {
          const nextMatchRef = db
            .collection("matches_testing")
            .doc(nextMatchId);

          // Prepare update object
          let updateData: any = {};

          // Check if position is odd or even
          if (bracketPosition % 2 === 1) {
            // Odd slot: update away fields
            updateData.away_college = winningTeam;
            if (winnerSeed !== undefined && winnerSeed !== null) {
              updateData.away_seed = winnerSeed;
            }
          } else {
            // Even slot: update home fields
            updateData.home_college = winningTeam;
            if (winnerSeed !== undefined && winnerSeed !== null) {
              updateData.home_seed = winnerSeed;
            }
          }

          console.log("Updating next match with:", updateData);
          batch.update(nextMatchRef, updateData);
        }
      }

      await batch.commit();

      // // update ranks
      // const collegesSnapshot = await db.collection("colleges_testing").get();
      // const colleges: { id: string; points: number; wins: number }[] = [];

      // collegesSnapshot.forEach((doc) => {
      //   colleges.push({
      //     id: doc.id,
      //     points: doc.data().points,
      //     wins: doc.data().wins, // tiebreaker -- need to look into how they actually break ties
      //   });
      // });

      // colleges.sort((a, b) => {
      //   if (b.points !== a.points) {
      //     return b.points - a.points;
      //   }
      //   return b.wins - a.wins; // Tie-breaker: descending by wins; might change
      // });

      // // ranks batch write
      // const rankBatch = db.batch();
      // const dateToday = new Date();
      // const formattedCurrentDate = `${dateToday.getDate()}-${
      //   dateToday.getMonth() + 1
      // }-${dateToday.getFullYear()}`;

      // for (const [index, college] of colleges.entries()) {
      //   const collegeDoc = await db
      //     .collection("colleges_testing")
      //     .doc(college.id)
      //     .get();
      //   const newRank = index + 1;

      //   const isDateDifferent =
      //     formattedCurrentDate !== collegeDoc.data()?.today;

      //   if (isDateDifferent) {
      //     rankBatch.update(db.collection("colleges_testing").doc(college.id), {
      //       today: formattedCurrentDate,
      //       prevRank: collegeDoc.data()?.rank,
      //       rank: newRank,
      //     });
      //   } else {
      //     rankBatch.update(db.collection("colleges_testing").doc(college.id), {
      //       rank: newRank,
      //     });
      //   }
      // }

      // await rankBatch.commit();

      // const predictions =
      //   (matchData.data()?.predictions as PredictionsMap) || {};

      // const rewardBatch = db.batch();

      // for (const [sanitizedEmail, prediction] of Object.entries(predictions)) {
      //   if (prediction.betOption === winningTeam) {
      //     const rewardAmount = parseFloat(
      //       (
      //         prediction.betAmount *
      //         (1 + (1 - prediction.betOdds) / prediction.betOdds)
      //       ).toFixed(2)
      //     );

      //     const userRef = db
      //       .collection("users")
      //       .doc(sanitizedEmail.replace(/_/g, "."));
      //     rewardBatch.update(userRef, {
      //       points: admin.firestore.FieldValue.increment(rewardAmount),
      //       correctPredictions: admin.firestore.FieldValue.increment(1), // Increment correctPredictions field
      //     });
      //   }
      // }

      // await rewardBatch.commit();

      // return success response
      return res
        .status(200)
        .json({ message: "Match and colleges data updated successfully." });
    } catch (error) {
      console.error("Error scoring match:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
