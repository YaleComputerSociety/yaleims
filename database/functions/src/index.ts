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

import { Query } from 'firebase-admin/firestore';
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import cors from 'cors';
import fetch from "node-fetch"; 


// Initialize Firebase Admin
admin.initializeApp();

const corsHandler = cors({origin: true});

const db = admin.firestore();


interface College {
    id: string,
    name: string,
    points: number;
}

export const fetchOrAddUser = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const { email } = req.body;  // The email passed directly in the request

    // Step 1: Check that the email is a Yale email
    if (!email || !email.endsWith('@yale.edu')) {
      res.status(403).json({ error: 'You must use a Yale email to sign in.' });
      return;
    }

    try {
      // Step 2: Reference Firestore Document (Use Email as Document ID)
      const userRef = admin.firestore().collection('users').doc(email);
      const userDoc = await userRef.get();

      // Step 3: If User Exists, Return Data
      if (userDoc.exists) {
        res.status(200).json({ message: 'User already exists.', user: userDoc.data() });
        return;
      }

      // Step 4: Fetch User Details from Yalies API
      const yaliesResponse = await fetch('https://yalies.io/api/people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MjUzNzcxNTIsInN1YiI6ImF3eDIifQ.sKmMqhsyh71EIqfLPMqIx50py3nhhzo6kkq7OKPiHM8",
        },
        body: JSON.stringify({
          filters: { email: [email] },
          page: 1,
          page_size: 1,
        }),
      });

      if (!yaliesResponse.ok) {
        res.status(500).json({ error: 'Failed to fetch data from the Yalies API.' });
        return;
      }

      const yaliesData: any = await yaliesResponse.json();
      if (yaliesData.length === 0) {
        res.status(404).json({ error: `No data found for email: ${email}` });
        return;
      }

      const yaliesInfo: any = yaliesData[0];
      const { first_name, last_name, college } = yaliesInfo;

      const newUser = {
        email: email,
        firstname: first_name,
        lastname: last_name,
        matches: [],
        points: 0,
        college: college || null,
      };

      await userRef.set(newUser);
      res.status(200).json({ message: 'User successfully added.', user: newUser });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
});


export const getLeaderboard = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const leaderboardRef = db.collection('colleges');
      const snapshot = await leaderboardRef.orderBy('points', 'desc').get();

      if (snapshot.empty) {
        res.status(404).send('No colleges found');
        return;
      }

      const leaderboard: College[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        leaderboard.push({ id: doc.id, name: data.name, points: data.points } as College);
      });
      //console.log('Leaderboard data:', JSON.stringify(leaderboard, null, 2));
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard from Function Code:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});


export const getMatches = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { type, sortOrder = 'desc' } = req.query; // Retrieve the 'type' and 'sortOrder' query parameters
      const currentDate = new Date();
      let query: Query = db.collection('matches'); // Explicitly use Query type

      // Apply filtering based on the 'type' query parameter (all, past, or future)
      if (type === 'past') {
        query = query.where('timestamp', '<', currentDate); // Get past matches
      } else if (type === 'future') {
        query = query.where('timestamp', '>', currentDate); // Get future matches
      }

      query = query.orderBy('timestamp', sortOrder as 'asc' | 'desc');

      // Fetch the matches from Firestore
      const snapshot = await query.get();

      if (snapshot.empty) {
        return res.status(404).send('No matches found');
      }

      // Process the query result and format the data
      const matches = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          home_college: data.home_college,
          away_college: data.away_college,
          sport: data.sport,
          home_college_score: data.home_college_score,
          away_college_score: data.away_college_score,
          winner: data.winner,
          timestamp: data.timestamp && data.timestamp.toDate 
            ? data.timestamp.toDate().toISOString()
            : null, // Fallback if timestamp is missing or invalid
        };       
      });

      // Return the matches as a JSON response
      return res.status(200).json(matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      return res.status(500).send('Internal Server Error');
    }
  });
});
