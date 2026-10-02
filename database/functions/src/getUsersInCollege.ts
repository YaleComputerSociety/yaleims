import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import { corsHandler } from "./cors.js";
import { authenticateRequest } from "./auth.js";

import { isValidDecodedToken } from "./helpers.js";

const db = admin.firestore();

export const getUsersInCollege = functions.https.onRequest(
  async (req, res) => {
    corsHandler(req, res, async () => {
      const auth = await authenticateRequest(req);
      if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
      }
      const decoded = auth.decoded;
      if (!isValidDecodedToken(decoded) || decoded.mRoles.includes("college_rep") === false) {
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

          if (data.mRoles.includes("captain") || data.role === "captain") {
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
