import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { isValidDecodedToken } from "./helpers.js";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

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
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: "projects/yims-125a2/secrets/JWT_SECRET/versions/1",
    });
    if (!version.payload || !version.payload.data) {
      console.error("JWT secret payload is missing");
      return res.status(500).send("Internal Server Error");
    }
    const JWT_SECRET = version.payload.data.toString();
    const idToken = authHeader.split("Bearer ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(idToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (!isValidDecodedToken(decoded) || !decoded.mRoles.includes("college_rep")) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { season, residentialCollege, weekId, mvpEmail, mvpFName, mvpLName } = req.body;
    if (!season || !residentialCollege || !weekId || !mvpEmail || !mvpFName || !mvpLName) {
      return res.status(400).json({ error: "Missing required field(s)" });
    }

    console.log(mvpFName, mvpLName);

    const weekRef = db
      .collection("mvps")
      .doc(season)
      .collection(residentialCollege)
      .doc(weekId);

    const mailRef = db.collection("mail");

    try {
      await weekRef.set(
        {
          [mvpEmail]: { fname: mvpFName, lname: mvpLName }
        },
        { merge: true }  
      );

      await mailRef.add({
        to: [mvpEmail],
        message: {
          subject: `[YaleIMS] Congratulations, ${mvpFName}!`,
          text: `Hello ${mvpFName},\n\nYou have been selected as MVP for week ${weekId} in ${season} for ${residentialCollege}!`,
          html: `<p>Hello ${mvpFName},</p>
                <p>You have been selected as <strong>MVP</strong> for week ${weekId} in ${season} for ${residentialCollege}!</p>`
        }
      });

      return res.status(200).json({ success: true, weekId });

    } catch (error) {
      console.error("Error setting MVP:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
