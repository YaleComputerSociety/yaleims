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

/**
 * Files a report against an existing game, with its score read in the same
 * transaction. One open report per person per game, so nobody can flood the
 * admins' queue: a second is refused (409) until an admin resolves the first.
 */
export async function addScoreReport(
  seasonId: string,
  matchId: string,
  report: Pick<ScoreReportDoc, "reason" | "reportedBy" | "reporterName">
): Promise<string> {
  const reports = scoreReportsRef(seasonId, matchId);
  const ref = reports.doc();
  await runTransaction(async (tx) => {
    // Read in the transaction, so simultaneous reports by one person can't both get in.
    const [match, open] = await Promise.all([
      tx.get(matchRef(seasonId, matchId)).then((s) => s.data()),
      tx.get(reports.where("reportedBy", "==", report.reportedBy).where("status", "==", "open").limit(1)),
    ]);
    if (!match) throw new ApiError("not-found", "No such game this season.");
    if (!open.empty) {
      throw new ApiError("conflict", "You've already reported this game's score. An admin will review it; you can report again once it's resolved.");
    }
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
