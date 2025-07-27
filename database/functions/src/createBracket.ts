// import * as functions from "firebase-functions";
// import admin from "./firebaseAdmin.js";
// import cors from "cors";

// const corsHandler = cors({ origin: true });

// const db = admin.firestore();

// interface MatchSlotPair {
//   topMatchSlot: number;
//   bottomMatchSlot: number;
// }

// const matchRounds: Record<number, string> = {
//   1: "Bye",
//   2: "Playoff",
//   3: "Playoff",
//   4: "Playoff",
//   5: "Quarterfinal",
//   6: "Quarterfinal",
//   7: "Bye",
//   8: "Playoff",
//   9: "Playoff",
//   10: "Playoff",
//   11: "Quarterfinal",
//   12: "Quarterfinal",
//   13: "Semifinal",
//   14: "Semifinal",
//   15: "Final",
// };

// // -1 for final --> nowhere else to go
// const nextMatchMap: Record<number, number> = {
//   1: 5,
//   2: 5,
//   3: 6,
//   4: 6,
//   5: 13,
//   6: 13,
//   7: 11,
//   8: 11,
//   9: 12,
//   10: 12,
//   11: 14,
//   12: 14,
//   13: 15,
//   14: 15,
//   15: -1,
// };

// const prevMatchMap: Record<number, MatchSlotPair> = {
//   5: { topMatchSlot: 1, bottomMatchSlot: 2 },
//   6: { topMatchSlot: 3, bottomMatchSlot: 4 },
//   13: { topMatchSlot: 5, bottomMatchSlot: 6 },
//   11: { topMatchSlot: 7, bottomMatchSlot: 8 },
//   12: { topMatchSlot: 9, bottomMatchSlot: 10 },
//   14: { topMatchSlot: 11, bottomMatchSlot: 12 },
//   1: { topMatchSlot: 0, bottomMatchSlot: 0 },
//   2: { topMatchSlot: 0, bottomMatchSlot: 0 },
//   3: { topMatchSlot: 0, bottomMatchSlot: 0 },
//   4: { topMatchSlot: 0, bottomMatchSlot: 0 },
//   7: { topMatchSlot: 0, bottomMatchSlot: 0 },
//   8: { topMatchSlot: 0, bottomMatchSlot: 0 },
//   9: { topMatchSlot: 0, bottomMatchSlot: 0 },
//   10: { topMatchSlot: 0, bottomMatchSlot: 0 },
//   15: { topMatchSlot: 0, bottomMatchSlot: 0 },
// };

// interface BracketData {
//   sport: string;
//   teams: Team[];
// }

// interface Team {
//   college: string;
//   seed: string | number;
//   division: "green" | "blue" | "none";
//   matchSlot: string | number;
//   matchDatetime: string;
//   location: string;
// }

// interface ParsedMatch {
//   matchSlot: number;
//   away_college: string;
//   away_seed: number;
//   home_college: string;
//   home_seed: number;
//   location: string;
//   timestamp: string;
//   division: "green" | "blue" | "final" | "none";
// }

// /**
//  * Parses BracketData into an array of ParsedMatch objects,
//  * ensuring higher seeds are placed as home teams
//  */
// function parseTeamsToMatches(bracketData: BracketData): ParsedMatch[] {
//   const { teams } = bracketData;

//   // Group teams by matchSlot
//   const matchSlotMap: Map<number, Team[]> = new Map();

//   // Convert all matchSlots to numbers and create groups
//   teams.forEach((team) => {
//     // Skip teams without a valid matchSlot
//     if (!team.matchSlot) return;

//     const matchSlotNum = Number(team.matchSlot);
//     if (isNaN(matchSlotNum)) return;

//     // Get or create the array for this matchSlot
//     const teamsForSlot = matchSlotMap.get(matchSlotNum) || [];
//     teamsForSlot.push({
//       ...team,
//       // Convert seed to number
//       seed:
//         typeof team.seed === "string" ? parseInt(team.seed) || 0 : team.seed,
//     });

//     matchSlotMap.set(matchSlotNum, teamsForSlot);
//   });

//   // Create ParsedMatch objects from the grouped teams
//   const parsedMatches: ParsedMatch[] = [];

