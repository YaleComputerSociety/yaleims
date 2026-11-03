// The local dev dataset: a made-up league (no real people) loaded into the
// Firestore EMULATOR. Two seasons, the real colleges and sports, fictional
// players (player001@example.edu …), games with results, playoffs with byes,
// tournaments, sign-ups, score reports and MVPs. Game dates are placed
// relative to today, so there are always recent results and upcoming games.
//
// Simple records (people, colleges, sports) are written directly. Games,
// results and brackets go through the app's own services (src/server), so
// standings, team records and bracket advancement are exactly what the app
// would produce, audit log included.
//
//   npm run emulator           (repo/database: Firestore emulator on :8080)
//   npm run seed               (this script; wipes the emulator first)
//   npm run dev:emulator       (the app on the emulator)
//   npm run dev:token -- dev@example.edu   (a session cookie to sign in as someone)
//
// Refuses to run unless FIRESTORE_EMULATOR_HOST is set: it can never write to
// production. Deterministic apart from the dates and the auto ids (seeded
// random numbers, handed out to games in a fixed order).
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { BracketSlotInput } from "@/lib/api/brackets";
import type { Actor } from "@/server/data/auditLog";
import type { MatchDoc, PlayerDoc, RosterEntryDoc, SeasonRole, SportDoc, Term, UserDoc } from "@/types/firestore";

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host) {
  console.error("Refusing to run: FIRESTORE_EMULATOR_HOST is not set (this script only writes to the emulator).");
  process.exit(1);
}
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= "yims-125a2";
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// The app's modules read the environment when they load, so they come after the guard.
const { FieldValue, Timestamp } = await import("firebase-admin/firestore");
const { adminDb } = await import("@/server/firebaseAdmin");
const { paths } = await import("@/lib/paths");
const { COLLEGES } = await import("@/lib/colleges");
const { easternDate } = await import("@/lib/dates");
const { playoffsName, bracketIdOf } = await import("@/lib/brackets");
const { addSchedule } = await import("@/server/services/schedule");
const { scoreMatch } = await import("@/server/services/scoring");
const { createBracket } = await import("@/server/services/brackets");
const { setCaptain } = await import("@/server/services/roles");
const { signUp } = await import("@/server/services/signups");
const { addScoreReport, resolveScoreReport } = await import("@/server/data/scoreReports");
const { setMvp } = await import("@/server/data/mvps");

// ── Reference data ─────────────────────────────────────────────────────────

/** The league's sports (ids as in production, the same every season). */
const SPORTS: (SportDoc & { id: string })[] = [
  { id: "1", name: "Soccer", emoji: "⚽", term: "fall", pointsForWin: 11, active: true },
  { id: "2", name: "Flag Football", emoji: "🏈", term: "fall", pointsForWin: 6, active: true },
  { id: "3", name: "Spikeball", emoji: "💥", term: "fall", pointsForWin: 6, active: true },
  { id: "4", name: "Cornhole", emoji: "🌽", term: "fall", pointsForWin: 6, active: true },
  { id: "5", name: "Pickleball", emoji: "🥒", term: "fall", pointsForWin: 6, active: true },
  { id: "6", name: "Table Tennis", emoji: "🏓", term: "fall", pointsForWin: 8, active: true },
  { id: "7", name: "Broomball", emoji: "🧹", term: "winter", pointsForWin: 6, active: true },
  { id: "10", name: "Dodgeball", emoji: "🤾‍♂️", term: "winter", pointsForWin: 8, active: true },
  { id: "13", name: "CHoops", emoji: "🏀", term: "winter", pointsForWin: 5, active: true },
  { id: "14", name: "MHoops", emoji: "M🏀", term: "winter", pointsForWin: 5, active: true },
  { id: "15", name: "WHoops", emoji: "W🏀", term: "winter", pointsForWin: 5, active: true },
  { id: "8", name: "Kanjam", emoji: "🥏", term: "spring", pointsForWin: 6, active: true },
  { id: "9", name: "Indoor Soccer", emoji: "⚽", term: "spring", pointsForWin: 5, active: true },
  { id: "11", name: "Volleyball", emoji: "🏐", term: "spring", pointsForWin: 6, active: true },
  { id: "12", name: "Netball", emoji: "🥅", term: "spring", pointsForWin: 7, active: true },
];
const TERMS: Term[] = ["fall", "winter", "spring"];
const VENUES = ["Pierson-Sage Fields", "Payne Whitney Gym", "Lanman Center", "Morse-Stiles Crescent"];
const FIRST = ["Alex", "Blair", "Casey", "Dana", "Eli", "Frankie", "Gray", "Harper", "Indy", "Jordan", "Kai", "Logan", "Morgan", "Noor", "Oakley", "Parker", "Quinn", "Riley", "Sage", "Taylor", "Uma", "Val", "Wren", "Yael"];
const LAST = ["Abbott", "Baker", "Chen", "Diaz", "Evans", "Foster", "Garcia", "Hughes", "Ito", "Jensen", "Khan", "Lopez", "Morris", "Nguyen", "Okafor", "Patel", "Reyes", "Silva", "Turner", "Vance", "Walsh", "Young"];

