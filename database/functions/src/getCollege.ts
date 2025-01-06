import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

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
