import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import { isValidDecodedToken, tokenHasRole } from "./helpers.js";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getPointsForWinBySportName } from "./scoreMatch.js";
import {
  TOURNAMENT_SLOT_COUNT,
  THIRD_PLACE_SLOT,
  tournamentRounds,
  tournamentNextMatchMap,
  tournamentLoserMatchMap,
  tournamentPrevMatchMap,
  normalizePlacementPoints,
} from "./tournament_helpers.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

interface ParsedMatch {
  match_slot: number;
  away_college: string;
  away_seed: number;
  home_college: string;
  home_seed: number;
  location: string;
  location_extra?: string;
  timestamp: string;
}

interface TournamentData {
  name: string;
  sport: string;
  matches: ParsedMatch[];
  placement_points?: { first: number; second: number; third: number };
}

/** Firestore document ids cannot contain slashes, so names are slugified. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const createTournament = functions.https.onRequest((req, res) => {
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
    if (!isValidDecodedToken(decoded) || !tokenHasRole(decoded, ["admin", "dev"])) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      let rawData: any = null;
      if (typeof req.body === "string") {
        try {
          rawData = JSON.parse(req.body);
        } catch (e) {
          console.error("Error parsing JSON:", e);
          return res.status(400).json({ error: "Invalid JSON in request body." });
        }
      } else if (req.body && typeof req.body === "object") {
        rawData = req.body;
      }

      const tournamentData = rawData?.tournamentData as TournamentData;
      if (
        !tournamentData ||
        !tournamentData.sport ||
        !tournamentData.name ||
        !Array.isArray(tournamentData.matches)
      ) {
        return res
          .status(400)
          .json({ error: "Missing or invalid 'tournamentData' parameter." });
      }

      const sport = String(tournamentData.sport);
      const name = String(tournamentData.name).trim();
      const tournamentId = slugify(name);
      if (!tournamentId) {
        return res
          .status(400)
          .json({ error: "Tournament name must contain letters or numbers." });
      }

      const placementPoints = normalizePlacementPoints(
        tournamentData.placement_points
      );

      const currentSeasonInfo = await db
        .collection("seasons")
        .doc("current")
        .get();
      if (!currentSeasonInfo.exists) {
        return res.status(500).json({ error: "Current season not found." });
      }
      const currentYear = currentSeasonInfo.data()?.year;

      const tournamentRef = db
        .collection("tournaments")
        .doc("seasons")
        .collection(currentYear)
        .doc(tournamentId);

      const existingDoc = await tournamentRef.get();
      if (existingDoc.exists) {
        return res
          .status(409)
          .json({ error: `Tournament '${name}' already exists this season.` });
      }

      const parsedMatchMap = new Map<number, ParsedMatch>();
      tournamentData.matches.forEach((match) =>
        parsedMatchMap.set(match.match_slot, match)
      );

      const counterRef = db.collection("counters").doc("matches");

      const matches = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextMatchNumber = 1;

        if (counterDoc.exists) {
          nextMatchNumber = counterDoc.data()?.count || 1;
          transaction.update(counterRef, {
            count: nextMatchNumber + TOURNAMENT_SLOT_COUNT,
          });
        } else {
          transaction.set(counterRef, { count: TOURNAMENT_SLOT_COUNT + 1 });
        }

        const slotToID: Record<number, string> = {};
        for (let i = 1; i <= TOURNAMENT_SLOT_COUNT; i++) {
          slotToID[i] = `${nextMatchNumber++}`;
        }

        const bracketMatches = [];
        for (let i = 1; i <= TOURNAMENT_SLOT_COUNT; i++) {
          const matchId = slotToID[i];
          const round = tournamentRounds[i];
          const parsedMatch = parsedMatchMap.get(i);

          const timestamp =
            parsedMatch && parsedMatch.timestamp
              ? admin.firestore.Timestamp.fromDate(new Date(parsedMatch.timestamp))
              : admin.firestore.Timestamp.now();

          bracketMatches.push({
            bracket_placement: i,
            round,
            match_id: parseInt(matchId),
            timestamp,
          });

          const nextMatch = tournamentNextMatchMap[i];
          const loserMatch = tournamentLoserMatchMap[i];

          let away_college = parsedMatch ? parsedMatch.away_college : "TBD";
          let away_seed = parsedMatch ? parsedMatch.away_seed : null;

          // Slots 5 and 11 face the bye teams from slots 1 and 7, so the bye
          // team is copied forward at creation time rather than on scoring.
          if (i === 5 || i === 11) {
            const byeMatch = parsedMatchMap.get(
              tournamentPrevMatchMap[i].topMatchSlot
            );
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
            location_extra: parsedMatch?.location_extra
              ? parsedMatch.location_extra
              : "",
            predictions: {},
            sport,
            timestamp,
            type: round,
            winner:
              round === "Bye" && parsedMatch ? parsedMatch.home_college : null,
            next_match_id: nextMatch > 0 ? parseInt(slotToID[nextMatch]) : "",
            next_match_loser_id: loserMatch ? parseInt(slotToID[loserMatch]) : "",
            division: "none",
            playoff_bracket_slot: i,
            tournament_id: tournamentId,
            tournament_name: name,
          };

          const matchRef = db
            .collection("matches")
            .doc("seasons")
            .collection(currentYear)
            .doc(matchId);
          transaction.set(matchRef, matchData);
        }

        // Byes count as a played win, matching how playoff brackets treat them.
        const pointsForWin = await getPointsForWinBySportName(sport);
        const collegesRef = db
          .collection("colleges")
          .doc("seasons")
          .collection(currentYear);

        for (const match of tournamentData.matches) {
          if (tournamentRounds[match.match_slot] === "Bye" && match.home_college) {
            transaction.update(collegesRef.doc(match.home_college), {
              games: admin.firestore.FieldValue.increment(1),
              wins: admin.firestore.FieldValue.increment(1),
              points: admin.firestore.FieldValue.increment(pointsForWin),
            });
          }
        }

        return bracketMatches;
      });

      await tournamentRef.set({
        id: tournamentId,
        name,
        sport,
        season: currentYear,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        placement_points: placementPoints,
        third_place_slot: THIRD_PLACE_SLOT,
        placements: { first: null, second: null, third: null },
        matches,
      });

      await recalculateRanks(currentYear);

      return res.status(200).json({
        message: `Tournament '${name}' created successfully.`,
        tournamentId,
      });
    } catch (error) {
      console.error("Error creating tournament:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});

/**
 * Bye wins move colleges up the table immediately, so ranks are rebuilt right
 * after creation the same way scoring a match does.
 */
const recalculateRanks = async (year: string) => {
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
    if (b.points !== a.points) return b.points - a.points;
    return b.wins - a.wins;
  });

  const rankBatch = db.batch();
  const dateToday = new Date();
  const formattedDate = `${dateToday.getDate()}-${
    dateToday.getMonth() + 1
  }-${dateToday.getFullYear()}`;

  for (const [index, college] of colleges.entries()) {
    const docRef = db
      .collection("colleges")
      .doc("seasons")
      .collection(year)
      .doc(college.id);
    const docSnap = await docRef.get();

    if (formattedDate !== docSnap.data()?.today) {
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
};
