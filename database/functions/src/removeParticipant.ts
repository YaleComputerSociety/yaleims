import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";

import jwt from "jsonwebtoken"

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const removeParticipant = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const authHeader = req.headers.authorization || ""
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({error: "No token provided"});
      }
      const token = authHeader.split("Bearer ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (!isValidDecodedToken(decoded)) {
        console.error("Invalid token structure");
        return res.status(401).json({error: "Invalid Token Structure"})
      }
      const email = decoded.email;
      const { matchId, participantType, seasonId } = req.body;

      if (!matchId || !participantType || !seasonId ) {
        console.error("Missing required parameters:", {
          matchId,
          participantType,
          seasonId
        });
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }

      // Query Firestore to find the match document by its ID
      const matchRef = db
        .collection("matches")
        .doc("seasons")
        .collection(seasonId as string)
        .doc(matchId as string)

      const matchDoc = await matchRef.get()

      if (!matchDoc.exists) {
        console.error("Match not found for matchId:", matchId);
        res.status(404).json({ error: "Match not found" });
        return;
      }

      const matchData = matchDoc.data();

      if (
        !matchData ||
        !matchData.home_college_participants ||
        !matchData.away_college_participants
      ) {
        res
          .status(400)
          .json({ error: "Invalid match data, missing participant fields" });
        return;
      }

      // Determine the appropriate participants array
      const participantsArray =
        participantType === "home_college_participants"
          ? matchData.home_college_participants
          : matchData.away_college_participants;

      // Find the participant by email
      const participantIndex = participantsArray.findIndex(
        (participant: { email: string }) => participant.email === email
      );

      if (participantIndex === -1) {
        console.warn(`${email} is not a participant`);
        res.status(400).json({ error: `${email} is not a participant in this match` });
        return;
      }

      participantsArray.splice(participantIndex, 1);

      await matchDoc.ref.update({
        [participantType]: participantsArray,
      });

      // Update the user's "matches" array in the "users" collection
      const userDocRef = db.collection("users").doc(email).collection("seasons").doc(seasonId);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        console.error(`User document not found for email: ${email}`);
        res.status(404).json({ error: "User not found" });
        return;
      }

      const userData = userDoc.data();
      const userMatches = userData?.matches || [];
      // Remove the match from the user's matches array
      const matchIndex = userMatches.findIndex(
        (match: any) => Number(match.id) === Number(matchId)
      );

      if (matchIndex !== -1) {
        userMatches.splice(matchIndex, 1);

        await userDocRef.update({
          matches: userMatches,
        });
      }

      return res.status(200).json({
        message: `Successfully unregistered and updated your matches!`,
      });
    } catch (error) {
      console.error("Error processing request:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