/** Seeded random numbers (mulberry32), so every load has the same scores and names. */
let state = 20261101;
function random(): number {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)];

// ── Dates (relative to today) ──────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const today = new Date();
today.setHours(0, 0, 0, 0);
/** A day relative to today, at `hour` local time. */
const dayAt = (offset: number, hour = 19) => new Date(today.getTime() + offset * DAY + hour * 60 * 60 * 1000);

// Seasons run July to June; the current one started on the last July 1.
const startYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
const CURRENT = `${startYear}-${startYear + 1}`;
const PREVIOUS = `${startYear - 1}-${startYear}`;
const month = today.getMonth();
const currentTerm: Term = month >= 6 ? "fall" : month < 2 ? "winter" : "spring";
/** When a past term's games were played: [first day, last day] in that season. */
const termWindow = (season: number, term: Term): [Date, Date] =>
  term === "fall" ? [new Date(season, 8, 8), new Date(season, 10, 20)]
  : term === "winter" ? [new Date(season + 1, 0, 12), new Date(season + 1, 1, 25)]
  : [new Date(season + 1, 2, 2), new Date(season + 1, 3, 25)];

// ── People ─────────────────────────────────────────────────────────────────

interface Person { email: string; firstname: string; lastname: string; collegeId: string }
const PER_COLLEGE = 8;
/** Current students: 8 per college; the first of each is the college rep. */
const students: Person[] = COLLEGES.flatMap((c, ci) =>
  Array.from({ length: PER_COLLEGE }, (_, i) => ({
    email: `player${String(ci * PER_COLLEGE + i + 1).padStart(3, "0")}@example.edu`,
    firstname: pick(FIRST),
    lastname: pick(LAST),
    collegeId: c.id,
  }))
);
/** Last season's students who graduated: accounts without a current season. */
const alumni: Person[] = COLLEGES.map((c, ci) => ({
  email: `alum${String(ci + 1).padStart(2, "0")}@example.edu`, firstname: pick(FIRST), lastname: pick(LAST), collegeId: c.id,
}));
const dev: Person = { email: "dev@example.edu", firstname: "Devon", lastname: "Admin", collegeId: "BF" };
const supervisor: Person = { email: "supervisor@example.edu", firstname: "Sam", lastname: "Referee", collegeId: "SY" };
const reps = new Set(COLLEGES.map((_, ci) => students[ci * PER_COLLEGE].email));
const SEED_ACTOR: Actor = { userId: dev.email, roles: ["user", "admin", "dev"] };
const fullName = (p: Person) => `${p.firstname} ${p.lastname}`;

// ── Writing ────────────────────────────────────────────────────────────────

/** Sets many docs in batches (the emulator takes 500 writes per batch). */
async function setAll(docs: [string, object][]): Promise<void> {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = adminDb.batch();
    for (const [path, data] of docs.slice(i, i + 400)) batch.set(adminDb.doc(path), data);
    await batch.commit();
  }
}

async function wipe(): Promise<void> {
  const res = await fetch(`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Could not clear the emulator: ${res.status}`);
}

