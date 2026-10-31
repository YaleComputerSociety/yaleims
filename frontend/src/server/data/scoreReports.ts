// Score reports (users flag a wrong score):
// matches/score_reports/{seasonId}/{matchId}/reports/{reportId}.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { legacyPaths, legacyScoreReportPathIds } from "@/lib/paths";
import type { ScoreReportDoc, WithId } from "@/types/legacy";
import { withId } from "./util";

export type NewScoreReport = Omit<
  ScoreReportDoc,
  "reportedAt" | "resolved" | "resolvedBy" | "resolvedAt" | "season" | "matchId"
>;

/** A match's reports, newest first. */
export async function listMatchScoreReports(
  seasonId: string,
  matchId: string
): Promise<WithId<ScoreReportDoc>[]> {
  const snap = await adminDb
    .collection(legacyPaths.scoreReports(seasonId, matchId))
    .orderBy("reportedAt", "desc")
    .get();
  return snap.docs.map((d) => withId<ScoreReportDoc>(d));
}

/** A season's reports across all matches, newest first. */
export async function listSeasonScoreReports(
  seasonId: string
): Promise<WithId<ScoreReportDoc>[]> {
  const snap = await adminDb
    .collectionGroup(legacyPaths.scoreReportsGroup)
    .orderBy("reportedAt", "desc")
    .get();
  return snap.docs
    .filter((d) => legacyScoreReportPathIds(d.ref.path).seasonId === seasonId)
    .map((d) => {
      const report = withId<ScoreReportDoc>(d);
      return {
        ...report,
        matchId: report.matchId ?? legacyScoreReportPathIds(d.ref.path).matchId,
      };
    });
}

/** Files an unresolved report; returns its id. */
export async function addScoreReport(
  seasonId: string,
  matchId: string,
  report: NewScoreReport
): Promise<string> {
  const ref = await adminDb.collection(legacyPaths.scoreReports(seasonId, matchId)).add({
    ...report,
    reportedAt: FieldValue.serverTimestamp(),
    resolved: false,
    season: seasonId,
    matchId,
  });
  return ref.id;
}

/** Marks a report resolved. Throws if it doesn't exist. */
export async function resolveScoreReport(
  seasonId: string,
  matchId: string,
  reportId: string,
  resolvedBy: string
): Promise<void> {
  await adminDb.doc(legacyPaths.scoreReport(seasonId, matchId, reportId)).update({
    resolved: true,
    resolvedBy,
    resolvedAt: FieldValue.serverTimestamp(),
  });
}
