/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

export const getLeaderboard = functions.https.onRequest(async (req, res) => {
  try {
    // Fetch leaderboard data from the "colleges" collection in Firestore
    const snapshot = await db.collection('colleges').orderBy('points', 'desc').get();
    const colleges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(colleges);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Error fetching leaderboard' });
  }
});

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
