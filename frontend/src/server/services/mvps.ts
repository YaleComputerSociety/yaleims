// MVP eligibility and the recipient's identity belong in the award transaction.
// Reading the player here coordinates with placeholder claims/deletion.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import type { MvpDoc } from "@/types/firestore";
import { mvpsRef } from "../data/mvps";
import { playerRef } from "../data/players";
import { runTransaction } from "../data/util";

/** False if the recipient is no longer a player of this college that season. */
export async function setMvp(
  seasonId: string,
  collegeId: string,
  award: Pick<MvpDoc, "week" | "playerId" | "awardedBy">
): Promise<boolean> {
  const awards = mvpsRef(seasonId, collegeId);
  return runTransaction(async (tx) => {
    const player = (await tx.get(playerRef(seasonId, award.playerId))).data();
    if (!player || player.collegeId !== collegeId) return false;
    const existing = await tx.get(
      awards.where("week", "==", award.week).where("playerId", "==", award.playerId).limit(1)
    );
    const fields = { ...award, name: player.name, awardedAt: FieldValue.serverTimestamp() };
    if (existing.empty) tx.create(awards.doc(), { seasonId, collegeId, ...fields });
    else tx.update(existing.docs[0].ref, fields);
    return true;
  });
}
