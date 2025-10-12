import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";
import { updateEloRatings } from "./elo_system.js";
import { updateMatchOddsAfterEloChange } from "./elo_initial_odds.js";

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
  /*
  TODO: update this part to be year specific, i'm thinking if we add a year field to the betArray
  we can add a where("year", "==", year) to check for that
  */
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

        const parlaySnap = await tx.get(parlayRef);
        const parlay = parlaySnap.data()!;

        const legWon =
          (winningTeam === "Draw" && leg.betOption === "Draw") ||
          (winningTeam === leg.home_college &&
            leg.betOption === leg.home_college) ||
          (winningTeam === leg.away_college &&
            leg.betOption === leg.away_college);

        tx.update(legRef, { winner: winningTeam, won: legWon });

        const currentCashed = (parlay.currentCashed ?? 0) + 1;
        const lostLegs = (parlay.lostLegs ?? 0) + (legWon ? 0 : 1);

        tx.update(parlayRef, {
          currentCashed,
          lostLegs,
        });

        if (currentCashed === parlay.legCount) {
          const parlayWon = lostLegs === 0;
          const payout = parlayWon ? parlay.betAmount * parlay.betOdds : 0;

          tx.update(parlayRef, { settled: true, won: parlayWon, payout });
          const seasonDocRef = parlayRef.parent.parent!;

          if (payout > 0) {
            tx.update(seasonDocRef, {
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

const canScoreMatch = (role: string) => {
  return role === "admin" || role === "dev";
};

export const scoreMatch = functions.https.onRequest(async (req, res) => {
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
    if (!isValidDecodedToken(decoded) || !canScoreMatch(decoded.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const {
        matchId,
        homeScore,
        awayScore,
        homeForfeit,
        awayForfeit,
        homeTeam: homeTeamInputted,
        awayTeam: awayTeamInputted,
        sport,
        year,
      } = req.body;

      // validate request parameters
      if (
        !matchId ||
        typeof homeScore !== "number" ||
        typeof awayScore !== "number" ||
        typeof homeForfeit !== "boolean" ||
        typeof awayForfeit !== "boolean" ||
        typeof sport !== "string" ||
        typeof year !== "string"
      ) {
        return res.status(400).json({ message: "Error with parameters" });
      }

      // Check if the match has already been scored
      const matchRef = db
        .collection("matches")
        .doc("seasons")
        .collection(year)
        .doc(matchId);
      const matchDoc = await matchRef.get();

      if (!matchDoc.exists) {
        return res.status(404).json({ message: "Match not found." });
      }

      const existingMatchData = matchDoc.data();

      if (!existingMatchData) {
        return res.status(404).json({ message: "Match not found." });
      }

      if (existingMatchData?.winner) {
        return res
          .status(400)
          .json({ message: "This match has already been scored." });
      }

      const homeTeam = existingMatchData.home_college || homeTeamInputted;
      const awayTeam = existingMatchData.away_college || awayTeamInputted;

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

      // update college stats
      const collegeUpdateData: any = {};
      const pointsForWin = await getPointsForWinBySportName(sport);

      // all cases for updating college stats of win, loss, tie, forfeit, points (all cases increment games played)
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
      const awayCollegeRef = db
        .collection("colleges")
        .doc("seasons")
        .collection(year)
        .doc(awayTeam);
      const homeCollegeRef = db
        .collection("colleges")
        .doc("seasons")
        .collection(year)
        .doc(homeTeam);

      // batch write
      const batch = db.batch();

      batch.update(matchRef, matchUpdateData);
      batch.update(awayCollegeRef, collegeUpdateData[awayTeam]);
      batch.update(homeCollegeRef, collegeUpdateData[homeTeam]);

      await batch.commit();

      // Update ELO ratings after match is scored
      try {
        await updateEloRatings({
          homeTeam,
          awayTeam,
          sport,
          winner: winningTeam,
          matchType: "Regular", // You might want to determine this from match data
          timestamp: admin.firestore.Timestamp.now()
        }, year, matchId);

        // Update odds for future matches involving these teams
        // This is optional - you might want to update odds for upcoming matches
        console.log(`Updated ELO ratings for ${homeTeam} vs ${awayTeam} in ${sport}`);
      } catch (eloError) {
        console.error("Error updating ELO ratings:", eloError);
        // Don't fail the entire operation if ELO update fails
      }

      const matchDocData = matchDoc.data() || {};

      // update next match in bracket (if a playoff match and there is a definitive winner, else will have to be manual)
      const matchType = matchDocData.type;

      if (
        matchType &&
        matchType !== "Regular" &&
        matchType !== "Final" &&
        winningTeam &&
        winningTeam !== "Default" &&
        winningTeam !== "Draw"
      ) {
        const nextMatchId = matchDocData.next_match_id;
        const matchBracketSlot = matchDocData.playoff_bracket_slot;
        const winnerSeed =
          winningTeam == homeTeam
            ? matchDocData.home_seed
            : matchDocData.away_seed;

        if (nextMatchId && matchBracketSlot && winnerSeed) {
          const nextMatchRef = db
            .collection("matches")
            .doc("seasons")
            .collection(year)
            .doc(nextMatchId);

          // Get the next match data to determine both teams
          const nextMatchDoc = await nextMatchRef.get();
          const nextMatchData = nextMatchDoc.data();

          let updateData: any = {};
          let homeTeamNext: string;
          let awayTeamNext: string;

          if (matchBracketSlot % 2 === 1) {
            // Odd slot: update away team/seed
            updateData.away_college = winningTeam;
            updateData.away_seed = winnerSeed;
            homeTeamNext = nextMatchData?.home_college || "TBD";
            awayTeamNext = winningTeam;
          } else {
            // Even slot: update home team/seed
            updateData.home_college = winningTeam;
            updateData.home_seed = winnerSeed;
            homeTeamNext = winningTeam;
            awayTeamNext = nextMatchData?.away_college || "TBD";
          }

          // Calculate ELO-based odds if both teams are now determined
          if (homeTeamNext !== "TBD" && awayTeamNext !== "TBD") {
            try {
              const nextMatchOdds = await updateMatchOddsAfterEloChange(
                homeTeamNext,
                awayTeamNext,
                sport,
                year
              );
              
              // Add the odds to the update data
              Object.assign(updateData, nextMatchOdds);
              
              console.log(`Updated odds for next match ${nextMatchId}: ${homeTeamNext} vs ${awayTeamNext}`);
            } catch (oddsError) {
              console.error(`Error updating odds for next match ${nextMatchId}:`, oddsError);
              // Continue with the update even if odds calculation fails
            }
          }

          await nextMatchRef.update(updateData);
        }
      }

      // update ranks
      const collegesSnapshot = await db
        .collection("colleges")
        .doc("seasons")
        .collection(year)
        .get();
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

      // reward singles and parlays after dat
      const matchData = await db
        .collection("matches")
        .doc("seasons")
        .collection(year)
        .doc(matchId)
        .get();

      if (matchData.exists) {
        await settleParlayLegs(matchId, matchData.data()!.winner);
      }

      return res.status(200).json({
        success: true,
        message: "Match, colleges, bets and parlays updated successfully.",
      });
    } catch (error: any) {
      console.error("Error scoring match:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });
});
