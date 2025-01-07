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

import { Filter, Query, OrderByDirection } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import cors from "cors";
import fetch from "node-fetch";
import { sports } from "./helpers.js";

// Initialize Firebase Admin
admin.initializeApp();

const corsHandler = cors({ origin: true });

const db = admin.firestore();

interface College {
  id: string;
  name: string;
  points: number;
}

export const fetchOrAddUser = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const { email } = req.body; // The email passed directly in the request

    // Step 1: Check that the email is a Yale email
    if (!email || !email.endsWith("@yale.edu")) {
      res.status(403).json({ error: "You must use a Yale email to sign in." });
      return;
    }

    try {
      // Step 2: Reference Firestore Document (Use Email as Document ID)
      const userRef = admin.firestore().collection("users").doc(email);
      const userDoc = await userRef.get();

      // Step 3: If User Exists, Return Data
      if (userDoc.exists) {
        res
          .status(200)
          .json({ message: "User already exists.", user: userDoc.data() });
        return;
      }

      // Step 4: Fetch User Details from Yalies API
      const yaliesResponse = await fetch("https://yalies.io/api/people", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MjUzNzcxNTIsInN1YiI6ImF3eDIifQ.sKmMqhsyh71EIqfLPMqIx50py3nhhzo6kkq7OKPiHM8",
        },
        body: JSON.stringify({
          filters: { email: [email] },
          page: 1,
          page_size: 1,
        }),
      });

      if (!yaliesResponse.ok) {
        res
          .status(500)
          .json({ error: "Failed to fetch data from the Yalies API." });
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
        role: "user", // default role; otherwise "admin" can be set in firestore
        matches_played: 0,
      };

      await userRef.set(newUser);
      res
        .status(200)
        .json({ message: "User successfully added.", user: newUser });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
});

export const getLeaderboard = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const leaderboardRef = db.collection("colleges");
      const snapshot = await leaderboardRef.orderBy("points", "desc").get();

      if (snapshot.empty) {
        res.status(404).send("No colleges found");
        return;
      }

      const leaderboard: College[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        leaderboard.push({
          id: doc.id,
          name: data.name,
          points: data.points,
        } as College);
      });
      //console.log('Leaderboard data:', JSON.stringify(leaderboard, null, 2));
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard from Function Code:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});

export const getUserMatches = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { userId } = req.query;

      if (!userId) {
        res.status(400).send("Missing userId parameter");
        return;
      }

      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(userId as string)
        .get();

      if (!userDoc.exists) {
        res.status(404).send("User not found");
        return;
      }

      const userData = userDoc.data();
      const matches = userData?.matches || []; // Default to empty array if no matches

      res.status(200).json(matches);
    } catch (error) {
      console.error("Error fetching user matches:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});

export const getMatches = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { type, sortOrder = "desc" } = req.query; // Retrieve the 'type' and 'sortOrder' query parameters
      const currentDate = new Date();
      let query: Query = db.collection("matches"); // Explicitly use Query type

      // Apply filtering based on the 'type' query parameter (all, past, or future)
      if (type === "past") {
        query = query.where("timestamp", "<", currentDate); // Get past matches
      } else if (type === "future") {
        query = query.where("timestamp", ">", currentDate); // Get future matches
      }

      query = query.orderBy("timestamp", sortOrder as "asc" | "desc");

      // Fetch the matches from Firestore
      const snapshot = await query.get();

      if (snapshot.empty) {
        return res.status(200).json([]); // Respond with an empty array instead of return res.status(404).send("No matches found");
      }

      // Process the query result and format the data
      const matches = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          home_college: data.home_college,
          away_college: data.away_college,
          sport: data.sport,
          home_college_score: data.home_college_score,
          away_college_score: data.away_college_score,
          winner: data.winner,
          timestamp:
            data.timestamp && data.timestamp.toDate
              ? data.timestamp.toDate().toISOString()
              : null, // Fallback if timestamp is missing or invalid
        };
      });

      // Return the matches as a JSON response
      return res.status(200).json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});