/** Config, both seasons, their sports and colleges, users, usernames and players. */
async function writeLeague(): Promise<void> {
  const now = Timestamp.now();
  const docs: [string, object][] = [[paths.appConfig, { currentSeasonId: CURRENT, features: { myStats: false } }]];
  for (const [seasonId, year] of [[PREVIOUS, startYear - 1], [CURRENT, startYear]] as const) {
    docs.push([paths.season(seasonId), {
      label: seasonId, startYear: year, currentTerm: seasonId === CURRENT ? currentTerm : "spring",
      championCollegeId: null, celebrationActive: false, championshipUpdatedAt: null,
    }]);
    for (const { id, ...sport } of SPORTS) docs.push([paths.sport(seasonId, id), sport]);
    COLLEGES.forEach((c, i) => docs.push([paths.college(seasonId, c.id), {
      name: c.name, abbreviation: c.id, rank: i + 1, prevRank: i + 1, rankDate: easternDate(today),
      points: 0, games: 0, wins: 0, losses: 0, ties: 0, forfeits: 0,
    }]));
  }
  const everyone = [...students, ...alumni, dev, supervisor];
  everyone.forEach((p, i) => {
    const username = `${p.firstname}${p.lastname}${i + 1}`;
    const user: UserDoc = {
      email: p.email, firstname: p.firstname, lastname: p.lastname, username,
      // NetIDs like Yale's (initials + digits); the dev and the supervisor have none
      // recorded yet, as users from before NetIDs were kept.
      netid: p === dev || p === supervisor ? null : `${p.firstname[0]}${p.lastname[0]}${100 + i}`.toLowerCase(),
      roles: p === dev ? ["admin", "dev"] : [], claimedAt: now, createdBy: null,
    };
    docs.push([paths.user(p.email), user], [paths.username(username), { userId: p.email }]);
  });
  docs.push([paths.usernameCounter, { count: everyone.length }]);
  const player = (seasonId: string, p: Person, roles: SeasonRole[]): [string, PlayerDoc] => [paths.player(seasonId, p.email), {
    seasonId, collegeId: p.collegeId, name: fullName(p), userId: p.email, roles, joinedAt: now, joinedVia: "login",
  }];
  // Current season: every student, the dev and the supervisor. Last season:
  // the first half of each college's students, and the alumni.
  for (const p of students) docs.push(player(CURRENT, p, reps.has(p.email) ? ["college_rep"] : []));
  docs.push(player(CURRENT, dev, []), player(CURRENT, supervisor, ["supervisor"]));
  students.filter((_, i) => i % PER_COLLEGE < PER_COLLEGE / 2).forEach((p) => docs.push(player(PREVIOUS, p, [])));
  for (const p of alumni) docs.push(player(PREVIOUS, p, []));
  await setAll(docs);
}

// ── Games ──────────────────────────────────────────────────────────────────

const ids = COLLEGES.map((c) => c.id);
/** Round `r` of a round robin: 7 pairings covering all 14 colleges (circle method). */
function pairings(r: number): [string, string][] {
  const rest = ids.slice(1);
  const rotated = [ids[0], ...rest.slice(r % rest.length), ...rest.slice(0, r % rest.length)];
  return Array.from({ length: 7 }, (_, i) => [rotated[i], rotated[13 - i]] as [string, string]);
}

/** Adds a sport's regular season (3 games a week) between two dates, through the schedule service. */
async function schedule(seasonId: string, sport: SportDoc & { id: string }, from: Date, to: Date): Promise<void> {
  const games = [];
  for (let week = 0, start = from.getTime(); start <= to.getTime(); week++, start += 7 * DAY) {
    for (const [i, [home, away]] of pairings(week).slice(0, 3).entries()) {
      const when = new Date(start + i * DAY);
      when.setHours(18 + i, 0, 0, 0);
      games.push({ startsAt: when.toISOString(), homeCollegeId: home, awayCollegeId: away, venue: pick(VENUES), venueDetail: `Field ${i + 1}` });
    }
  }
  const result = await addSchedule(seasonId, sport.id, games, SEED_ACTOR);
  if (result.status !== "added") throw new Error(`${seasonId} ${sport.name}: ${JSON.stringify(result)}`);
}

/** A plausible result: mostly wins, some draws, a few forfeits and a double forfeit. */
function randomResult(sportName: string) {
  const roll = random();
  const high = sportName === "Soccer" || sportName === "Indoor Soccer" ? 5 : 21;
  const a = Math.floor(random() * high);
  const b = Math.floor(random() * high);
  if (roll < 0.04) return { homeScore: 0, awayScore: 0, homeForfeit: true, awayForfeit: true };
  if (roll < 0.1) return { homeScore: 0, awayScore: 1, homeForfeit: true, awayForfeit: false };
  if (roll < 0.18) return { homeScore: a, awayScore: a, homeForfeit: false, awayForfeit: false };
  return { homeScore: Math.max(a, b) + 1, awayScore: Math.min(a, b), homeForfeit: false, awayForfeit: false };
}

