import { Filter, OrderByDirection } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
// import { oddsCalculator } from "./yodds_helpers"

const corsHandler = cors({ origin: true });

const db = admin.firestore();

interface Odds {
  team1Win: number;
  team2Win: number;
  draw: number;
  forfeit: number;
}

// Function to calculate odds
// we have each team's rates for wins, losses, draws and forfeits
// we also have the betting volume for each of the four categories
function oddsCalculator(
  team1WinPercentage: number, // Team 1's win percentage from past games (0 to 1)
  team2WinPercentage: number, // Team 2's win percentage from past games (0 to 1)
  bettingVolume: { team1: number; team2: number; draw: number; forfeit: number }, // Betting volume for each outcome
  team1ForfeitRate: number, // Team 1's forfeit rate (0 to 1)
  team2ForfeitRate: number, // Team 2's forfeit rate (0 to 1)
): Odds {
  const defaultOdds = { team1Win: 0.35, team2Win: 0.35, draw: 0.1, forfeit: 0.2 };

  const totalBettingVolume =
    bettingVolume.team1 + bettingVolume.team2 + bettingVolume.draw + bettingVolume.forfeit;

  const bettingWeight = totalBettingVolume > 0 ? 1 : 0;

  const team1BettingShare = totalBettingVolume > 0 ? bettingVolume.team1 / totalBettingVolume : 0.35;
  const team2BettingShare = totalBettingVolume > 0 ? bettingVolume.team2 / totalBettingVolume : 0.35;
  const drawBettingShare = totalBettingVolume > 0 ? bettingVolume.draw / totalBettingVolume : 0.1;
  const forfeitBettingShare = totalBettingVolume > 0 ? bettingVolume.forfeit / totalBettingVolume : 0.2;

  const pastGamesWeight = 5;

  // Calculate the draw probability based on remaining probability
  const rawDrawProbability = 1 - team1WinPercentage - team2WinPercentage;

  // Softmax win and draw probabilities
  const expTeam1 = Math.exp(team1WinPercentage);
  const expTeam2 = Math.exp(team2WinPercentage);
  const expDraw = Math.exp(rawDrawProbability);

  const totalExp = expTeam1 + expTeam2 + expDraw;

  const normalizedTeam1Performance = expTeam1 / totalExp;
  const normalizedTeam2Performance = expTeam2 / totalExp;
  const normalizedDrawPerformance = expDraw / totalExp;

  const team1Forfeit = team1ForfeitRate;
  const team2Forfeit = team2ForfeitRate;

  const remainingForfeitProbability = Math.max(
    0.05,
    1 - normalizedTeam1Performance - normalizedTeam2Performance - normalizedDrawPerformance
  );

  const normalizedForfeitPerformance = Math.max(
    0.05,
    remainingForfeitProbability - team1Forfeit - team2Forfeit
  );

  const team1Win =
    (normalizedTeam1Performance * pastGamesWeight + team1BettingShare * bettingWeight) /
    (pastGamesWeight + bettingWeight || 1);

  const team2Win =
    (normalizedTeam2Performance * pastGamesWeight + team2BettingShare * bettingWeight) /
    (pastGamesWeight + bettingWeight || 1);

  const draw =
    (normalizedDrawPerformance * pastGamesWeight + drawBettingShare * bettingWeight) /
    (pastGamesWeight + bettingWeight || 1);

  const forfeit =
    (normalizedForfeitPerformance * pastGamesWeight + forfeitBettingShare * bettingWeight) /
    (pastGamesWeight + bettingWeight || 1);

  const totalOdds = team1Win + team2Win + draw + forfeit;

  return {
    team1Win: totalOdds > 0 ? team1Win / totalOdds : defaultOdds.team1Win,
    team2Win: totalOdds > 0 ? team2Win / totalOdds : defaultOdds.team2Win,
    draw: totalOdds > 0 ? draw / totalOdds : defaultOdds.draw,
    forfeit: totalOdds > 0 ? forfeit / totalOdds : defaultOdds.forfeit,
  };
}