export const getMatchesPaginated = functions.https.onRequest(
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        const college = req.query.college as string;
        const pageIndex = req.query.pageIndex as string;
        const pageSize = req.query.pageSize as string;
        const lastVisible = req.query.lastVisible as string;
        const type = req.query.type as string;
        const firstVisible = req.query.firstVisible as string;
        const sport = req.query.sport as string;
        const sortOrder = (req.query.sortOrder as string) || "desc";
        const date = req.query.date as string;

        if (!college || !pageSize) {
          return res.status(400).send("Missing required parameters");
        }

        const pageSizeNum = parseInt(pageSize as string, 10);
        const pageIndexNum = parseInt(pageIndex as string, 10);
        if (!["asc", "desc"].includes(sortOrder)) {
          return res.status(400).send("Invalid 'sortOrder' parameter");
        }

        const currentDate = new Date();
        type DateFilterKey = "today" | "yesterday" | "last7days" | "last30days" | "last60days";
        const dateFilters: Record<DateFilterKey, Date> = {
          today: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
          yesterday: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1),
          last7days: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7),
          last30days: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 30),
          last60days: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 60),
        };
        

        if (!["asc", "desc"].includes(sortOrder)) {
          return res.status(400).send("Invalid 'sortOrder' parameter");
        }
        
        const sortOrderValidated = sortOrder as OrderByDirection;
        let query = db.collection("matches").orderBy("timestamp", sortOrderValidated);
        
        if (college !== "All") {
          query = query.where(
            Filter.or(
              Filter.where("home_college", "==", college),
              Filter.where("away_college", "==", college)
            )
          );
        }

        if (sport && sport !== "All") query = query.where("sport", "==", sport);

        if (date && date !== "All") {
          if (!(date in dateFilters)) {
            return res.status(400).send("Invalid date filter");
          }
        
          const startDate = dateFilters[date as keyof typeof dateFilters];
          query = query.where("timestamp", ">=", startDate).where("winner", "!=", null);
        } else {
          query = query.where("timestamp", "<", currentDate).where("winner", "!=", null);
        }

        const totalResults = (await query.count().get()).data().count;
        const totalPages = Math.ceil(totalResults / pageSizeNum);

        if (type === "next" && lastVisible) {
          const lastVisibleDoc = await db.collection("matches").doc(lastVisible as string).get();
          if (!lastVisibleDoc.exists) return res.status(404).send("Last visible document not found");
          query = query.startAfter(lastVisibleDoc).limit(pageSizeNum);
        } else if (type === "prev" && firstVisible) {
          const firstVisibleDoc = await db.collection("matches").doc(firstVisible as string).get();
          if (!firstVisibleDoc.exists) return res.status(404).send("First visible document not found");
          query = query.endBefore(firstVisibleDoc).limitToLast(pageSizeNum);
        } else if (type === "index" && pageIndexNum >= 1) {
          query = query.offset((pageIndexNum - 1) * pageSizeNum).limit(pageSizeNum);
        } else {
          return res.status(400).send("Invalid or missing 'type' parameter");
        }

        const snapshot = await query.get();
        if (snapshot.empty) {
          return res.status(200).json({ matches: [], lastVisible: null, firstVisible: null, totalPages });
        }

        const matches = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
        }));

        return res.status(200).json({
          matches,
          lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
          firstVisible: snapshot.docs[0]?.id || null,
          totalPages,
        });
      } catch (error) {
        console.error("Error fetching matches:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);

// returns the college data for a given collegeId
export const getCollege = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { collegeId } = req.query;

      if (!collegeId) {
        return res.status(400).send("Missing 'collegeId' query parameter");
      }

      const collegeDoc = await db
        .collection("colleges")
        .doc(collegeId as string)
        .get();

      if (!collegeDoc.exists) {
        return res.status(404).send("College not found");
      }

      const collegeData = collegeDoc.data();
      return res.status(200).json(collegeData);
    } catch (error) {
      console.error("Error fetching college data:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});

// gets unscored matches (winner is null) that have already occurred (timestamp is in the past)
export const getUnscoredMatches = functions.https.onRequest(
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        const currentDate = new Date();

        const snapshot = await db
          .collection("matches")
          .where("winner", "==", null)
          .where("timestamp", "<", currentDate) // get past matches
          .orderBy("timestamp", "asc") // orders oldest first
          .get();

        if (snapshot.empty) {
          return res.status(200).json({ success: true, matches: [] });
        }

        const matches = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return res.status(200).json({ success: true, matches: matches });
      } catch (error) {
        console.error("Error fetching unscored matches:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);

export const scoreMatch = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const {
        matchId,
        homeScore,
        awayScore,
        homeForfeit,
        awayForfeit,
        homeTeam,
        awayTeam,
        sport,
      } = req.body;

      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      // validate request parameters
      if (
        !matchId ||
        typeof homeScore !== "number" ||
        typeof awayScore !== "number" ||
        typeof homeForfeit !== "boolean" ||
        typeof awayForfeit !== "boolean" ||
        typeof homeTeam !== "string" ||
        typeof awayTeam !== "string" ||
        typeof sport !== "string"
      ) {
        return res.status(400).send("Error with parameters");
      }

      let winningTeam: string;
      const doubleForfeit = homeForfeit && awayForfeit;

      // there's some forfeit logic here that i'm a little confused about
      if (doubleForfeit) {
        winningTeam = "Default"; // not sure if i understood this correctly
      } else if (homeForfeit || awayForfeit) {
        homeForfeit ? (winningTeam = awayTeam) : (winningTeam = homeTeam);
      } else if (homeScore == awayScore) {
        winningTeam = "Draw";
      } else {
        homeScore > awayScore
          ? (winningTeam = homeTeam)
          : (winningTeam = awayTeam);
      }

      // update match data in Firestore
      const matchUpdateData = {
        home_college_score: homeScore,
        away_college_score: awayScore,
        forfeit: homeForfeit || awayForfeit,
        winner: winningTeam,
      };

      // update college stats
      const collegeUpdateData: any = {};
      const pointsForWin = sports[sport].points; // evetually change this to get from firestore - but right now the data is stored weird; change id to string of the sport name rather than a number

      // all cases for updating college stats of win, loss, tie, forfeit, points (all cases increment games played)
      // this code is veryyy lengthy, but i'm unsure if there's a more concise way since there are just a lot of cases to manage
      if (doubleForfeit) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          forfeits: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin / 2),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          forfeits: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin / 2),
        };
      } else if (winningTeam === "Draw") {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          ties: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin / 2),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          ties: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin / 2),
        };
      } else if (homeForfeit) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          forfeits: admin.firestore.FieldValue.increment(1),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          wins: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin),
        };
      } else if (awayForfeit) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          wins: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          forfeits: admin.firestore.FieldValue.increment(1),
        };
      } else if (homeScore > awayScore) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          wins: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          losses: admin.firestore.FieldValue.increment(1),
        };
      } else if (homeScore < awayScore) {
        collegeUpdateData[homeTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          losses: admin.firestore.FieldValue.increment(1),
        };
        collegeUpdateData[awayTeam] = {
          games: admin.firestore.FieldValue.increment(1),
          wins: admin.firestore.FieldValue.increment(1),
          points: admin.firestore.FieldValue.increment(pointsForWin),
        };
      }

      // doc refs
      const matchRef = db.collection("matches").doc(matchId);
      const awayCollegeRef = db.collection("colleges_testing").doc(awayTeam); // change to colleges
      const homeCollegeRef = db.collection("colleges_testing").doc(homeTeam); // change to colleges

      // batch write
      const batch = db.batch();

      batch.update(matchRef, matchUpdateData);
      batch.update(awayCollegeRef, collegeUpdateData[awayTeam]);
      batch.update(homeCollegeRef, collegeUpdateData[homeTeam]);

      await batch.commit();

      // update ranks -- may be a good idea to have a separate function for this as well, scheduled to run every so often, to protect against failures (if this section doesn't run properly for some reason)
      const collegesSnapshot = await db.collection("colleges_testing").get();
      const colleges: { id: string; points: number; wins: number }[] = [];

      collegesSnapshot.forEach((doc) => {
        colleges.push({
          id: doc.id,
          points: doc.data().points,
          wins: doc.data().wins, // tiebreaker -- need to look into how they actually break ties
        });
      });

      colleges.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return b.wins - a.wins; // Tie-breaker: descending by wins; might change
      });

      // ranks batch write
      const rankBatch = db.batch();
      colleges.forEach((college, index) => {
        rankBatch.update(db.collection("colleges_testing").doc(college.id), {
          rank: index + 1,
        });
      });
      await rankBatch.commit();

      // return success response
      return res
        .status(200)
        .send("Match and colleges data updated successfully.");
    } catch (error) {
      console.error("Error scoring match:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});

export const addParticipant = functions.https.onRequest((req, res) => {
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

      // Check for duplicate participant by email
      const isDuplicate = participantsArray.some(
        (participant: { email: string }) => {
          return participant.email === user.email;
        }
      );

      if (isDuplicate) {
        console.warn(`${user.email} is already a participant`);
        res
          .status(400)
          .json({ error: `${user.email} is already a participant` });
        return;
      }

      // Add the participant (entire user object) and update Firestore
      participantsArray.push(user);

      await matchDoc.ref.update({
        [participantType]: participantsArray,
      });

      // Add the match to the user's "matches" array in the "users" collection
      const userDocRef = admin.firestore().collection("users").doc(user.email);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        console.error(`User document not found for email: ${user.email}`);
        res.status(404).json({ error: "User not found" });
        return;
      }

      const userData = userDoc.data();
      const userMatches = userData?.matches || [];
      const matchesPlayed = userData?.matches_played; // TEST

      // Check if the match is already in the user's matches array
      const isMatchDuplicate = userMatches.some(
        (match: any) => match.matchId === matchId
      );

      if (isMatchDuplicate) {
        console.warn(`Match ${matchId} is already in your matches`);
      } else {
        userMatches.push({ matchId, ...selectedMatch });

        await userDocRef.update({
          matches: userMatches,
          matches_played: matchesPlayed + 1, // Increment matches_played by 1
        });
      }

      res.status(200).json({
        message: `Successfully signed up and updated your matches!`,
      });
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
});

export const getCollegeMatches = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { type, sortOrder = "desc", college } = req.query; // Retrieve 'type', 'sortOrder', and 'college' query parameters
      const currentDate = new Date();
      let query: Query = db.collection("matches"); // Explicitly use Query type

      // Apply filtering based on the 'type' query parameter (all, past, or future)
      if (type === "past") {
        query = query.where("timestamp", "<", currentDate); // Get past matches
      } else if (type === "future") {
        query = query.where("timestamp", ">", currentDate); // Get future matches
      }

      query = query.orderBy("timestamp", sortOrder as "asc" | "desc");

      // Fetch the matches for home_college
      let homeMatchesQuery = query.where("home_college", "==", college);
      let awayMatchesQuery = query.where("away_college", "==", college);

      // Execute both queries and merge the results
      const homeMatchesSnapshot = await homeMatchesQuery.get();
      const awayMatchesSnapshot = await awayMatchesQuery.get();

      // Log the results of both queries to see how many matches are being returned
      // console.log("Home Matches Snapshot:", homeMatchesSnapshot.docs.length);
      // console.log("Away Matches Snapshot:", awayMatchesSnapshot.docs.length);

      // Combine the results from both queries and ensure data is valid
      const allMatches = [
        ...homeMatchesSnapshot.docs
          .map((doc) => doc.data())
          .filter((data) => data !== undefined), // Filter out undefined data
        ...awayMatchesSnapshot.docs
          .map((doc) => doc.data())
          .filter((data) => data !== undefined), // Filter out undefined data
      ];

      // Log all matches before returning
      // console.log("All Matches:", allMatches);

      // Process and format the results
      const matches = allMatches.map((data) => {
        if (!data) return null; // Ensure that data is defined
        return {
          home_college: data.home_college,
          away_college: data.away_college,
          sport: data.sport,
          home_college_score: data.home_college_score,
          away_college_score: data.away_college_score,
          home_college_participants: data.home_college_participants,
          away_college_participants: data.away_college_participants,
          winner: data.winner,
          timestamp:
            data.timestamp && data.timestamp.toDate
              ? data.timestamp.toDate().toISOString()
              : null, // Fallback if timestamp is missing or invalid
        };
      }).filter((match) => match !== null); // Filter out null matches

      // Return the matches as a JSON response
      return res.status(200).json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});

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
      const userDocRef = admin.firestore().collection("users").doc(user.email);
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












