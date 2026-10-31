// Reads every pre-v3 collection the migration needs (REDESIGN.md section 4,
// "Field-by-field mapping"). Reads only. Bets, Elo, API keys and other frozen
// data are not read.
import type { DocumentSnapshot, Firestore, Timestamp } from "firebase-admin/firestore";
import type * as Old from "../../../frontend/src/types/legacy";

/** A document as read: data plus Firestore's own create and update times. */
export interface OldDoc<T> {
  path: string;
  id: string;
  data: T;
  createTime: Timestamp;
  updateTime: Timestamp;
}

export interface OldData {
  current: Old.CurrentSeasonDoc | null;
  pastYears: string[];
  sports: OldDoc<Old.SportDoc>[];
  /** By season id. */
  matches: Map<string, OldDoc<Old.MatchDoc>[]>;
  standings: Map<string, OldDoc<Old.CollegeStandingDoc>[]>;
  brackets: Map<string, OldDoc<Old.BracketDoc>[]>;
  tournaments: Map<string, OldDoc<Old.TournamentDoc>[]>;
  mvps: { seasonId: string; collegeName: string; weekId: string; doc: OldDoc<Old.MvpWeekDoc> }[];
  scoreReports: { seasonId: string; matchId: string; doc: OldDoc<Old.ScoreReportDoc> }[];
  users: OldDoc<Old.UserDoc & Record<string, unknown>>[];
  userSeasons: { email: string; seasonId: string; doc: OldDoc<Old.UserSeasonDoc> }[];
  usernames: OldDoc<{ email?: unknown; userId?: unknown }>[];
}

function oldDoc<T>(snap: DocumentSnapshot): OldDoc<T> {
  return {
    path: snap.ref.path,
    id: snap.id,
    data: snap.data() as T,
    createTime: snap.createTime!,
    updateTime: snap.updateTime!,
  };
}

/** Every doc of each subcollection of `parentPath` (a doc that may not exist), by subcollection id. */
async function readSubcollections<T>(
  db: Firestore,
  parentPath: string
): Promise<Map<string, OldDoc<T>[]>> {
  const collections = await db.doc(parentPath).listCollections();
  const result = new Map<string, OldDoc<T>[]>();
  for (const col of collections) {
    const snap = await col.get();
    result.set(col.id, snap.docs.map((d) => oldDoc<T>(d)));
  }
  return result;
}

export async function readOldData(db: Firestore): Promise<OldData> {
  const [currentSnap, pastSnap, sportsSnap] = await Promise.all([
    db.doc("seasons/current").get(),
    db.doc("seasons/past").get(),
    db.collection("sports").get(),
  ]);
  const pastYears = pastSnap.get("years");

  const [matches, standings, brackets, tournaments] = await Promise.all([
    readSubcollections<Old.MatchDoc>(db, "matches/seasons"),
    readSubcollections<Old.CollegeStandingDoc>(db, "colleges/seasons"),
    readSubcollections<Old.BracketDoc>(db, "brackets/seasons"),
    readSubcollections<Old.TournamentDoc>(db, "tournaments/seasons"),
  ]);

  // mvps/{seasonId}/{college name}/{weekId}; the season docs may not exist.
  const mvps: OldData["mvps"] = [];
  for (const seasonRef of await db.collection("mvps").listDocuments()) {
    for (const col of await seasonRef.listCollections()) {
      for (const d of (await col.get()).docs) {
        mvps.push({
          seasonId: seasonRef.id,
          collegeName: col.id,
          weekId: d.id,
          doc: oldDoc<Old.MvpWeekDoc>(d),
        });
      }
    }
  }

  // matches/score_reports/{seasonId}/{matchId}/reports/{reportId}
  const scoreReports: OldData["scoreReports"] = [];
  for (const d of (await db.collectionGroup("reports").get()).docs) {
    const parts = d.ref.path.split("/");
    if (parts.length === 6 && parts[0] === "matches" && parts[1] === "score_reports") {
      scoreReports.push({ seasonId: parts[2], matchId: parts[3], doc: oldDoc(d) });
    }
  }

  const usersSnap = await db.collection("users").get();
  // users/{email}/seasons/{seasonId}. The collection id "seasons" is also the
  // top-level seasons collection; keep only the user-season paths.
  const userSeasons: OldData["userSeasons"] = [];
  for (const d of (await db.collectionGroup("seasons").get()).docs) {
    const parts = d.ref.path.split("/");
    if (parts.length === 4 && parts[0] === "users") {
      userSeasons.push({ email: parts[1], seasonId: parts[3], doc: oldDoc(d) });
    }
  }
  const usernamesSnap = await db.collection("usernames").get();

  return {
    current: currentSnap.exists ? (currentSnap.data() as Old.CurrentSeasonDoc) : null,
    pastYears: Array.isArray(pastYears) ? pastYears.filter((y) => typeof y === "string") : [],
    sports: sportsSnap.docs.map((d) => oldDoc<Old.SportDoc>(d)),
    matches,
    standings,
    brackets,
    tournaments,
    mvps,
    scoreReports,
    users: usersSnap.docs.map((d) => oldDoc(d)),
    userSeasons,
    usernames: usernamesSnap.docs.map((d) => oldDoc(d)),
  };
}
