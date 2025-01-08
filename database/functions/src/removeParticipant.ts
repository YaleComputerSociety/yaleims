import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const removeParticipant = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      // Extract fields from the request body
      const { matchId, participantType, user, selectedMatch } = req.body;

      // Check if all required parameters are provided
      if (
        !matchId ||
        !participantType ||
        !user ||
        !user.email ||
        !selectedMatch
      ) {
        console.error("Missing required parameters:", {
          matchId,
          participantType,
          user,
          selectedMatch,
        });
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }

      // Query Firestore to find the match document by its ID
      const matchDoc = await admin
        .firestore()
        .collection("matches")
        .doc(matchId)
        .get();

      if (!matchDoc.exists) {
        console.error("Match not found for matchId:", matchId);
        res.status(404).json({ error: "Match not found" });
        return;
      }

      // Retrieve match data
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
        (participant: { email: string }) => participant.email === user.email
      );

      if (participantIndex === -1) {
        console.warn(`${user.email} is not a participant`);
        res
          .status(400)
          .json({ error: `${user.email} is not a participant in this match` });
        return;
      }

      // Remove the participant and update Firestore
      participantsArray.splice(participantIndex, 1);

      await matchDoc.ref.update({
        [participantType]: participantsArray,
      });

      // Update the user's "matches" array in the "users" collection
      const userDocRef = db.collection("users").doc(user.email);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        console.error(`User document not found for email: ${user.email}`);
        res.status(404).json({ error: "User not found" });
        return;
      }

      const userData = userDoc.data();
      const userMatches = userData?.matches || [];
      const userMatchesPlayed = userData?.matches_played;

      // Remove the match from the user's matches array
      const matchIndex = userMatches.findIndex(
        (match: any) => match.matchId === matchId
      );

      if (matchIndex !== -1) {
        userMatches.splice(matchIndex, 1);

        await userDocRef.update({
          matches: userMatches,
          matches_played: userMatchesPlayed - 1,
        });
      }

      res.status(200).json({
        message: `Successfully unregistered and updated your matches!`,
      });
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
