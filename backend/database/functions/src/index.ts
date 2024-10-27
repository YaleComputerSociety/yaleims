/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import {onRequest} from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

interface College {
    id: string,
    name: string,
    points: number;
}

interface Match {
    id: string;
    college1: string;
    college2: string;
    sport: string;
    date: string;
    time: string;
    winner: string;
  }


// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const getLeaderboard = functions.https.onRequest(async (req, res) => {
    try {
        const db = admin.firestore();
        const leaderboardRef = db.collection('colleges');
        const snapshot = await leaderboardRef.orderBy('points', 'desc').get();

        if (snapshot.empty) {
            res.status(404).send('No colleges found');
            return;
        }

        const leaderboard: College[] = [];
        snapshot.forEach(doc => {\
            const data = doc.data();
            leaderboard.push({ id: doc.id, name: data.name, points: data.points } as College);
        });

        res.status(200).json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).send('Internal Server Error');
    }
});

export const getScores = functions.https.onRequest(async (req, res): Promise<void> => {
    try {
      const db = admin.firestore();
      const matchesRef = db.collection('Matches');
      const snapshot = await matchesRef.get();
  
      if (snapshot.empty) {
        res.status(404).send('No matches found');
        return;
      }
  
      const matches: Match[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        matches.push({
          id: doc.id,
          college1: data.college1,
          college2: data.college2,
          sport: data.sport,
          date: data.date,
          time: data.time,
          winner: data.winner
        } as Match);
      });
  
      res.status(200).json(matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  export const getSchedule = functions.https.onRequest(async (req, res): Promise<void> => {
    try {
      const db = admin.firestore();
      const matchesRef = db.collection('Matches');
      const snapshot = await matchesRef.get();
  
      if (snapshot.empty) {
        res.status(404).send('No matches found');
        return;
      }
  
      const matches: Match[] = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
  
        // Fetch referenced documents
        const college1Doc = await data.college1.get();
        const college2Doc = await data.college2.get();
        const winnerDoc = data.winner ? await data.winner.get() : null;
  
        matches.push({
          id: doc.id,
          college1: college1Doc.data().name,
          college2: college2Doc.data().name,
          sport: data.sport,
          date: data.date,
          time: data.time,
          location: data.location,
          winner: winnerDoc ? winnerDoc.data().name : null,
          college1_participants: data.college1_participants,
          college2_participants: data.college2_participants
        } as Match);
      }
  
      res.status(200).json(matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      res.status(500).send('Internal Server Error');
    }
  });
