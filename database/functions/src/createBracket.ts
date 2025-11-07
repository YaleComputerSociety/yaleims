import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import { isValidDecodedToken } from "./helpers.js";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
// ✅ ADDED: import getPointsForWinBySportName
import { getPointsForWinBySportName } from "./scoreMatch.js";

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

interface ParsedMatch {
  match_slot: number;
  away_college: string;
  away_seed: number;
  home_college: string;
  home_seed: number;
  location: string;
  location_extra?: string;
  timestamp: string;
  division: "green" | "blue" | "final" | "none";
}

const canCreateBracket = (role: string) => {
  return role === "admin" || role === "dev";
};

export const createBracket = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: "projects/yims-125a2/secrets/JWT_SECRET/versions/1",
    });
    if (!version.payload || !version.payload.data) {
      console.error("JWT secret payload is missing");
      return res.status(500).send("Internal Server Error");
    }
    const JWT_SECRET = version.payload.data.toString();

    const idToken = authHeader.split("Bearer ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(idToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (!isValidDecodedToken(decoded) || !canCreateBracket(decoded.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      let rawData = null;
      if (req.method === "POST") {
        if (typeof req.body === "string") {
          try {
            rawData = JSON.parse(req.body);
          } catch (e) {
            console.error("Error parsing JSON:", e);
            return res
              .status(400)
              .json({ error: "Invalid JSON in request body." });
          }
        } else if (req.body && typeof req.body === "object") {
          rawData = req.body;
        }
      }

      const bracketData = rawData.bracketData as BracketData;
      if (!bracketData || !bracketData.sport || !bracketData.matches) {
        return res
          .status(400)
          .json({ error: "Missing or invalid 'bracketData' parameter." });
      }

      const sport = String(bracketData.sport);
      if (!sport) {
        return res
          .status(400)
          .json({ error: "Missing or invalid 'sport' parameter." });
      }

      const currentSeasonInfo = await db.collection("seasons").doc("current").get();
      if (!currentSeasonInfo.exists) {
        return res.status(500).json({ error: "Current season not found." });
      }

      const currentYear = currentSeasonInfo.data()?.year;

      const bracketRef = db
        .collection("brackets")
        .doc("seasons")
        .collection(currentYear)
        .doc(sport);

      const existingDoc = await bracketRef.get();
      if (existingDoc.exists) {
        return res
          .status(409)
          .json({ error: `Bracket for '${sport}' already exists.` });
      }

      const parsedMatches: ParsedMatch[] = bracketData.matches;
      const parsedMatchMap = new Map<number, ParsedMatch>();
      parsedMatches.forEach((match) => parsedMatchMap.set(match.match_slot, match));

      const counterRef = db.collection("counters").doc("matches");

      const matches = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextPlayoffNumber = 1;

        if (counterDoc.exists) {
          nextPlayoffNumber = counterDoc.data()?.count || 1;
          transaction.update(counterRef, { count: nextPlayoffNumber + 15 });
        } else {
          transaction.set(counterRef, { count: 16 });
        }

        const matchToID: Record<number, string> = {};
        for (let i = 1; i <= 15; i++) {
          matchToID[i] = `${nextPlayoffNumber++}`;
        }

        const matches = [];
        for (let i = 1; i <= 15; i++) {
          const matchId = matchToID[i];
          const round = matchRounds[i];
          const parsedMatch = parsedMatchMap.get(i);
          matches.push({ 
            bracket_placement: i, 
            round, 
            match_id: parseInt(matchId), 
            timestamp: parsedMatch && parsedMatch.timestamp
              ? admin.firestore.Timestamp.fromDate(new Date(parsedMatch.timestamp))
              : admin.firestore.Timestamp.now()
            });

          
          const nextMatch = nextMatchMap[i];
          let division: string = parsedMatch ? parsedMatch.division : "none";

          if (division === "none" && prevMatchMap[i]) {
            try {
              const prevSlotMatchup = prevMatchMap[i];
              const topDivision = parsedMatchMap.get(prevSlotMatchup.topMatchSlot)?.division;
              const bottomDivision = parsedMatchMap.get(prevSlotMatchup.bottomMatchSlot)?.division;
              if (topDivision && topDivision === bottomDivision) {
                division = topDivision;
                const existingMatch = parsedMatchMap.get(i);
                if (existingMatch) {
                  const updatedMatch: ParsedMatch = {
                    ...existingMatch,
                    division: division as "green" | "blue" | "final" | "none",
                  };
                  parsedMatchMap.set(i, updatedMatch);
                }
              }
            } catch (error) {
              console.error(`Error determining division for match ${i}:`, error);
            }
          }

          let away_college = parsedMatch ? parsedMatch.away_college : "TBD";
          let away_seed = parsedMatch ? parsedMatch.away_seed : null;

          if (i == 5 || i == 11) {
            const byeMatch = parsedMatchMap.get(prevMatchMap[i].topMatchSlot);
            if (byeMatch) {
              away_college = byeMatch.home_college;
              away_seed = byeMatch.home_seed;
            }
          }

          const matchData = {
            away_college,
            away_seed,
            away_college_participants: [],
            away_college_score: null,
            away_volume: 0,
            default_volume: 0,
            draw_volume: 0,
            forfeit: false,
            home_college: parsedMatch ? parsedMatch.home_college : "TBD",
            home_seed: parsedMatch ? parsedMatch.home_seed : null,
            home_college_participants: [],
            home_college_score: null,
            home_volume: 0,
            id: parseInt(matchId),
            location: parsedMatch ? parsedMatch.location : "",
            location_extra: parsedMatch?.location_extra ? parsedMatch.location_extra : "",
            predictions: {},
            sport: sport,
            timestamp:
              parsedMatch && parsedMatch.timestamp
                ? admin.firestore.Timestamp.fromDate(new Date(parsedMatch.timestamp))
                : admin.firestore.Timestamp.now(),
            type: round,
            winner: round === "Bye" && parsedMatch ? parsedMatch.home_college : null,
            next_match_id: nextMatch > 0 ? parseInt(matchToID[nextMatch]) : "",
            division,
            playoff_bracket_slot: i,
          };

          const matchRef = db
            .collection("matches")
            .doc("seasons")
            .collection(currentYear)
            .doc(matchId);
          transaction.set(matchRef, matchData);
        }

        // ✅ ADDED: update points for BYE round winners
        const pointsForWin = await getPointsForWinBySportName(sport);
        const collegesRef = db.collection("colleges").doc("seasons").collection(currentYear);

        for (const match of parsedMatches) {
          if (matchRounds[match.match_slot] === "Bye") {
            const winningTeam = match.home_college;
            const collegeRef = collegesRef.doc(winningTeam);
            transaction.update(collegeRef, {
              games: admin.firestore.FieldValue.increment(1),
              wins: admin.firestore.FieldValue.increment(1),
              points: admin.firestore.FieldValue.increment(pointsForWin),
            });
          }
        }

        return matches;
      });

      // ✅ ADDED: recalc ranks after bye updates
      const collegesSnapshot = await db
        .collection("colleges")
        .doc("seasons")
        .collection(currentYear)
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
        if (b.points !== a.points) return b.points - a.points;
        return b.wins - a.wins;
      });

      const rankBatch = db.batch();
      const dateToday = new Date();
      const formattedDate = `${dateToday.getDate()}-${dateToday.getMonth() + 1}-${dateToday.getFullYear()}`;

      for (const [index, college] of colleges.entries()) {
        const docRef = db
          .collection("colleges")
          .doc("seasons")
          .collection(currentYear)
          .doc(college.id);

        const docSnap = await docRef.get();
        const isDateDifferent = formattedDate !== docSnap.data()?.today;

        if (isDateDifferent) {
          rankBatch.update(docRef, {
            today: formattedDate,
            prevRank: docSnap.data()?.rank,
            rank: index + 1,
          });
        } else {
          rankBatch.update(docRef, { rank: index + 1 });
        }
      }

      await rankBatch.commit();

      // existing final bracket write
      await bracketRef.set({
        sport,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        matches,
      });

      res.status(200).json({ message: `Bracket for '${sport}' created successfully.` });
    } catch (error) {
      console.error("Error creating bracket:", error);
      return res.status(500).send("Internal Server Error");
    }
    return;
  });
});
