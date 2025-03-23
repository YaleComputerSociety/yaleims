import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

// Updates the username for a given userId
export const updateUsername = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {

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

      const { userId, newUsername } = req.body;

      // Validate input
      if (!userId || !newUsername) {
        return res
          .status(400)
          .send(
            `Missing 'userId' or 'newUsername' in request body ${userId}, ${newUsername}`
          );
      }

      const trimmedUsername = newUsername.trim();

      // Additional validation
      const maxLength = 20; // Maximum length for the username
      const minLength = 3; // Minimum length for the username
      const validFormat = /^[a-zA-Z0-9_]+$/; // Allow only letters, numbers, and underscores

      if (trimmedUsername === "") {
        return res.status(400).send("Username cannot be empty");
      }

      if (
        trimmedUsername.length < minLength ||
        trimmedUsername.length > maxLength
      ) {
        return res
          .status(400)
          .send(
            `Username must be between ${minLength} and ${maxLength} characters long`
          );
      }

      if (!validFormat.test(trimmedUsername)) {
        return res
          .status(400)
          .send(
            "Username can only contain letters, numbers, and underscores, and no spaces"
          );
      }
      // Check if the new username is already taken
      const usernameDoc = db.collection("usernames").doc(trimmedUsername);
      const usernameSnapshot = await usernameDoc.get();

      if (usernameSnapshot.exists) {
        return res.status(409).send("Username is already taken");
      }

      // Get the user's current document
      const userDoc = db.collection("users").doc(userId);
      const userSnapshot = await userDoc.get();

      if (!userSnapshot.exists) {
        return res.status(404).send("User not found");
      }

      const oldUsername = userSnapshot.data()?.username;

      // Perform updates in a transaction
      await db.runTransaction(async (transaction) => {
        // Set the new username in the `usernames` collection
        transaction.set(usernameDoc, {
          userId,
        });

        // Update the user's document
        transaction.update(userDoc, { username: trimmedUsername });

        // Remove the old username from the `usernames` collection
        if (oldUsername) {
          const oldUsernameDoc = db.collection("usernames").doc(oldUsername);
          transaction.delete(oldUsernameDoc);
        }
      });

      return res.status(200).send({ success: true, username: trimmedUsername });
    } catch (error) {
      console.error("Error updating username:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
