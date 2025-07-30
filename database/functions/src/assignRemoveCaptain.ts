import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";

import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const assignRemoveCaptain = functions.https.onRequest(
  async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            return res.status(400).json({error: "Invalid Method"})
        }
        try {
            const authHeader = req.headers.authorization || "";
            if (!authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ error: "No token provided" });
            }
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
                return res.status(400).json({ error: "Must specify either assign or remove" });
            }

            const userRef = db.collection("users").doc(email);

            await db.runTransaction(async (tx) => {
                const snap = await tx.get(userRef);
                if (!snap.exists) {
                    throw new Error("User not found");
                }

                const data = snap.data()!;
                const currentRole = data.role as string;
                const currentArray = Array.isArray(data.sportsCaptainOf) ? (data.sportsCaptainOf as string[]) : [];

                let newArray = [...currentArray];
                let newRole = currentRole;

                if (assign) {
                    if (!newArray.includes(sport)) newArray.push(sport);
                    if (currentRole !== "captain") newRole = "captain";
                } else if (remove) {
                    newArray = newArray.filter((s) => s !== sport);
                    if (newArray.length === 0) {
                        newRole = "user";
                    }
                }

                const updates: any = { role: newRole };
                if (newArray.length > 0) {
                    updates.sportsCaptainOf = newArray;
                } else {
                    updates.sportsCaptainOf = admin.firestore.FieldValue.delete();
                }

                tx.update(userRef, updates);
            });

            return res.json({ success: true });
        }   catch (err: any) {
                console.error("Error assigning/removing captain:", err);
                if (err.message === "User not found") {
                    return res.status(404).json({ error: "User not found" });
                }
                return res.status(500).json({ error: err.message });
            }
        });
    }
);
