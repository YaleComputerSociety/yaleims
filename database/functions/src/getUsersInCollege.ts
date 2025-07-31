import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const getUsersInCollege = functions.https.onRequest(
  async (req, res) => {
    corsHandler(req, res, async () => {
      const authHeader = req.headers.authorization || "";
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
      }
      let decoded: any;
      try {
        const token = authHeader.split("Bearer ")[1];
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        return res.status(401).json({ error: "Invalid token" });
      }
      if (!isValidDecodedToken(decoded) || decoded.role !== "college_rep") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const college = decoded.college;
      const wantCaptains = req.query.wantCaptains === "true"

      try {
        const snapshot = await db
          .collection("users")
          .where("college", "==", college)
          .get();

        if (snapshot.empty) {
          return res.status(404).json({ error: "No users found" });
        }

        if (!wantCaptains) {
          const users = snapshot.docs.map(doc => doc.data());
          return res.status(200).json({users})
        }

        const users: any[] = [];
        const captains: any[] = [];

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          users.push(data);

          if (data.role === "captain") {
            captains.push({ 
              firstName: data.firstname,
              lastName: data.lastname,
              email: data.email,  
              sportsCaptainOf: data.sportsCaptainOf
            })
          }
        });

        return res.status(200).json({ users, captains });
      } catch (error) {
        console.error("Error fetching users in college:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);
