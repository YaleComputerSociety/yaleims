// Sports: sports/{id}, looked up by name (match docs store the sport's name).
import "server-only";
import type { Transaction } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";

/**
 * points_for_win of the sport named `name` (0 if unset). Throws if no sport
 * has that name. Pass `tx` to read inside a transaction.
 */
export async function getPointsForWin(name: string, tx?: Transaction): Promise<number> {
  const query = adminDb.collection(paths.sports).where("name", "==", name);
  const snap = tx ? await tx.get(query) : await query.get();
  if (snap.empty) {
    throw new Error(`No sport found with the name: ${name}`);
  }
  return snap.docs[0].data().points_for_win || 0;
}