/**
 * Games in a fixed order: by start, then sport, home college, bracket and
 * slot. A query's own order isn't fixed: games at the same time are ordered
 * by their auto ids, which are new on every load (and the random results are
 * handed out in this order).
 */
function inFixedOrder(docs: QueryDocumentSnapshot[]): QueryDocumentSnapshot[] {
  const game = (doc: QueryDocumentSnapshot) => doc.data() as MatchDoc;
  return [...docs].sort((a, b) => {
    const [x, y] = [game(a), game(b)];
    return (
      x.startsAt.toMillis() - y.startsAt.toMillis() ||
      x.sportId.localeCompare(y.sportId) ||
      (x.homeCollegeId ?? "").localeCompare(y.homeCollegeId ?? "") ||
      (x.bracketId ?? "").localeCompare(y.bracketId ?? "") ||
      (x.bracketSlot ?? 0) - (y.bracketSlot ?? 0)
    );
  });
}

/** Scores the season's regular games that have been played, through the scoring service (standings, ranks). */
async function scorePlayed(seasonId: string, sportNames: Map<string, string>): Promise<number> {
  const games = inFixedOrder((await adminDb.collection(paths.matches(seasonId))
    .where("status", "==", "scheduled").where("startsAt", "<", new Date()).orderBy("startsAt", "asc").get()).docs);
  // This season's four most recent games wait for their scores (the "add scores" page).
  const toScore = seasonId === CURRENT ? games.slice(0, -4) : games;
  let scored = 0;
  for (const g of toScore) {
    const game = g.data() as MatchDoc;
    const outcome = await scoreMatch({ seasonId, matchId: g.id, ...randomResult(sportNames.get(game.sportId)!) }, SEED_ACTOR);
    if (outcome !== "scored") throw new Error(`${seasonId}/${g.id}: ${outcome}`);
    scored++;
  }
  return scored;
}

// ── Brackets ───────────────────────────────────────────────────────────────

/**
 * A bracket as the upload sends it: the first round's 12 colleges in 6 games
 * (slots 2–4, 8–10) with the top two seeds on byes (slots 1 and 7), and the
 * later rounds' slots with times only (their colleges come from results).
 * Everything on `day`, so a tournament is a one-day event.
 */
function bracketInput(order: string[], day: Date, kind: "playoffs" | "tournament"): BracketSlotInput[] {
  const seeds = new Map(order.map((c, i) => [c, i + 1]));
  const division = (slot: number) =>
    kind === "tournament" ? null : slot === 15 ? "final" : slot <= 6 || slot === 13 ? "blue" : "green";
  const slot = (n: number, hour: number, home: string | null = null, away: string | null = null): BracketSlotInput => ({
    slot: n, homeCollegeId: home, homeSeed: (home && seeds.get(home)) || null, awayCollegeId: away, awaySeed: (away && seeds.get(away)) || null,
    venue: pick(VENUES), venueDetail: `Court ${n}`,
    startsAt: new Date(day.getTime() + hour * 60 * 60 * 1000).toISOString(), division: division(n),
  });
  const [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14] = order;
  return [
    slot(1, 0, s1), slot(2, 0, s8, s9), slot(3, 1, s4, s13), slot(4, 1, s5, s12),
    slot(7, 0, s2), slot(8, 2, s7, s10), slot(9, 2, s3, s14), slot(10, 3, s6, s11),
    slot(5, 4), slot(6, 4), slot(11, 5), slot(12, 5), slot(13, 6), slot(14, 6), slot(15, 8),
    ...(kind === "tournament" ? [slot(16, 7)] : []),
  ];
}

