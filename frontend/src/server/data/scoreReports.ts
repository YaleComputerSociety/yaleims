// Score reports (users flag a wrong score):
// matches/score_reports/{seasonId}/{matchId}/reports/{reportId}.
import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { collectionGroups, paths, scoreReportPathIds } from "@/lib/paths";
import { WithId, withId } from "./util";

export interface ScoreReportDoc {
  reason: string;
  reportedBy: string;
  reportedByEmail: string;
  reportedAt: Timestamp;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  season: string;
  matchId: string;
  matchHomeCollege: string | null;
  matchAwayCollege: string | null;
  homeScore: number | null;
  awayScore: number | null;
  sport: string | null;
}

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
    .collection(paths.scoreReports(seasonId, matchId))
    .orderBy("reportedAt", "desc")
    .get();
  return snap.docs.map((d) => withId<ScoreReportDoc>(d));
}

/** A season's reports across all matches, newest first. */
export async function listSeasonScoreReports(
  seasonId: string
): Promise<WithId<ScoreReportDoc>[]> {
  const snap = await adminDb
    .collectionGroup(collectionGroups.scoreReports)
    .orderBy("reportedAt", "desc")
    .get();
  return snap.docs
    .filter((d) => scoreReportPathIds(d.ref.path).seasonId === seasonId)
    .map((d) => {
      const report = withId<ScoreReportDoc>(d);
      return {
        ...report,
        matchId: report.matchId ?? scoreReportPathIds(d.ref.path).matchId,
      };
    });
}

/** Files an unresolved report; returns its id. */
export async function addScoreReport(
  seasonId: string,
  matchId: string,
  report: NewScoreReport
): Promise<string> {
  const ref = await adminDb.collection(paths.scoreReports(seasonId, matchId)).add({
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
  await adminDb.doc(paths.scoreReport(seasonId, matchId, reportId)).update({
    resolved: true,
    resolvedBy,
    resolvedAt: FieldValue.serverTimestamp(),
  });
}
