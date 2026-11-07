// Score reports (a user flags a wrong score):
// seasons/{seasonId}/matches/{matchId}/scoreReports/{reportId}.
import "server-only";
import { FieldValue, type CollectionReference, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { collectionGroups, paths } from "@/lib/paths";
import type { ScoreReportDoc, WithId } from "@/types/firestore";
import { logAction, type Actor } from "./auditLog";
import { runTransaction, withId } from "./util";
import { matchRef } from "./matches";
import { ApiError } from "@/lib/api/core";

/** A game's reports, for services that read them in a transaction. */
export function scoreReportsRef(seasonId: string, matchId: string): CollectionReference<ScoreReportDoc> {
  return adminDb.collection(paths.scoreReports(seasonId, matchId)) as CollectionReference<ScoreReportDoc>;
}

/** A match's reports, newest first. */
export async function listMatchScoreReports(
  seasonId: string,
  matchId: string
): Promise<WithId<ScoreReportDoc>[]> {
  const snap = await scoreReportsRef(seasonId, matchId).orderBy("reportedAt", "desc").get();
  return snap.docs.map((d) => withId<ScoreReportDoc>(d));
}

/** A season's reports across all its matches, newest first. */
export async function listSeasonScoreReports(seasonId: string): Promise<WithId<ScoreReportDoc>[]> {
  const snap = await adminDb
    .collectionGroup(collectionGroups.scoreReports)
    .where("seasonId", "==", seasonId)
    .orderBy("reportedAt", "desc")
    .get();
  return snap.docs.map((d) => withId<ScoreReportDoc>(d));
}

/** Files a report against an existing game, with its score read in the same transaction. */
export async function addScoreReport(
  seasonId: string,
  matchId: string,
  report: Pick<ScoreReportDoc, "reason" | "reportedBy" | "reporterName">
): Promise<string> {
  const ref = scoreReportsRef(seasonId, matchId).doc();
  await runTransaction(async (tx) => {
    const match = (await tx.get(matchRef(seasonId, matchId))).data();
    if (!match) throw new ApiError("not-found", "No such game this season.");
    tx.create(ref, {
      seasonId,
      matchId,
      ...report,
      reportedAt: FieldValue.serverTimestamp(),
      scoreAtReport: { home: match.result?.homeScore ?? null, away: match.result?.awayScore ?? null },
      status: "open",
      resolvedBy: null,
      resolvedAt: null,
    });
  });
  return ref.id;
}

/** Marks a report resolved (audit-logged). False if it doesn't exist. */
export async function resolveScoreReport(
  seasonId: string,
  matchId: string,
  reportId: string,
  actor: Actor
): Promise<boolean> {
  const ref = adminDb.doc(paths.scoreReport(seasonId, matchId, reportId)) as DocumentReference<ScoreReportDoc>;
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    tx.update(ref, {
      status: "resolved",
      resolvedBy: actor.userId,
      resolvedAt: FieldValue.serverTimestamp(),
    });
    logAction(tx, seasonId, {
      actor,
      action: "resolveScoreReport",
      params: { matchId, reportId },
      changed: [snap],
    });
    return true;
  });
}