//   matchSlotMap.forEach((teamsInSlot, matchSlot) => {
//     const matchRound = matchRounds[matchSlot];

//     // ensure playoff games have 2 teams
//     if (teamsInSlot.length !== 2 && matchRound === "Playoff") return;
//     else if (matchRound !== "Playoff") {
//       teamsInSlot.push(teamsInSlot[0]); // update formatting for other match types to be consistent
//     }

//     if (matchRound === "Playoff") {
//       // Sort teams by seed (lower seed number = higher seed)
//       teamsInSlot.sort((a, b) => {
//         const seedA =
//           typeof a.seed === "string" ? parseInt(a.seed) || 999 : a.seed;
//         const seedB =
//           typeof b.seed === "string" ? parseInt(b.seed) || 999 : b.seed;
//         return seedA - seedB;
//       });
//     }

//     // First team (index 0) is higher seeded (lower number), should be home
//     const [higherSeed, lowerSeed] = teamsInSlot;

//     // Determine if this is a final match or which division it belongs to
//     let division: "green" | "blue" | "final" | "none" = "green";

//     if (matchSlot === 15) {
//       division = "final";
//     } else if (
//       (matchRound === "Playoff" || matchRound === "Bye") &&
//       higherSeed.division === lowerSeed.division
//     ) {
//       division = higherSeed.division;
//     } else {
//       division = "none";
//     }

//     // Find the timestamp from either team (prefer the first one with a value)
//     const timestamp = higherSeed.matchDatetime || lowerSeed.matchDatetime || "";

//     // Find the location from either team (prefer the first one with a value)
//     const location = higherSeed.location || lowerSeed.location || "";

//     // Create the ParsedMatch object
//     const parsedMatch: ParsedMatch = {
//       matchSlot,
//       home_college: higherSeed.college,
//       home_seed: Number(higherSeed.seed),
//       away_college: lowerSeed.college,
//       away_seed: Number(lowerSeed.seed),
//       location,
//       timestamp,
//       division,
//     };

//     parsedMatches.push(parsedMatch);
//   });

//   // Sort the matches by matchSlot for consistency
//   return parsedMatches.sort((a, b) => a.matchSlot - b.matchSlot);
// }

// export const createBracket = functions.https.onRequest((req, res) => {
//   return corsHandler(req, res, async () => {
//     try {
//       // Check if request body exists and is properly formatted
//       let rawData: BracketData | null = null;

//       // Handle different ways the data might be sent
//       if (req.method === "POST") {
//         if (typeof req.body === "string") {
//           // If body is a string, try to parse it
//           try {
//             rawData = JSON.parse(req.body);
//           } catch (e) {
//             console.error("Error parsing JSON:", e);
//             res.status(400).json({ error: "Invalid JSON in request body." });
//             return;
//           }
//         } else if (req.body && typeof req.body === "object") {
//           // If body is already an object
//           rawData = req.body as BracketData;
//         }
//       }

//       // Check if we have valid data
//       if (!rawData || !rawData.sport) {
//         res
//           .status(400)
//           .json({ error: "Missing or invalid 'bracketData' parameter." });
//         return;
//       }

//       const sport = String(rawData.sport);

//       if (!sport) {
//         res
//           .status(400)
//           .json({ error: "Missing or invalid 'sport' parameter." });
//         return;
//       }

//       // The rest of your function...
//       const bracketRef = db.collection("brackets").doc(sport);

//       const existingDoc = await bracketRef.get();
//       if (existingDoc.exists) {
//         res
//           .status(409)
//           .json({ error: `Bracket for '${sport}' already exists.` });
//         return;
//       }

//       // Parse rawData for parsedMatch info array
//       const parsedMatches: ParsedMatch[] = parseTeamsToMatches(rawData);

//       // Create a Map for easier lookup
//       const parsedMatchMap = new Map<number, ParsedMatch>();
//       parsedMatches.forEach((match) => {
//         parsedMatchMap.set(match.matchSlot, match);
//       });

//       // Get and update the playoff counter in a transaction
//       const counterRef = db.collection("counters").doc("playoff_matches");

