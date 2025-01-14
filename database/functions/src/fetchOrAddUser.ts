import fetch from "node-fetch";
import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

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
      const userRef = db.collection("users").doc(email);
      const userDoc = await userRef.get();

      // Step 3: If User Exists, Return Selected Data
      if (userDoc.exists) {
        // Manually filter the fields you want to include in the response
        const fullData = userDoc.data();
        const filteredData = {
          firstname: fullData?.firstname,
          lastname: fullData?.lastname,
          email: fullData?.email,
          college: fullData?.college,
          role: fullData?.role,
          matches_played: fullData?.matches_played,
          username: fullData?.username,
        };

        res.status(200).json({
          message: "User already exists.",
          user: filteredData,
        });
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

      // Generate a unique username
      const count = await incrementCounter();
      let generatedUsername = generateUsername(count);

      const usernameRef = db.collection("usernames").doc(generatedUsername);
      const usernameDoc = await usernameRef.get();

      if (!usernameDoc.exists) {
        await usernameRef.set({
          email,
        });
      } else {
        generatedUsername = "Anonymous";
      }

      const newUser = {
        email: email,
        firstname: first_name,
        lastname: last_name,
        matches: [],
        points: 0,
        college: college || null,
        role: "user", // default role; otherwise "admin" can be set in firestore
        username: generatedUsername,
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

// Increment the counter without transactions
async function incrementCounter() {
  const counterRef = db.collection("counters").doc("usernames");

  // Use Firestore's atomic increment
  await counterRef.set(
    { count: admin.firestore.FieldValue.increment(1) },
    { merge: true }
  );

  // Retrieve the updated count
  const snapshot = await counterRef.get();
  return snapshot.exists ? snapshot.data()?.count || 0 : 0;
}

// Generate a username based on count
function generateUsername(count: any) {
  const adjectives = [
    "Swift",
    "Bold",
    "Clever",
    "Happy",
    "Brave",
    "Fierce",
    "Gentle",
    "Mighty",
    "Charming",
    "Lucky",
    "Fearless",
    "Noble",
    "Playful",
    "Quick",
    "Witty",
    "Serene",
    "Vivid",
    "Graceful",
    "Bright",
    "Silent",
    "Eager",
    "Calm",
    "Dynamic",
    "Friendly",
    "Humble",
    "Jolly",
    "Keen",
    "Loyal",
    "Patient",
    "Powerful",
    "Radiant",
    "Sharp",
    "Sturdy",
    "Valiant",
    "Wise",
    "Zealous",
    "Agile",
    "Cheerful",
    "Daring",
    "Elegant",
    "Fearsome",
    "Gleeful",
    "Heroic",
    "Joyful",
    "Kind",
    "Lively",
    "Modest",
    "Peaceful",
    "Resilient",
    "Spirited",
    "Strong",
    "Thoughtful",
    "Vibrant",
    "Warm",
    "Zesty",
  ];

  const nouns = [
    "Tiger",
    "Cloud",
    "Eagle",
    "Phoenix",
    "Wave",
    "Lion",
    "Bear",
    "Falcon",
    "River",
    "Mountain",
    "Sky",
    "Wolf",
    "Sun",
    "Moon",
    "Star",
    "Forest",
    "Ocean",
    "Hawk",
    "Falcon",
    "Stream",
    "Glacier",
    "Thunder",
    "Comet",
    "Dolphin",
    "Breeze",
    "Shadow",
    "Flame",
    "Blaze",
    "Meadow",
    "Canyon",
    "Galaxy",
    "Pebble",
    "Raven",
    "Snow",
    "Storm",
    "Tornado",
    "Valley",
    "Whale",
    "Zephyr",
    "Aurora",
    "Brook",
    "Falcon",
    "Lynx",
    "Meteor",
    "Puma",
    "Quasar",
    "Rain",
    "Sand",
    "Tide",
    "Vortex",
    "Wind",
    "Zenith",
    "Orca",
    "Jaguar",
    "Dragonfly",
  ];

  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${randomAdjective}${randomNoun}${count}`;
}
