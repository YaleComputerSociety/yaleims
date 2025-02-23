import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const getMyAvailablePoints = functions.https.onRequest(
  async (req, res) => {
    corsHandler(req, res, async () => {
      // uncomment and redeploy once new frontend changes are deployed
      // const authHeader = req.headers.authorization || ""
      // if (!authHeader.startsWith("Bearer ")) {
      //   return res.status(401).json({error: "No token provided"});
      // }
      // //   // getting token passed from request
      // const idToken = authHeader.split("Bearer ")[1];
      // // //   //verifying the token using firebase admin
      // let decoded;
      // try {
      //   decoded = await admin.auth().verifyIdToken(idToken);
      //   if (!decoded) {
      //     return res.status(401).json({error: "Invalid Token"})
      //   }
      // } catch (error) {
      //   return res.status(401).json({error: "Invalid Token"})
      // } 
      //get rid of email in the query and use the decoded users email

      const { email } = req.query;

      if (typeof email !== "string") {
        return res.status(400).send("Email must be a valid string");
      }

      if (!email) {
        return res.status(400).send("Email query parameter is required");
      }

      try {
        const userRef = db.collection("users").doc(email);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return res.status(404).send("User not found");
        }

        const userData = userDoc.data();
        return res.status(200).json({
          points: userData?.points || 0,
          correctPredictions: userData?.correctPredictions || 0,
          username: userData?.username || "Anonymous",
        });
      } catch (error) {
        console.error("Error fetching user points:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);