//       // Run this in a transaction to ensure atomicity
//       const matches = await db.runTransaction(async (transaction) => {
//         // Get current counter value
//         const counterDoc = await transaction.get(counterRef);
//         let nextPlayoffNumber = 1;

//         if (counterDoc.exists) {
//           nextPlayoffNumber = counterDoc.data()?.count || 1;
//           // Increment the counter by 15 (for our 15 matches)
//           transaction.update(counterRef, { count: nextPlayoffNumber + 15 });
//         } else {
//           // Create the counter if it doesn't exist
//           transaction.set(counterRef, { count: 16 }); // 1 + 15 matches
//         }

//         const matchToID: Record<number, string> = {};
//         for (let i = 1; i <= 15; i++) {
//           matchToID[i] = `playoff-${nextPlayoffNumber++}`;
//         }

//         // Create all 15 matches with proper IDs
//         const matches = [];

//         for (let i = 1; i <= 15; i++) {
//           const matchId = matchToID[i];
//           const round = matchRounds[i];

//           // Add to our matches array for the bracket
//           matches.push({
//             bracket_placement: i,
//             round,
//             match_id: matchId,
//           });

//           // Check if we have parsed data for this match
//           const parsedMatch = parsedMatchMap.get(i);
//           const nextMatch = nextMatchMap[i];

//           // Handle division info safely
//           let division: string = parsedMatch ? parsedMatch.division : "none";

//           // Only try to determine division from previous matches if we have a mapping for this match
//           if (division === "none" && prevMatchMap[i]) {
//             try {
//               const prevSlotMatchup = prevMatchMap[i];

//               const topDivision = parsedMatchMap.get(
//                 prevSlotMatchup.topMatchSlot
//               )?.division;
//               const bottomDivision = parsedMatchMap.get(
//                 prevSlotMatchup.bottomMatchSlot
//               )?.division;

//               if (topDivision && topDivision === bottomDivision) {
//                 division = topDivision;

//                 // Get the existing match data (if it exists)
//                 const existingMatch = parsedMatchMap.get(i);

//                 if (existingMatch) {
//                   // Create an updated match with the new division
//                   const updatedMatch: ParsedMatch = {
//                     ...existingMatch,
//                     division: division as "green" | "blue" | "final" | "none",
//                   };

//                   // Update the map with the modified match
//                   parsedMatchMap.set(i, updatedMatch);
//                 }
//               }
//             } catch (error) {
//               console.error(
//                 `Error determining division for match ${i}:`,
//                 error
//               );
//               // Keep the default division
//             }
//           }

//           let away_college = parsedMatch ? parsedMatch.away_college : "TBD";
//           let away_seed = parsedMatch ? parsedMatch.away_seed : null;

//           // if match slot is directly after a bye match we can autofill the away team and seed
//           if (i == 5 || i == 11) {
//             const byeMatch = parsedMatchMap.get(prevMatchMap[i].topMatchSlot);

//             if (byeMatch) {
//               away_college = byeMatch.home_college;
//               away_seed = byeMatch.home_seed;
//             }
//           }

//           // Create match document with appropriate defaults
//           const matchData = {
//             away_college,
//             away_seed,
//             away_college_participants: [],
//             away_college_score: 0,
//             away_volume: 0,
//             default_volume: 0,
//             draw_volume: 0,
//             forfeit: false,
//             home_college: parsedMatch ? parsedMatch.home_college : "TBD",
//             home_seed: parsedMatch ? parsedMatch.home_seed : null,
//             home_college_participants: [],
//             home_college_score: 0,
//             home_volume: 0,
//             id: matchId,
//             location: parsedMatch ? parsedMatch.location : "",
//             predictions: {},
//             sport: sport,
//             timestamp:
//               parsedMatch && parsedMatch.timestamp
//                 ? admin.firestore.Timestamp.fromDate(
//                     new Date(parsedMatch.timestamp)
//                   )
//                 : admin.firestore.Timestamp.now(),
//             type: round,
//             winner: "",
//             next_match_id: nextMatch > 0 ? matchToID[nextMatch] : "",
//             division,
//             playoff_bracket_slot: i,
//           };

//           const matchRef = db.collection("matches_testing").doc(matchId);
//           transaction.set(matchRef, matchData);
//         }

