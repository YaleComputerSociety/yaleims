import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { isValidDecodedToken } from "./helpers.js";
import jwt from "jsonwebtoken"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const addParticipant = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(400).json({error: "Method not Allowed"})
      }
      const authHeader = req.headers.authorization || ""
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({error: "No token provided"});
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
      const token = authHeader.split("Bearer ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
  
      if (!isValidDecodedToken(decoded)) {
        console.error("Invalid token structure");
        return res.status(401).json({error: "Invalid Token Structure"})
      }
      const email = decoded.email;
      const name = decoded.name

      const { matchId, participantType, seasonId, matchTimestamp } = req.body;

      if (!matchId || !participantType || !matchTimestamp) {
        console.error("Missing required parameters:", {matchId, participantType, seasonId, matchTimestamp});
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }

      const matchDoc = await db
        .collection("matches")
        .doc("seasons")
        .collection(seasonId as string)
        .doc(matchId.toString())
        .get();

      if (!matchDoc.exists) {
        console.error("Match not found for matchId:", matchId);
        res.status(404).json({ error: "Match not found" });
        return;
      }

      // Retrieve match data
      const matchData = matchDoc.data();

      if (!matchData || !matchData.home_college_participants || !matchData.away_college_participants ) {
        return res.status(400).json({ error: "Invalid match data, missing participant fields" });
      }

      // Determine the appropriate participants array
      const participantsArray =
        participantType === "home_college_participants"
          ? matchData.home_college_participants
          : matchData.away_college_participants;

      // Read the user's season doc before touching the match, so a missing season
      // doc can't leave the participant on the roster with nothing on their side.
      const userDocRef = db.collection("users").doc(email).collection("seasons").doc(seasonId as string);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        console.error(`User document not found for email: ${email} in season ${seasonId}`);
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Check for duplicate participant by email
      const isDuplicate = participantsArray.some(
        (participant: { email: string }) => {
          return participant.email === email;
        }
      );

      const userData = userDoc.data();
      const userMatches = userData?.matches || [];
      const isMatchDuplicate = userMatches.some(
        (match: any) => Number(match?.id) === Number(matchId)
      );

      if (isDuplicate && isMatchDuplicate) {
        console.warn(`${email} is already a participant`);
        return res.status(400).json({ error: `${email} is already a participant` });
      }

      // Either side may already be recorded (e.g. a half-applied earlier attempt),
      // so write only what is missing and let a retry repair the other side.
      if (!isDuplicate) {
        participantsArray.push({email, name});
        await matchDoc.ref.update({
          [participantType]: participantsArray,
        });
      }

      if (!isMatchDuplicate) {
        userMatches.push({ id: Number(matchId), timestamp: matchTimestamp});
        await userDocRef.update({ matches: userMatches });
      }

      return res.status(200).json({message: `Successfully signed up and updated your matches!`});
    } catch (error) {
      console.error("Error processing request:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
