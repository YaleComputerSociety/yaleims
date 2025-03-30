import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

import bcrypt from 'bcrypt';
import crypto from 'crypto';

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const publicApiSignup = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            if (req.method != "POST") {
                return res.status(405).send("Method not allowed");
            }
            const authHeader = req.headers.authorization || "";
            if (!authHeader.startsWith("Bearer ")) {
                return res.status(401).json({error: "No token provided"});
            }
            const idToken = authHeader.split("Bearer ")[1];
            
            let decoded;
            try {
                decoded = await admin.auth().verifyIdToken(idToken);
                if (!decoded) {
                return res.status(401).json({error: "Invalid Token"});
                }
            } catch (error) {
                return res.status(401).json({error: "Invalid Token"});
            } 

            const apiKey = crypto.randomBytes(32).toString('hex');
            const saltRounds = 12; 
            const hashedApiKey = await bcrypt.hash(apiKey, saltRounds);

        } catch (error) {
            console.error("Error Signing up for public APIs");
            res.status(500).send("Internal Server Error");
        }
    })
})

export const currentLeaderboardPublic = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const leaderboardRef = db.collection("colleges");
      const snapshot = await leaderboardRef
        .orderBy("points", "desc")
        .orderBy("wins", "desc")
        .get();

      if (snapshot.empty) {
        res.status(404).send("No colleges found.");
        return;
      }

      const leaderboard = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.get('name'),
        games: doc.get('games'),
        wins: doc.get('wins'),
        rank: doc.get('rank'),
        forfeits: doc.get('forfeits'),
        losses: doc.get('losses'),
        ties: doc.get('ties'),
        points: doc.get('points'),
      }));

      res.status(200).json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});
