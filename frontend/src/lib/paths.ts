// Every Firestore path the app uses, in one place. Plain strings, so both the
// Admin SDK on the server (src/server/data) and the browser SDK (live
// listeners) can use them: adminDb.doc(p), doc(db, p), collection(db, p).
// The tree is schema v3 (REDESIGN.md section 4; documents in types/firestore.ts).

/** One path segment; throws if it would change the path's shape. */
function seg(value: string | number): string {
  const s = String(value);
  if (s === "" || s.includes("/")) {
    throw new Error(`Invalid Firestore path segment: "${s}"`);
  }
  return s;
}

const season = (seasonId: string) => `seasons/${seg(seasonId)}`;
const college = (seasonId: string, collegeId: string) =>
  `${season(seasonId)}/colleges/${seg(collegeId)}`;
const match = (seasonId: string, matchId: string | number) =>
  `${season(seasonId)}/matches/${seg(matchId)}`;

export const paths = {
  /** { currentSeasonId, features } */
  appConfig: "config/app",

  users: "users",
  user: (email: string) => `users/${seg(email)}`,
  /** Taken usernames: usernames/{username} = { userId }. */
  username: (username: string) => `usernames/${seg(username)}`,
  /** { count }: how many usernames have been generated (the number in them). */
  usernameCounter: "counters/usernames",

  /** Season docs; also holds the frozen pre-v3 docs "current" and "past". */
  seasons: "seasons",
  season,

  sports: (seasonId: string) => `${season(seasonId)}/sports`,
  sport: (seasonId: string, sportId: string) =>
    `${season(seasonId)}/sports/${seg(sportId)}`,

  colleges: (seasonId: string) => `${season(seasonId)}/colleges`,
  college,
  teams: (seasonId: string, collegeId: string) => `${college(seasonId, collegeId)}/teams`,
  team: (seasonId: string, collegeId: string, sportId: string) =>
    `${college(seasonId, collegeId)}/teams/${seg(sportId)}`,
  mvps: (seasonId: string, collegeId: string) => `${college(seasonId, collegeId)}/mvps`,
  mvp: (seasonId: string, collegeId: string, awardId: string) =>
    `${college(seasonId, collegeId)}/mvps/${seg(awardId)}`,

  players: (seasonId: string) => `${season(seasonId)}/players`,
  player: (seasonId: string, playerId: string) =>
    `${season(seasonId)}/players/${seg(playerId)}`,

  matches: (seasonId: string) => `${season(seasonId)}/matches`,
  match,
  roster: (seasonId: string, matchId: string | number) => `${match(seasonId, matchId)}/roster`,
  rosterEntry: (seasonId: string, matchId: string | number, playerId: string) =>
    `${match(seasonId, matchId)}/roster/${seg(playerId)}`,
  scoreReports: (seasonId: string, matchId: string | number) =>
    `${match(seasonId, matchId)}/scoreReports`,
  scoreReport: (seasonId: string, matchId: string | number, reportId: string) =>
    `${match(seasonId, matchId)}/scoreReports/${seg(reportId)}`,

  brackets: (seasonId: string) => `${season(seasonId)}/brackets`,
  bracket: (seasonId: string, bracketId: string) =>
    `${season(seasonId)}/brackets/${seg(bracketId)}`,

  auditLog: (seasonId: string) => `${season(seasonId)}/auditLog`,
};

/**
 * Collection-group ids (queries across every collection with that id). Each
 * is used by no other collection in the database (D29).
 */
export const collectionGroups = {
  roster: "roster",
  teams: "teams",
  players: "players",
  scoreReports: "scoreReports",
};

// ── Pre-v3 paths, until every module has moved to v3 (then they move to the
// migration, database/migrate, their only remaining user). ──────────────────

export const legacyPaths = {
  userSeason: (email: string, seasonId: string) =>
    `users/${seg(email)}/seasons/${seg(seasonId)}`,

  currentSeason: "seasons/current",
  pastSeasons: "seasons/past",

  /** Placeholder doc whose subcollections are the seasons' matches. */
  matchSeasons: "matches/seasons",
  matches: (seasonId: string) => `matches/seasons/${seg(seasonId)}`,
  match: (seasonId: string, matchId: string | number) =>
    `matches/seasons/${seg(seasonId)}/${seg(matchId)}`,

  /** { count }: the last match id handed out (D22). */
  matchIdCounter: "counters/matches",

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

  sports: "sports",

  collegeMvps: (seasonId: string, college: string) =>
    `mvps/${seg(seasonId)}/${seg(college)}`,
  collegeMvp: (seasonId: string, college: string, weekId: string) =>
    `mvps/${seg(seasonId)}/${seg(college)}/${seg(weekId)}`,

  /** Collection-group id of matches/score_reports/{seasonId}/{matchId}/reports/{reportId}. */
  scoreReportsGroup: "reports",
};

/** seasonId and matchId of a pre-v3 score report, from its document path. */
export function legacyScoreReportPathIds(path: string): {
  seasonId: string;
  matchId: string;
} {
  const parts = path.split("/");
  return { seasonId: parts[2] ?? "", matchId: parts[3] ?? "" };
}
