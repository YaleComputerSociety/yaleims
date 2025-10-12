import * as functions from "firebase-functions";
import cors from "cors";
import { calculateInitialEloOdds } from "./elo_initial_odds.js";
import { getEloRating } from "./elo_system.js";

const corsHandler = cors({ origin: true });

/**
 * Test function to verify ELO-based odds calculation
 * This function demonstrates how odds are swayed in favor of higher ELO teams
 */
export const testEloOdds = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
      const { homeTeam, awayTeam, sport, year } = req.body;

      if (!homeTeam || !awayTeam || !sport || !year) {
        return res.status(400).json({ 
          error: "Missing required parameters: homeTeam, awayTeam, sport, year" 
        });
      }

      // Get ELO ratings for both teams
      const homeElo = await getEloRating(homeTeam, sport, year);
      const awayElo = await getEloRating(awayTeam, sport, year);

      // Calculate initial odds
      const initialOdds = await calculateInitialEloOdds(homeTeam, awayTeam, sport, year);

      // Calculate win probabilities to show the sway
      const homeExpected = 1 / (1 + Math.pow(10, (awayElo.rating - homeElo.rating) / 400));
      const awayExpected = 1 / (1 + Math.pow(10, (homeElo.rating - awayElo.rating) / 400));

      const response = {
        teams: {
          home: {
            name: homeTeam,
            eloRating: homeElo.rating,
            expectedWinProbability: homeExpected
          },
          away: {
            name: awayTeam,
            eloRating: awayElo.rating,
            expectedWinProbability: awayExpected
          }
        },
        odds: {
          home_college_odds: initialOdds.home_college_odds,
          away_college_odds: initialOdds.away_college_odds,
          draw_odds: initialOdds.draw_odds,
          default_odds: initialOdds.default_odds
        },
        analysis: {
          higherEloTeam: homeElo.rating > awayElo.rating ? homeTeam : awayTeam,
          eloDifference: Math.abs(homeElo.rating - awayElo.rating),
          oddsSwayedInFavor: homeElo.rating > awayElo.rating ? 
            (initialOdds.home_college_odds < initialOdds.away_college_odds ? homeTeam : awayTeam) :
            (initialOdds.away_college_odds < initialOdds.home_college_odds ? awayTeam : homeTeam)
        }
      };

      return res.status(200).json(response);
    } catch (error: any) {
      console.error("Error testing ELO odds:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  });
});