//         return matches;
//       });

//       // Create the bracket document
//       await bracketRef.set({
//         sport,
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//         matches,
//       });

//       res
//         .status(200)
//         .json({ message: `Bracket for '${sport}' created successfully.` });
//     } catch (error) {
//       console.error("Error creating bracket:", error);
//       res.status(500).send("Internal Server Error");
//     }
//   });
// });

import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

interface MatchSlotPair {
  topMatchSlot: number;
  bottomMatchSlot: number;
}

const matchRounds: Record<number, string> = {
  1: "Bye",
  2: "Playoff",
  3: "Playoff",
  4: "Playoff",
  5: "Quarterfinal",
  6: "Quarterfinal",
  7: "Bye",
  8: "Playoff",
  9: "Playoff",
  10: "Playoff",
  11: "Quarterfinal",
  12: "Quarterfinal",
  13: "Semifinal",
  14: "Semifinal",
  15: "Final",
};

// -1 for final --> nowhere else to go
const nextMatchMap: Record<number, number> = {
  1: 5,
  2: 5,
  3: 6,
  4: 6,
  5: 13,
  6: 13,
  7: 11,
  8: 11,
  9: 12,
  10: 12,
  11: 14,
  12: 14,
  13: 15,
  14: 15,
  15: -1,
};

const prevMatchMap: Record<number, MatchSlotPair> = {
  5: { topMatchSlot: 1, bottomMatchSlot: 2 },
  6: { topMatchSlot: 3, bottomMatchSlot: 4 },
  13: { topMatchSlot: 5, bottomMatchSlot: 6 },
  11: { topMatchSlot: 7, bottomMatchSlot: 8 },
  12: { topMatchSlot: 9, bottomMatchSlot: 10 },
  14: { topMatchSlot: 11, bottomMatchSlot: 12 },
  1: { topMatchSlot: 0, bottomMatchSlot: 0 },
  2: { topMatchSlot: 0, bottomMatchSlot: 0 },
  3: { topMatchSlot: 0, bottomMatchSlot: 0 },
  4: { topMatchSlot: 0, bottomMatchSlot: 0 },
  7: { topMatchSlot: 0, bottomMatchSlot: 0 },
  8: { topMatchSlot: 0, bottomMatchSlot: 0 },
  9: { topMatchSlot: 0, bottomMatchSlot: 0 },
  10: { topMatchSlot: 0, bottomMatchSlot: 0 },
  15: { topMatchSlot: 0, bottomMatchSlot: 0 },
};

interface BracketData {
  sport: string;
  matches: ParsedMatch[];
}

// interface Team {
//   college: string;
//   seed: string | number;
//   division: "green" | "blue" | "none";
//   matchSlot: string | number;
//   matchDatetime: string;
//   location: string;
// }

interface ParsedMatch {
  match_slot: number;
  away_college: string;
  away_seed: number;
  home_college: string;
  home_seed: number;
  location: string;
  timestamp: string;
  division: "green" | "blue" | "final" | "none";
}

/**
 * Parses BracketData into an array of ParsedMatch objects,
 * ensuring higher seeds are placed as home teams
 */
// function parseTeamsToMatches(bracketData: BracketData): ParsedMatch[] {
//   const { teams } = bracketData;

//   // Group teams by matchSlot
//   const matchSlotMap: Map<number, Team[]> = new Map();

//   // Convert all matchSlots to numbers and create groups
//   teams.forEach((team) => {
//     // Skip teams without a valid matchSlot
//     if (!team.matchSlot) return;

//     const matchSlotNum = Number(team.matchSlot);
//     if (isNaN(matchSlotNum)) return;

//     // Get or create the array for this matchSlot
//     const teamsForSlot = matchSlotMap.get(matchSlotNum) || [];
//     teamsForSlot.push({
//       ...team,
//       // Convert seed to number
//       seed:
//         typeof team.seed === "string" ? parseInt(team.seed) || 0 : team.seed,
//     });

//     matchSlotMap.set(matchSlotNum, teamsForSlot);
//   });

//   // Create ParsedMatch objects from the grouped teams
//   const parsedMatches: ParsedMatch[] = [];