export const getMatchesPaginated = functions.https.onRequest(
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        const college = req.query.college as string;
        const pageIndex = req.query.pageIndex as string;
        const pageSize = req.query.pageSize as string;
        const lastVisible = req.query.lastVisible as string;
        const type = req.query.type as string;
        const firstVisible = req.query.firstVisible as string;
        const sport = req.query.sport as string;
        const sortOrder = (req.query.sortOrder as string) || "desc";
        const date = req.query.date as string;

        if (!pageSize) {
          return res.status(400).send("Missing required parameters");
        }

        const pageSizeNum = parseInt(pageSize as string, 10);
        const pageIndexNum = parseInt(pageIndex as string, 10);
        if (!["asc", "desc"].includes(sortOrder)) {
          return res.status(400).send("Invalid 'sortOrder' parameter");
        }

        const currentDate = new Date();
        type DateFilterKey =
          | "today"
          | "yesterday"
          | "last7days"
          | "last30days"
          | "last60days"
          | "future";

        const dateFilters: Record<DateFilterKey, Date> = {
          today: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate()
          ),
          yesterday: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - 1
          ),
          last7days: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - 7
          ),
          last30days: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - 30
          ),
          last60days: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - 60
          ),
          future: currentDate,
        };

        const sortOrderValidated = sortOrder as OrderByDirection;
        let query = db
          .collection("matches")
          .orderBy("timestamp", sortOrderValidated);

        if (college && college !== "All") {
          query = query.where(
            Filter.or(
              Filter.where("home_college", "==", college),
              Filter.where("away_college", "==", college)
            )
          );
        }

        if (sport && sport !== "All") {
          query = query.where("sport", "==", sport);
        }

        // Handle different date filters
        if (date === "future") {
          // Future matches: timestamp >= current date, no winner yet
          query = query
            .where("timestamp", ">=", currentDate)
            .where("winner", "==", null);
        } else if (date && date !== "All") {
          if (!(date in dateFilters)) {
            return res.status(400).send("Invalid date filter");
          }

          const startDate = dateFilters[date as keyof typeof dateFilters];
          query = query
            .where("timestamp", ">=", startDate)
            .where("winner", "!=", null);
        } else {
          // Default: past matches with winners
          query = query
            .where("timestamp", "<", currentDate)
            .where("winner", "!=", null);
        }

        const totalResults = (await query.count().get()).data().count;
        const totalPages = Math.ceil(totalResults / pageSizeNum);

        // Handle pagination based on type
        if (type === "next" && lastVisible) {
          const lastVisibleDoc = await db
            .collection("matches")
            .doc(lastVisible as string)
            .get();
          if (!lastVisibleDoc.exists)
            return res.status(404).send("Last visible document not found");
          query = query.startAfter(lastVisibleDoc).limit(pageSizeNum);
        } else if (type === "prev" && firstVisible) {
          const firstVisibleDoc = await db
            .collection("matches")
            .doc(firstVisible as string)
            .get();
          if (!firstVisibleDoc.exists)
            return res.status(404).send("First visible document not found");
          query = query.endBefore(firstVisibleDoc).limitToLast(pageSizeNum);
        } else if (type === "index" && pageIndexNum >= 1) {
          query = query
            .offset((pageIndexNum - 1) * pageSizeNum)
            .limit(pageSizeNum);
        } else {
          return res.status(400).send("Invalid or missing 'type' parameter");
        }

        const snapshot = await query.get();
        if (snapshot.empty) {
          return res.status(200).json({
            matches: [],
            lastVisible: null,
            firstVisible: null,
            totalPages,
          });
        }

        // Save all college stats in a map for faster access (from abbreviation to college data)
        const collegeStatsMap = new Map<string, any>();

        // Preload all colleges' data into memory to avoid repeated Firestore calls
        const collegeDocs = await db.collection("colleges").get();
        collegeDocs.forEach(collegeDoc => {
          const collegeData = collegeDoc.data();
          if (collegeData) {
            collegeStatsMap.set(collegeData.abbreviation, collegeData); // Store college data by abbreviation
          }
        });

        const matches = snapshot.docs.map((doc) => {
        // const matches = snapshot.docs.map((doc) => ({
          const data = doc.data()

          const homeCollegeStats = collegeStatsMap.get(data.home_college);
          const awayCollegeStats = collegeStatsMap.get(data.away_college);

          // Check if the college data exists
          if (!homeCollegeStats || !awayCollegeStats) {
            console.error(`College data not found for ${data.home_college} or ${data.away_college}`);
            return null; // or handle the error appropriately
          } else {
            console.log(`College data found for ${data.home_college} and ${data.away_college}`);
          }
          const bettingVolume = {
            team1: data.home_volume,
            team2: data.away_volume,
            draw: data.draw_volume,
            forfeit: data.default_volume,
          };
          const odds = oddsCalculator(
            homeCollegeStats.wins / homeCollegeStats.games,
            awayCollegeStats.wins / awayCollegeStats.games,
            bettingVolume,
            homeCollegeStats.forfeits / homeCollegeStats.games,
            awayCollegeStats.forfeits / awayCollegeStats.games
          );
	  console.log("oddsCalculator called")
          return {
            id: doc.id,
            ...data,
            default_odds: odds.forfeit,
            home_college_odds: odds.team1Win,
            away_college_odds: odds.team2Win,
            draw_odds: odds.draw,
            timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
          };
        });
        // }));

        return res.status(200).json({
          matches,
          lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
          firstVisible: snapshot.docs[0]?.id || null,
          totalPages,
        });
      } catch (error) {
        console.error("Error fetching matches:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);
