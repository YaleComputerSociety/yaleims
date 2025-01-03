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

import { Filter, Query } from "firebase-admin/firestore";
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

// pretty efficient in terms of minimizing reads, except for when a request is made with a large offset
// as that still reads all the documents before the offset (e.g. if the user requests the last page it will have to read all the pages before)
// i think there isn't a way to avoid this with Firestore, but i could be wrong
// the logic for navigating to adjacent pages is much better though and only reads the according documents; overall should decrease reads by alot
export const getMatchesPaginated = functions.https.onRequest(
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        const {
          college,
          pageIndex,
          pageSize,
          lastVisible,
          type,
          firstVisible,
          sport,
          sortOrder = "desc",
          date,
        } = req.query;

        if (!college || !pageSize) {
          return res.status(400).send("Missing required parameters");
        }

        const pageSizeNum = parseInt(pageSize as string, 10);
        const pageIndexNum = parseInt(pageIndex as string, 10);

        if (sortOrder !== "asc" && sortOrder !== "desc") {
          return res.status(400).send("Invalid 'sortOrder' parameter");
        }

        const scoresRef = db
          .collection("matches")
          .orderBy("timestamp", sortOrder);

        let query = scoresRef;

        // college filter query
        if (college !== "All") {
          query = query.where(
            Filter.or(
              Filter.where("home_college", "==", college),
              Filter.where("away_college", "==", college)
            )
          );
        }

        // sport filter query
        if (sport !== "All") {
          query = query.where("sport", "==", sport);
        }  

        // date filter query
        const currentDate = new Date();       
        
        if (date) {
          if (date !== "All") {
            let startDate: Date | undefined;
            // can add more options if needed, would have to update the frontend to reflect changes
            if (date === "today") {
              startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            } else if (date === "yesterday") {
              startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
            } else if (date === "last7days") {
              startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
            } else if (date === "last30days") {
              startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 30);
            } else if (date === "last60days") {
              startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 60);
            } else {
              return res.status(400).send("Invalid dateFilter value");
            }
            query = query.where("timestamp", ">=", startDate).where("winner", "!=", null); ;
          } else {
            query = query.where("timestamp", "<", currentDate).where("winner", "!=", null); 
          }
        }

        // Calculate total pages of query
        const totalResultsSnapshot = await query.count().get();
        const totalResults = totalResultsSnapshot.data().count;
        const totalPages = Math.ceil(totalResults / pageSizeNum);

        // query types
        if (type === "next") {
          // next page
          if (!lastVisible) {
            return res.status(400).send("Missing 'lastVisible' parameter");
          }
          const lastVisibleDoc = await db
            .collection("matches")
            .doc(lastVisible as string)
            .get();

          if (!lastVisibleDoc.exists) {
            return res.status(404).send("First visible document not found");
          }

          query = query.startAfter(lastVisibleDoc).limit(pageSizeNum);
        } else if (type === "prev") {
          // previous page
          if (!firstVisible) {
            return res.status(400).send("Missing 'firstVisible' parameter");
          }
          const firstVisibleDoc = await db
            .collection("matches")
            .doc(firstVisible as string)
            .get();

          if (!firstVisibleDoc.exists) {
            return res.status(404).send("First visible document not found");
          }

          query = query.endBefore(firstVisibleDoc).limitToLast(pageSizeNum);
        } else if (type === "index") {
          // get a specific page
          if (!pageIndex) {
            return res.status(400).send("Missing 'pageIndex' parameter");
          }
          if (pageIndexNum >= 1) {
            query = query
              .offset((pageIndexNum - 1) * pageSizeNum)
              .limit(pageSizeNum);
          }
        } else {
          return res.status(400).send("Invalid 'type' parameter");
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
          return res.status(200).json({
            matches: [],
            lastVisible: null,
            firstVisible: null,
            totalPages,
          });
        }

        const matches = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
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

        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        const nextLastVisible = lastDoc ? lastDoc.id : null;
        const firstDoc = snapshot.docs[0];
        const nextFirstVisible = firstDoc ? firstDoc.id : null;

        return res.status(200).json({
          matches,
          lastVisible: nextLastVisible,
          firstVisible: nextFirstVisible,
          totalPages,
        });
      } catch (error) {
        console.error("Error fetching college data:", error);
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
