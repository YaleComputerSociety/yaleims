import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";

const db = admin.firestore();
const corsHandler = cors({ origin: true });

export const setMVP = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(idToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (!isValidDecodedToken(decoded) || decoded.role !== "college_rep") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { season, residentialCollege, weekId, mvpEmail } = req.body;
    if (!season || !residentialCollege || !weekId || !mvpEmail) {
      return res.status(400).json({ error: "Missing required field(s)" });
    }

    const weekRef = db
      .collection("mvps")
      .doc(season)
      .collection(residentialCollege)
      .doc(weekId);

    const [fname, lname] = decoded.name.split(' ');
    try {
      await weekRef.set(
        {
          [mvpEmail]: { fname: fname, lname: lname }
        },
        { merge: true }  
      );

      return res.status(200).json({ success: true, weekId });

    } catch (error) {
      console.error("Error setting MVP:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
