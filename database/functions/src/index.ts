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

interface Match {
    id: string;
    college1: string;
    college2: string;
    sport: string;
    date: string;
    time: string;
    winner: string;
}

interface User {
    email: string;
    firstname: string;
    lastname: string;
    matches: string[];
    points: number;
    college: string;
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

export const getMatches = functions.https.onRequest(async (req, res): Promise<void> => {
  return corsHandler(req, res, async () => {
    try {
      const matchesRef = db.collection('matches');
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
        const sportDoc = await data.sport.get();

        matches.push({
          id: doc.id,
          college1: college1Doc.data().name,
          college2: college2Doc.data().name,
          sport: sportDoc.data().name,
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
  })
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

export const getScores = functions.https.onRequest(async (req, res): Promise<void> => {
  return corsHandler(req, res, async () => {
    try {
      const matchesRef = db.collection('matches');
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
        const sportDoc = await data.sport.get();
        
        matches.push({
          id: doc.id,
          college1: college1Doc.data().name,
          college2: college2Doc.data().name,
          sport: sportDoc.data().name,
          date: data.date,
          time: data.time,
          winner: data.winner
        } as Match);
      };
  
      res.status(200).json(matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      res.status(500).send('Internal Server Error');
    }
  })
});

export const getSchedule = functions.https.onRequest(async (req, res): Promise<void> => {
  return corsHandler(req, res, async () => {
    try {
      const matchesRef = db.collection('matches');
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
        const sportDoc = await data.sport.get();
        const winnerDoc = data.winner ? await data.winner.get() : null;
  
        matches.push({
          id: doc.id,
          college1: college1Doc.data().name,
          college2: college2Doc.data().name,
          sport: sportDoc.data().name,
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
  })
});

export const getUser = functions.https.onRequest(async (req, res): Promise<void> => {
  return corsHandler(req, res, async () => {
    try {
      const email = req.query.email as string;

      if (!email) {
        res.status(400).send('Missing email parameter');
        return;
      }

      const usersRef = db.collection('users').where('email', '==', email);
      const snapshot = await usersRef.get();

      if (snapshot.empty) {
        res.status(404).send('User not found');
        return;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Fetch all match documents
      const matchPromises = userData.matches.map((matchRef: FirebaseFirestore.DocumentReference) => matchRef.get());
      const matchSnapshots = await Promise.all(matchPromises);

      const matches = matchSnapshots.map((matchSnapshot) => {
        const matchData = matchSnapshot.data();
        return {
          id: matchSnapshot.id,
          ...matchData,
        };
      });

      const user: User = {
        email: userData.email, // Updated to use email instead of netid
        firstname: userData.firstname,
        lastname: userData.lastname,
        matches: matches,
        points: userData.points,
        college: userData.college,
      };

      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});

