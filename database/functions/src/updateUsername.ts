import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import jwt from "jsonwebtoken";
import { isValidDecodedToken } from "./helpers.js";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

// Updates the username for a given userId
export const updateUsername = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const authHeader = req.headers.authorization || ""
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
      const token = authHeader.split("Bearer ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (!isValidDecodedToken(decoded)) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const userId = decoded.email;

      const { newUsername } = req.body;

      // Validate input
      if (!newUsername) {
        return res
          .status(400)
          .send(
            `Missing 'userId' or 'newUsername' in request body ${newUsername}`
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
