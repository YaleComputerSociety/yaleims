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