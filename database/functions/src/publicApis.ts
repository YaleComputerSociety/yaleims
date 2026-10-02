import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import {randomBytes} from "crypto";
import { authenticateRequest } from "./auth.js";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const publicApiSignup = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method != "POST") {
        return res.status(405).send("Method not allowed");
      }
      const auth = await authenticateRequest(req);
      if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
      }
      const decoded = auth.decoded;
      
      const description = req.body.description;
      const apiKey = randomBytes(32).toString("hex");

      const userRef = db.collection("users").doc(decoded.email);
      await userRef.collection("api_keys").doc(description).set({
        description: description, apiKey: apiKey, createdAt: admin.firestore.Timestamp.now()
      });

      await db.collection("user_api_keys").doc(apiKey).set({
        email: decoded.email,
        uses: 0,
      });

      return res.status(200).json({ message: "Successfully signed up for public APIs", apiKey: apiKey });
    } catch (error) {
      console.error("Error Signing up for public APIs");
      return res.status(500).send("Internal Server Error");
    }
  })
})