//   matchSlotMap.forEach((teamsInSlot, matchSlot) => {
//     const matchRound = matchRounds[matchSlot];

//     // ensure playoff games have 2 teams
//     if (teamsInSlot.length !== 2 && matchRound === "Playoff") return;
//     else if (matchRound !== "Playoff") {
//       teamsInSlot.push(teamsInSlot[0]); // update formatting for other match types to be consistent
//     }

//     if (matchRound === "Playoff") {
//       // Sort teams by seed (lower seed number = higher seed)
//       teamsInSlot.sort((a, b) => {
//         const seedA =
//           typeof a.seed === "string" ? parseInt(a.seed) || 999 : a.seed;
//         const seedB =
//           typeof b.seed === "string" ? parseInt(b.seed) || 999 : b.seed;
//         return seedA - seedB;
//       });
//     }

//     // First team (index 0) is higher seeded (lower number), should be home
//     const [higherSeed, lowerSeed] = teamsInSlot;

//     // Determine if this is a final match or which division it belongs to
//     let division: "green" | "blue" | "final" | "none" = "green";

//     if (matchSlot === 15) {
//       division = "final";
//     } else if (
//       (matchRound === "Playoff" || matchRound === "Bye") &&
//       higherSeed.division === lowerSeed.division
//     ) {
//       division = higherSeed.division;
//     } else {
//       division = "none";
//     }

//     // Find the timestamp from either team (prefer the first one with a value)
//     const timestamp = higherSeed.matchDatetime || lowerSeed.matchDatetime || "";

//     // Find the location from either team (prefer the first one with a value)
//     const location = higherSeed.location || lowerSeed.location || "";

//     // Create the ParsedMatch object
//     const parsedMatch: ParsedMatch = {
//       match_slot: matchSlot,
//       home_college: higherSeed.college,
//       home_seed: Number(higherSeed.seed),
//       away_college: lowerSeed.college,
//       away_seed: Number(lowerSeed.seed),
//       location,
//       timestamp,
//       division,
//     };

//     parsedMatches.push(parsedMatch);
//   });

//   // Sort the matches by matchSlot for consistency
//   return parsedMatches.sort((a, b) => a.match_slot - b.match_slot);
// }

