// Every Firestore path the app uses, in one place. Plain strings, so both the
// Admin SDK on the server (src/server/data) and the browser SDK (live
// listeners) can use them: adminDb.doc(p), doc(db, p), collection(db, p).
// The Phase 2 schema changes these builders and src/server/data, nothing else.

/** One path segment; throws if it would change the path's shape. */
function seg(value: string | number): string {
  const s = String(value);
  if (s === "" || s.includes("/")) {
    throw new Error(`Invalid Firestore path segment: "${s}"`);
  }
  return s;
}

export const paths = {
  users: "users",
  user: (email: string) => `users/${seg(email)}`,
  userSeason: (email: string, seasonId: string) =>
    `users/${seg(email)}/seasons/${seg(seasonId)}`,

  currentSeason: "seasons/current",
  pastSeasons: "seasons/past",

  /** Placeholder doc whose subcollections are the seasons' matches. */
  matchSeasons: "matches/seasons",
  matches: (seasonId: string) => `matches/seasons/${seg(seasonId)}`,
  match: (seasonId: string, matchId: string | number) =>
    `matches/seasons/${seg(seasonId)}/${seg(matchId)}`,

  scoreReports: (seasonId: string, matchId: string | number) =>
    `matches/score_reports/${seg(seasonId)}/${seg(matchId)}/reports`,
  scoreReport: (seasonId: string, matchId: string | number, reportId: string) =>
    `matches/score_reports/${seg(seasonId)}/${seg(matchId)}/reports/${seg(reportId)}`,

  collegeStandings: (seasonId: string) => `colleges/seasons/${seg(seasonId)}`,
  collegeStanding: (seasonId: string, abbr: string) =>
    `colleges/seasons/${seg(seasonId)}/${seg(abbr)}`,

  bracket: (seasonId: string, sport: string) =>
    `brackets/seasons/${seg(seasonId)}/${seg(sport)}`,

  tournaments: (seasonId: string) => `tournaments/seasons/${seg(seasonId)}`,
  tournament: (seasonId: string, tournamentId: string) =>
    `tournaments/seasons/${seg(seasonId)}/${seg(tournamentId)}`,

  collegeMvps: (seasonId: string, college: string) =>
    `mvps/${seg(seasonId)}/${seg(college)}`,
  collegeMvp: (seasonId: string, college: string, weekId: string) =>
    `mvps/${seg(seasonId)}/${seg(college)}/${seg(weekId)}`,
};

/** Collection-group ids (queries across every collection with that id). */
export const collectionGroups = {
  /** matches/score_reports/{seasonId}/{matchId}/reports/{reportId} */
  scoreReports: "reports",
};

/** seasonId and matchId of a score report, from its document path. */
export function scoreReportPathIds(path: string): {
  seasonId: string;
  matchId: string;
} {
  const parts = path.split("/");
  return { seasonId: parts[2] ?? "", matchId: parts[3] ?? "" };
}