/** Creates a playoff bracket or tournament (named `name`) through the bracket service; optionally plays it out. */
async function bracket(seasonId: string, kind: "playoffs" | "tournament", name: string, sport: string, day: Date, play: boolean) {
  const shuffled = [...ids].sort(() => random() - 0.5);
  const result = await createBracket(seasonId, {
    kind, name, sportId: SPORTS.find((s) => s.name === sport)!.id,
    slots: bracketInput(shuffled, day, kind),
    placementPoints: kind === "tournament" ? { first: 20, second: 15, third: 10 } : undefined,
  }, SEED_ACTOR);
  if (result.status !== "created" || result.id !== bracketIdOf(name)) throw new Error(`${name}: ${JSON.stringify(result)}`);
  if (!play) return;
  // Score round by round; each result moves its winner (and in a tournament,
  // a semifinal's loser) on, so later rounds fill in as earlier ones finish.
  for (let round = 0; round < 4; round++) {
    const games = await adminDb.collection(paths.matches(seasonId)).where("bracketId", "==", bracketIdOf(name)).get();
    for (const g of inFixedOrder(games.docs)) {
      const game = g.data() as MatchDoc;
      if (game.status !== "scheduled" || !game.homeCollegeId || !game.awayCollegeId) continue;
      const home = 5 + Math.floor(random() * 10);
      await scoreMatch({ seasonId, matchId: g.id, homeScore: home, awayScore: home - 1 - Math.floor(random() * 4), homeForfeit: false, awayForfeit: false }, SEED_ACTOR);
    }
  }
}

// ── Season activity: captains, sign-ups, reports, MVPs ─────────────────────

async function activity(seasonSports: (SportDoc & { id: string })[]): Promise<void> {
  // Two captains per college, in the first two of the term's sports.
  for (const [ci] of COLLEGES.entries()) {
    for (const [k, sport] of seasonSports.slice(0, 2).entries()) {
      const r = await setCaptain(CURRENT, COLLEGES[ci].id, sport.id, students[ci * PER_COLLEGE + 1 + k].email, true, SEED_ACTOR);
      if (r !== "ok") throw new Error(`captain: ${r}`);
    }
  }
  const games = inFixedOrder((await adminDb.collection(paths.matches(CURRENT)).where("stage", "==", "regular").orderBy("startsAt").get()).docs);
  const upcoming = games.filter((g) => (g.data() as MatchDoc).startsAt.toMillis() > Date.now()).slice(0, 12);
  const played = games.filter((g) => (g.data() as MatchDoc).status === "final").slice(-12);
  // Upcoming games: a few players of each side signed up (through the sign-up service).
  for (const g of upcoming) {
    for (const collegeId of (g.data() as MatchDoc).collegeIds) {
      const team = students.filter((p) => p.collegeId === collegeId).slice(2, 5);
      for (const p of team) {
        const r = await signUp(CURRENT, g.id, p.email);
        if (r !== "ok") throw new Error(`sign-up: ${r}`);
      }
    }
  }
  // One player the captain took off a game (they can't sign up again).
  const removedGame = upcoming[0];
  const removedFrom = (removedGame.data() as MatchDoc).homeCollegeId!;
  const removed = students.filter((p) => p.collegeId === removedFrom)[5];
  const captain = students.filter((p) => p.collegeId === removedFrom)[1];
  const game = removedGame.data() as MatchDoc;
  const entry: RosterEntryDoc = {
    seasonId: CURRENT, matchId: removedGame.id, sportId: game.sportId, collegeId: removedFrom, playerId: removed.email,
    name: fullName(removed), startsAt: game.startsAt, addedBy: "self", addedByUser: removed.email, signedUpAt: Timestamp.now(),
    captainStatus: "removed", captainBy: captain.email, captainAt: Timestamp.now(), present: false, presentBy: null, presentAt: null,
  };
  await adminDb.doc(paths.rosterEntry(CURRENT, removedGame.id, removed.email)).set(entry);
  // Played games: rosters with attendance (sign-up closes at the start, so written directly).
  for (const g of played) {
    const m = g.data() as MatchDoc;
    for (const collegeId of m.collegeIds) {
      for (const p of students.filter((s) => s.collegeId === collegeId).slice(2, 5)) {
        await adminDb.doc(paths.rosterEntry(CURRENT, g.id, p.email)).set({
          seasonId: CURRENT, matchId: g.id, sportId: m.sportId, collegeId, playerId: p.email, name: fullName(p),
          startsAt: m.startsAt, addedBy: "self", addedByUser: p.email, signedUpAt: m.startsAt,
          captainStatus: "confirmed", captainBy: students.find((s) => s.collegeId === collegeId)!.email, captainAt: m.startsAt,
          present: random() > 0.2, presentBy: supervisor.email, presentAt: m.startsAt,
        } satisfies RosterEntryDoc);
      }
    }
  }
  // Score reports: one open, one resolved.
  for (const [i, g] of played.slice(0, 2).entries()) {
    const m = g.data() as MatchDoc;
    const reporter = students.find((p) => p.collegeId === m.homeCollegeId)!;
    const id = await addScoreReport(CURRENT, g.id, {
      reason: i === 0 ? "The score is flipped" : "We won this one", reportedBy: reporter.email, reporterName: fullName(reporter),
    });
    if (i === 1) await resolveScoreReport(CURRENT, g.id, id, SEED_ACTOR);
  }
  // MVPs: each rep names one of their players for the past weeks of the season.
  const first = (games[0].data() as MatchDoc).startsAt.toMillis();
  const weeks = Math.max(0, Math.floor((Date.now() - first) / (7 * DAY)));
  for (const [ci, c] of COLLEGES.slice(0, 6).entries()) {
    for (let week = 1; week <= weeks; week++) {
      const p = students[ci * PER_COLLEGE + 1 + (week % 6)];
      await setMvp(CURRENT, c.id, { week, playerId: p.email, name: fullName(p), awardedBy: students[ci * PER_COLLEGE].email });
    }
  }
}

