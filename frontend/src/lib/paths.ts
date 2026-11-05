// Every Firestore path the app uses, in one place. Plain strings, so both the
// Admin SDK on the server (src/server/data) and the browser SDK (live
// listeners) can use them: adminDb.doc(p), doc(db, p), collection(db, p).
// The tree is schema v3; document types live in types/firestore.ts.

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
const auditLogEntry = (seasonId: string, entryId: string) =>
  `${season(seasonId)}/auditLog/${seg(entryId)}`;

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
  auditLogEntry,
  auditPayloadChunk: (seasonId: string, entryId: string, part: string) =>
    `${auditLogEntry(seasonId, entryId)}/auditPayloadChunks/${seg(part)}`,
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
