import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

// Updates the username for a given userId (email)
export const updateUserRole = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { email, role, sport } = req.body;
      if (!email || !role || (role === "captain" && !sport)) {
        return res.status(400).send("Missing input parameters");
      }

      const userRef = db.collection("users").doc(email);

      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).send("User not found");
      }

      await userRef.update({ role });

      // if role is captain, add sport to teams_captain_of array
      if (role === "captain") {
        await userRef.update({
          teams_captain_of: admin.firestore.FieldValue.arrayUnion(sport),
        });
      }

      // if role is not captain, remove teams_captain_of array
      if (role !== "captain") {
        await userRef.update({
          teams_captain_of: admin.firestore.FieldValue.delete(),
        });
      }

      return res.status(200).send({ success: true });
    } catch (error) {
      console.error("Error updating user role:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