export const createBracket = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      // Check if request body exists and is properly formatted
      let rawData: BracketData | null = null;

      // Handle different ways the data might be sent
      if (req.method === "POST") {
        if (typeof req.body === "string") {
          // If body is a string, try to parse it
          try {
            rawData = JSON.parse(req.body);
          } catch (e) {
            console.error("Error parsing JSON:", e);
            res.status(400).json({ error: "Invalid JSON in request body." });
            return;
          }
        } else if (req.body && typeof req.body === "object") {
          // If body is already an object
          rawData = req.body as BracketData;
        }
      }

      // Check if we have valid data
      if (!rawData || !rawData.sport) {
        res
          .status(400)
          .json({ error: "Missing or invalid 'bracketData' parameter." });
        return;
      }

      const sport = String(rawData.sport);

      if (!sport) {
        res
          .status(400)
          .json({ error: "Missing or invalid 'sport' parameter." });
        return;
      }

      const currentSeasonInfo = await db
        .collection("seasons")
        .doc("current")
        .get();

      if (!currentSeasonInfo.exists) {
        res.status(500).json({ error: "Current season not found." });
        return;
      }

      const currentYear = currentSeasonInfo.data()?.year;

      const bracketRef = db
        .collection("brackets")
        .doc("seasons")
        .collection(currentYear)
        .doc(sport);

      const existingDoc = await bracketRef.get();
      if (existingDoc.exists) {
        res
          .status(409)
          .json({ error: `Bracket for '${sport}' already exists.` });
        return;
      }

      // get parsedMatches from rawData
      const parsedMatches: ParsedMatch[] = rawData.matches;

      // Create a Map for easier lookup
      const parsedMatchMap = new Map<number, ParsedMatch>();
      parsedMatches.forEach((match) => {
        parsedMatchMap.set(match.match_slot, match);
      });

      // Get and update the playoff counter in a transaction
      const counterRef = db.collection("counters").doc("playoff_matches");

      // Run this in a transaction to ensure atomicity
      const matches = await db.runTransaction(async (transaction) => {
        // Get current counter value
        const counterDoc = await transaction.get(counterRef);
        let nextPlayoffNumber = 1;

        if (counterDoc.exists) {
          nextPlayoffNumber = counterDoc.data()?.count || 1;
          // Increment the counter by 15 (for our 15 matches)
          transaction.update(counterRef, { count: nextPlayoffNumber + 15 });
        } else {
          // Create the counter if it doesn't exist
          transaction.set(counterRef, { count: 16 }); // 1 + 15 matches
        }

        const matchToID: Record<number, string> = {};
        for (let i = 1; i <= 15; i++) {
          matchToID[i] = `playoff-${nextPlayoffNumber++}`;
        }

        // Create all 15 matches with proper IDs
        const matches = [];

        for (let i = 1; i <= 15; i++) {
          const matchId = matchToID[i];
          const round = matchRounds[i];

          // Add to our matches array for the bracket
          matches.push({
            bracket_placement: i,
            round,
            match_id: matchId,
          });

          // Check if we have parsed data for this match
          const parsedMatch = parsedMatchMap.get(i);
          const nextMatch = nextMatchMap[i];

          // Handle division info safely
          let division: string = parsedMatch ? parsedMatch.division : "none";

          // Only try to determine division from previous matches if we have a mapping for this match
          if (division === "none" && prevMatchMap[i]) {
            try {
              const prevSlotMatchup = prevMatchMap[i];

              const topDivision = parsedMatchMap.get(
                prevSlotMatchup.topMatchSlot
              )?.division;
              const bottomDivision = parsedMatchMap.get(
                prevSlotMatchup.bottomMatchSlot
              )?.division;

              if (topDivision && topDivision === bottomDivision) {
                division = topDivision;

                // Get the existing match data (if it exists)
                const existingMatch = parsedMatchMap.get(i);

                if (existingMatch) {
                  // Create an updated match with the new division
                  const updatedMatch: ParsedMatch = {
                    ...existingMatch,
                    division: division as "green" | "blue" | "final" | "none",
                  };

                  // Update the map with the modified match
                  parsedMatchMap.set(i, updatedMatch);
                }
              }
            } catch (error) {
              console.error(
                `Error determining division for match ${i}:`,
                error
              );
              // Keep the default division
            }
          }

          let away_college = parsedMatch ? parsedMatch.away_college : "TBD";
          let away_seed = parsedMatch ? parsedMatch.away_seed : null;

          // if match slot is directly after a bye match we can autofill the away team and seed
          if (i == 5 || i == 11) {
            const byeMatch = parsedMatchMap.get(prevMatchMap[i].topMatchSlot);

            if (byeMatch) {
              away_college = byeMatch.home_college;
              away_seed = byeMatch.home_seed;
            }
          }

          // Create match document with appropriate defaults
          const matchData = {
            away_college,
            away_seed,
            away_college_participants: [],
            away_college_score: 0,
            away_volume: 0,
            default_volume: 0,
            draw_volume: 0,
            forfeit: false,
            home_college: parsedMatch ? parsedMatch.home_college : "TBD",
            home_seed: parsedMatch ? parsedMatch.home_seed : null,
            home_college_participants: [],
            home_college_score: 0,
            home_volume: 0,
            id: matchId,
            location: parsedMatch ? parsedMatch.location : "",
            predictions: {},
            sport: sport,
            timestamp:
              parsedMatch && parsedMatch.timestamp
                ? admin.firestore.Timestamp.fromDate(
                    new Date(parsedMatch.timestamp)
                  )
                : admin.firestore.Timestamp.now(),
            type: round,
            winner: "",
            next_match_id: nextMatch > 0 ? matchToID[nextMatch] : "",
            division,
            playoff_bracket_slot: i,
          };

          const matchRef = db.collection("matches_testing").doc(matchId);
          transaction.set(matchRef, matchData);
        }

        return matches;
      });

      // Create the bracket document
      await bracketRef.set({
        sport,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        matches,
      });

      res
        .status(200)
        .json({ message: `Bracket for '${sport}' created successfully.` });
    } catch (error) {
      console.error("Error creating bracket:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});
