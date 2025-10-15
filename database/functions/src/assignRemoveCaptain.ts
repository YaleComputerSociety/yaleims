import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { isValidDecodedToken } from "./helpers.js";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const assignRemoveCaptain = functions.https.onRequest(
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(400).json({ error: "Invalid Method" });
      }
      try {
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
        const token = authHeader.split("Bearer ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!isValidDecodedToken(decoded)) {
          return res.status(401).json({ error: "Invalid token" });
        }

        const { email, sport, assign, remove } = req.body as {
          email: string;
          sport: string;
          assign?: boolean;
          remove?: boolean;
        };

        if (!email || !sport) {
          return res.status(400).json({ error: "Missing email or sport" });
        }
        if (!assign && !remove) {
          return res
            .status(400)
            .json({ error: "Must specify either assign or remove" });
        }

        const userRef = db.collection("users").doc(email);

        await db.runTransaction(async tx => {
            const snap = await tx.get(userRef);
            if (!snap.exists) throw new Error("User not found");

            const sportsArr: string[] = Array.isArray(snap.get("sportsCaptainOf"))
                ? [...snap.get("sportsCaptainOf")]
                : [];

            const rolesArr: string[] = Array.isArray(snap.get("mRoles"))
                ? [...snap.get("mRoles")]
                : ["user"];

            if (!rolesArr.includes("user")) rolesArr.push("user");

            /* ── 2. Mutate copies ── */
            if (assign) {
                if (!sportsArr.includes(sport)) sportsArr.push(sport);
                if (!rolesArr.includes("captain")) rolesArr.push("captain");
            }

            if (remove) {
                const idx = sportsArr.indexOf(sport);
                if (idx !== -1) sportsArr.splice(idx, 1);

                if (sportsArr.length === 0) {
                const capIdx = rolesArr.indexOf("captain");
                if (capIdx !== -1) rolesArr.splice(capIdx, 1);
                }
            }

            /* ► Guarantee “user” is still present after mutations */
            if (!rolesArr.includes("user")) rolesArr.push("user");

            /* ── 3. Prepare updates ── */
            const updates: Record<string, any> = {
                sportsCaptainOf:
                sportsArr.length > 0 ? sportsArr : admin.firestore.FieldValue.delete(),

                /** ► Never delete mRoles: always write current list */
                mRoles: rolesArr,
            };

            // optional legacy scalar:
            // updates.role = rolesArr.includes("captain") ? "captain" : "user";

            tx.update(userRef, updates);
        });

        return res.json({ success: true });
      } catch (err: any) {
        console.error("Error assigning/removing captain:", err);
        if (err.message === "User not found") {
          return res.status(404).json({ error: "User not found" });
        }
        return res.status(500).json({ error: err.message });
      }
    });
  }
);
