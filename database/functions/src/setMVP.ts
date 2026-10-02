import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { authenticateRequest } from "./auth.js";

import { isValidDecodedToken } from "./helpers.js";

const db = admin.firestore();
const corsHandler = cors({ origin: true });

export const setMVP = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const auth = await authenticateRequest(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }
    const decoded = auth.decoded;
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

    try {
      await weekRef.set(
        {
          [mvpEmail]: { fname: mvpFName, lname: mvpLName }
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
