// The score reports API: a user flags a wrong score on a game
// (/api/seasons/{s}/matches/{m}/reports), admins resolve them; the season's
// reports for the admin page (/api/seasons/{s}/reports).
import { z } from "zod";
import type { ScoreReportDoc, WithId } from "@/types/firestore";
import { request, toJson, url, type Json } from "./core";
import type { Match } from "./matches";

export type ScoreReport = Json<WithId<ScoreReportDoc>>;

/** Who resolved a report, by name (null: not resolved, or not a known user). */
interface Resolver {
  resolverName: string | null;
}

/**
 * GET …/matches/{m}/reports: everyone signed in sees reports without the
 * emails; admins whole.
 */
export type MatchScoreReport = Json<WithId<Omit<ScoreReportDoc, "reportedBy" | "resolvedBy">>> &
  Partial<Pick<ScoreReport, "reportedBy" | "resolvedBy">> &
  Resolver;

export function toMatchScoreReport(
  report: WithId<ScoreReportDoc>,
  withEmails: boolean,
  resolverName: string | null
): MatchScoreReport {
  const { reportedBy, resolvedBy, ...rest } = report;
  return { ...toJson(withEmails ? { ...rest, reportedBy, resolvedBy } : rest), resolverName };
}

/** GET /api/seasons/{s}/reports (admins): each report with its game and the resolver's name. */
export type SeasonScoreReport = ScoreReport & { match: Match | null } & Resolver;

export interface ScoreReportList<T> {
  items: T[];
  total: number;
}

/** POST …/matches/{m}/reports: what's wrong. The score the reporter saw is the game's, read by the server. */
export const newReportSchema = z.strictObject({ reason: z.string().trim().min(1).max(1000) });
export type NewReport = z.infer<typeof newReportSchema>;

/** PATCH …/reports/{r} (admins). */
export const reportChangeSchema = z.strictObject({ status: z.literal("resolved") });

export const seasonReportsQuerySchema = z.strictObject({ status: z.enum(["open", "resolved"]).optional() });
export type SeasonReportsQuery = z.input<typeof seasonReportsQuerySchema>;

export const fetchMatchReports = (seasonId: string, matchId: string) =>
  request<ScoreReportList<MatchScoreReport>>("GET", url`/api/seasons/${seasonId}/matches/${matchId}/reports`);

export const reportScore = (seasonId: string, matchId: string, report: NewReport) =>
  request<{ id: string }>("POST", url`/api/seasons/${seasonId}/matches/${matchId}/reports`, { body: report });

export const resolveReport = (seasonId: string, matchId: string, reportId: string) =>
  request<void>("PATCH", url`/api/seasons/${seasonId}/matches/${matchId}/reports/${reportId}`, {
    body: { status: "resolved" },
  });

export const fetchSeasonReports = (seasonId: string, query: SeasonReportsQuery = {}) =>
  request<ScoreReportList<SeasonScoreReport>>("GET", url`/api/seasons/${seasonId}/reports`, { query });
