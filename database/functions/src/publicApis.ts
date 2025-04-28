import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import {randomBytes} from "crypto";

interface DecodedToken {
  name: string;
  netid: string;
  email: string;
  role: string;
  username: string;
  college: string;
  points: string;
  matches_played: number;
}

const corsHandler = cors({ origin: true });

const db = admin.firestore();
const JWT_SECRET = "wp[rkfwprk0pki942j4e-9j1o[jfcm2lv;24p[2p0-1i0]]]";

export const publicApiSignup = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method != "POST") {
        return res.status(405).send("Method not allowed");
      }
      const authHeader = req.headers.authorization || "";
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({error: "No token provided"});
      }
      const token = authHeader.split("Bearer ")[1];
        
      if (!JWT_SECRET) {
        console.error("JWT_SECRET is not defined");
        return res.status(500).json({error: "Internal Server Error"});
                }

      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload as DecodedToken;
      
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