import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { isValidDecodedToken, tokenHasRole } from "./helpers.js";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getPointsForWinBySportName } from "./scoreMatch.js";
import { normalizePlacementPoints } from "./tournament_helpers.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const deleteTournament = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
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
      const { tournamentId, force } = req.body;

      if (!tournamentId || typeof tournamentId !== "string") {
        return res
          .status(400)
          .json({ error: "Invalid 'tournamentId' parameter in request body." });
      }

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

      const tournamentDoc = await tournamentRef.get();
      if (!tournamentDoc.exists) {
        return res
          .status(404)
          .json({ error: `Tournament '${tournamentId}' not found.` });
      }

      const tournamentData = tournamentDoc.data() || {};
      const bracketMatches: { match_id: number; round: string }[] =
        tournamentData.matches || [];
      const sport = tournamentData.sport;

      const matchesCollection = db
        .collection("matches")
        .doc("seasons")
        .collection(currentYear);

      const matchSnapshots = await Promise.all(
        bracketMatches.map((entry) =>
          matchesCollection.doc(`${entry.match_id}`).get()
        )
      );

      // Deleting a tournament mid-run would strand the win points its scored
      // matches already handed out, so those have to be undone first.
      const scoredMatchIds = matchSnapshots
        .filter((snap) => snap.exists && snap.data()?.winner && snap.data()?.type !== "Bye")
        .map((snap) => snap.id);

      if (scoredMatchIds.length > 0 && force !== true) {
        return res.status(409).json({
          error:
            `Tournament has ${scoredMatchIds.length} scored match(es). ` +
            "Undo those scores first, or resend with force to delete anyway.",
          scoredMatchIds,
        });
      }

      const batch = db.batch();
      for (const entry of bracketMatches) {
        batch.delete(matchesCollection.doc(`${entry.match_id}`));
      }

      // Byes were credited as wins at creation time, so give those points back.
      const pointsForWin = await getPointsForWinBySportName(sport);
      const collegesRef = db
        .collection("colleges")
        .doc("seasons")
        .collection(currentYear);

      for (const snap of matchSnapshots) {
        const data = snap.data();
        if (!snap.exists || !data || data.type !== "Bye" || !data.winner) continue;
        batch.update(collegesRef.doc(data.winner), {
          games: admin.firestore.FieldValue.increment(-1),
          wins: admin.firestore.FieldValue.increment(-1),
          points: admin.firestore.FieldValue.increment(-pointsForWin),
        });
      }

      // Same for any placement bonuses already awarded.
      const placementPoints = normalizePlacementPoints(
        tournamentData.placement_points
      );
      const placements = tournamentData.placements || {};
      const placementEntries: [string, number][] = [
        [placements.first, placementPoints.first],
        [placements.second, placementPoints.second],
        [placements.third, placementPoints.third],
      ];

      for (const [college, points] of placementEntries) {
        if (!college) continue;
        batch.update(collegesRef.doc(college), {
          points: admin.firestore.FieldValue.increment(-points),
        });
      }

      batch.delete(tournamentRef);

      await batch.commit();

      return res.status(200).json({
        message: `Successfully deleted tournament '${tournamentId}' and ${bracketMatches.length} associated matches.`,
      });
    } catch (error) {
      console.error("Error deleting tournament:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