// ── Run ────────────────────────────────────────────────────────────────────

const started = Date.now();
console.log(`Seeding the emulator at ${host} (project ${projectId}): seasons ${PREVIOUS} and ${CURRENT}, current term ${currentTerm}`);
await wipe();
await writeLeague();
const sportNames = new Map(SPORTS.map((s) => [s.id, s.name]));

// Last season: every term played, two playoffs and a tournament, a champion.
for (const term of TERMS) {
  const [from, to] = termWindow(startYear - 1, term);
  for (const sport of SPORTS.filter((s) => s.term === term)) await schedule(PREVIOUS, sport, from, to);
}
const lastPlayed = await scorePlayed(PREVIOUS, sportNames);
await bracket(PREVIOUS, "playoffs", playoffsName("Soccer"), "Soccer", new Date(startYear - 1, 10, 24, 10), true);
await bracket(PREVIOUS, "playoffs", playoffsName("Broomball"), "Broomball", new Date(startYear, 2, 1, 10), true);
await bracket(PREVIOUS, "tournament", "Spring Volleyball Tournament", "Volleyball", new Date(startYear, 3, 26, 10), true);
const champion = (await adminDb.collection(paths.colleges(PREVIOUS)).orderBy("rank").limit(1).get()).docs[0].id;
await adminDb.doc(paths.season(PREVIOUS)).update({ championCollegeId: champion, championshipUpdatedAt: FieldValue.serverTimestamp() });

// This season: earlier terms played out; the current term's games run from
// five weeks ago to four weeks ahead; an upcoming playoff and tournament.
for (const term of TERMS.slice(0, TERMS.indexOf(currentTerm))) {
  const [from, to] = termWindow(startYear, term);
  for (const sport of SPORTS.filter((s) => s.term === term)) await schedule(CURRENT, sport, from, to);
}
const termSports = SPORTS.filter((s) => s.term === currentTerm);
const seasonStart = new Date(startYear, 6, 2);
const from = new Date(Math.max(dayAt(-35).getTime(), seasonStart.getTime()));
for (const sport of termSports) await schedule(CURRENT, sport, from, dayAt(28));
const nowPlayed = await scorePlayed(CURRENT, sportNames);
await bracket(CURRENT, "playoffs", playoffsName(termSports[0].name), termSports[0].name, dayAt(30, 10), false);
await bracket(CURRENT, "tournament", `${termSports[1].name} One Day Tournament`, termSports[1].name, dayAt(3, 10), false);
await activity(termSports);

console.log(
  `Done in ${Math.round((Date.now() - started) / 1000)}s: ${lastPlayed} + ${nowPlayed} regular games scored, ` +
  `${students.length} students, ${alumni.length} alumni.\n` +
  `Sign in locally: npm run dev:token -- dev@example.edu (admin + dev), player001@example.edu (Benjamin Franklin's rep), ` +
  `player002@example.edu (a captain), player003@example.edu (a player).`
);
process.exit(0);
