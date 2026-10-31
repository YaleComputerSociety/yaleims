// Old data → schema v3 documents (REDESIGN.md section 4, "Field-by-field
// mapping"). Pure: computes every v3 doc from what readOldData returned, so a
// re-run computes the same docs from the same data (idempotent). The current
// season must come out complete and exact (else this throws); past seasons
// are best-effort (D28): what can't be mapped is skipped and reported.
//
// buildPlan is the whole pipeline; below it, one function per entity, in the
// order the pipeline calls them.
import { Timestamp } from "firebase-admin/firestore";
import type * as V3 from "../../../frontend/src/types/firestore";
import type * as Old from "../../../frontend/src/types/legacy";
import { easternDate, seasonStart } from "../../../frontend/src/lib/dates";
import { paths } from "../../../frontend/src/lib/paths";
import { standingDeltas, teamDeltas, type TeamRecord } from "../../../frontend/src/lib/results";
import { slugify } from "../../../frontend/src/lib/slug";
import type { OldData, OldDoc } from "./old";

/**
 * Something that couldn't be migrated as is. `ref` may hold an email; it is
 * printed only with --show-refs (and kept in the --report file).
 */
export interface Anomaly {
  kind: string;
  seasonId?: string;
  ref?: string;
  detail?: string;
}

/** An MVP award; its doc id is found (or made) when writing, as awards have auto ids. */
export interface MvpItem {
  seasonId: string;
  collegeId: string;
  data: V3.MvpDoc;
}

/** v3 fields to add to an old doc, if it is still as read (`updateTime`). */
export interface FieldsToAdd<T> {
  update: T;
  updateTime: Timestamp;
}

export interface Plan {
  currentSeasonId: string;
  seasonIds: string[];
  /** Every v3 document with a fixed id, by path. */
  docs: Map<string, object>;
  mvps: MvpItem[];
  /** users/{email} docs without v3 fields → roles, claimedAt, createdBy. */
  userUpdates: Map<string, FieldsToAdd<Pick<V3.UserDoc, "roles" | "claimedAt" | "createdBy">>>;
  /** usernames/{name} docs without userId → { userId }. */
  usernameUpdates: Map<string, FieldsToAdd<V3.UsernameDoc>>;
  anomalies: Anomaly[];
  /** Counts for the summary. */
  info: Record<string, number>;
  /** The current season's copied standings vs a recomputation; empty = equal. */
  standingsDiffs: string[];
}

export function buildPlan(old: OldData): Plan {
  const ctx = new Context(old);
  const currentSeasonId = old.current?.year;
  if (!currentSeasonId || !/^\d{4}-\d{4}$/.test(currentSeasonId)) {
    throw new Error(`seasons/current.year is missing or malformed: ${currentSeasonId}`);
  }
  const seasonIds = listSeasons(ctx, currentSeasonId);
  ctx.docs.set(paths.appConfig, {
    currentSeasonId,
    features: { myStats: false },
  } satisfies V3.AppConfigDoc);

  let standingsDiffs: string[] = [];
  for (const seasonId of seasonIds) {
    const season = ctx.openSeason(seasonId, seasonId === currentSeasonId);
    mapSeasonDoc(ctx, season);
    mapSports(ctx, season);
    const colleges = mapColleges(ctx, season);
    const brackets = mapBrackets(ctx, season);
    const matches = mapMatches(ctx, season, brackets);
    const signups = mapRosters(ctx, season, matches);
    mapScoreReports(ctx, season, matches);
    const players = mapPlayers(ctx, season, signups);
    mapTeams(ctx, season, matches, players);
    mapMvps(ctx, season);
    if (season.isCurrent) {
      standingsDiffs = checkStandings(colleges, matches, [...brackets.docs.values()]);
    }
  }

  return {
    currentSeasonId,
    seasonIds,
    docs: ctx.docs,
    mvps: ctx.mvps,
    userUpdates: mapUserUpdates(ctx),
    usernameUpdates: mapUsernameUpdates(ctx),
    anomalies: ctx.anomalies,
    info: ctx.info,
    standingsDiffs,
  };
}

// ── What every step shares ─────────────────────────────────────────────────

/** The season being mapped. */
interface Season {
  id: string;
  isCurrent: boolean;
  /** When the season starts (D30's "joined this season"). */
  start: Timestamp;
  /** Its old match docs by v3 id (the stored numeric id), byes included. */
  oldMatches: Map<string, OldDoc<Old.MatchDoc>>;
}

/** The old data with its lookups, the v3 docs computed so far and the anomaly log. */
class Context {
  readonly docs = new Map<string, object>();
  readonly mvps: MvpItem[] = [];
  readonly anomalies: Anomaly[] = [];
  readonly info: Record<string, number> = {};
  /** College ids (abbreviations) and names, from the stored standings. */
  readonly collegeIds = new Set<string>();
  private readonly collegeIdByName = new Map<string, string>();
  readonly sportByName = new Map<string, OldDoc<Old.SportDoc>>();
  readonly userByEmail: Map<string, OldDoc<Old.UserDoc>>;

  constructor(readonly old: OldData) {
    for (const standings of old.standings.values()) {
      for (const s of standings) {
        this.collegeIds.add(s.id);
        if (s.data.name) this.collegeIdByName.set(s.data.name, s.id);
      }
    }
    for (const s of old.sports) {
      if (this.sportByName.has(s.data.name)) {
        this.note({ kind: "sport-name-duplicate", ref: s.id, detail: s.data.name });
      } else {
        this.sportByName.set(s.data.name, s);
      }
    }
    this.userByEmail = new Map(old.users.map((u) => [u.id, u]));
    for (const u of old.users) {
      if (u.data.college != null && !this.collegeIdOfName(u.data.college)) {
        this.note({ kind: "user-college-unknown", ref: u.id, detail: `college "${u.data.college}"` });
      }
    }
  }

  note(anomaly: Anomaly): void {
    this.anomalies.push(anomaly);
  }

  count(key: string, n = 1): void {
    this.info[key] = (this.info[key] ?? 0) + n;
  }

  /** A college as users and old MVP paths name it ("Morse", "Morse College") → its id. */
  collegeIdOfName(name: unknown): string | null {
    if (typeof name !== "string") return null;
    const trimmed = name.trim();
    return (
      this.collegeIdByName.get(trimmed) ??
      this.collegeIdByName.get(trimmed.replace(/ College$/, "")) ??
      (this.collegeIds.has(trimmed) ? trimmed : null)
    );
  }

  /** "First Last" of a user, or null. */
  userName(email: string): string | null {
    const u = this.userByEmail.get(email)?.data;
    return u ? [u.firstname, u.lastname].filter(Boolean).join(" ").trim() || null : null;
  }

  /** The id of a user's stored college, or null. */
  userCollegeId(email: string): string | null {
    return this.collegeIdOfName(this.userByEmail.get(email)?.data.college);
  }

  /** A season's old match docs by v3 id; a duplicate id stops the current season. */
  openSeason(id: string, isCurrent: boolean): Season {
    const oldMatches = new Map<string, OldDoc<Old.MatchDoc>>();
    for (const m of this.old.matches.get(id) ?? []) {
      const matchId = String(m.data.id ?? m.id);
      if (oldMatches.has(matchId)) {
        this.note({ kind: "match-id-duplicate", seasonId: id, ref: m.path, detail: `id ${matchId}` });
        if (isCurrent) throw new Error(`Duplicate match id ${matchId} in the current season`);
        continue;
      }
      if (matchId !== m.id) {
        this.note({ kind: "match-id-differs-from-doc-id", seasonId: id, ref: m.path, detail: `stored id ${matchId} is the v3 doc id` });
      }
      oldMatches.set(matchId, m);
    }
    const start = Timestamp.fromDate(seasonStart(Number(id.slice(0, 4))));
    return { id, isCurrent, start, oldMatches };
  }
}

/** A user's old roles: mRoles and the sports they captain (season-less). */
function oldRoles(u: OldDoc<Old.UserDoc>): { mRoles: string[]; captainOf: string[] } {
  return {
    mRoles: Array.isArray(u.data.mRoles) ? u.data.mRoles : [],
    captainOf: Array.isArray(u.data.sportsCaptainOf) ? u.data.sportsCaptainOf : [],
  };
}

const isTimestamp = (v: unknown): v is Timestamp => v instanceof Timestamp;

/** A non-empty string, else null. */
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

// ── Seasons: seasons/{seasonId} ────────────────────────────────────────────

/** Every season with data, sorted; the current one must exist. */
function listSeasons(ctx: Context, currentSeasonId: string): string[] {
  const { old } = ctx;
  const ids = new Set([
    currentSeasonId,
    ...old.pastYears,
    ...old.matches.keys(),
    ...old.standings.keys(),
    ...old.brackets.keys(),
    ...old.tournaments.keys(),
    ...old.mvps.map((m) => m.seasonId),
  ]);
  const seasonIds: string[] = [];
  for (const id of [...ids].sort()) {
    if (!/^\d{4}-\d{4}$/.test(id)) {
      ctx.note({ kind: "season-id-malformed", ref: id, detail: "not a season id; its data is skipped" });
      continue;
    }
    if (id !== currentSeasonId && !old.pastYears.includes(id)) {
      ctx.note({ kind: "season-not-listed", seasonId: id, detail: "has data but is not in seasons/past.years" });
    }
    seasonIds.push(id);
  }
  return seasonIds;
}

/** The current season takes seasons/current's term and banner; past seasons end in spring. */
function mapSeasonDoc(ctx: Context, season: Season): void {
  const current = ctx.old.current!;
  const term = current.season?.toLowerCase();
  const knownTerm = term === "fall" || term === "winter" || term === "spring";
  if (season.isCurrent && !knownTerm) {
    ctx.note({ kind: "season-term-unknown", seasonId: season.id, detail: `seasons/current.season "${current.season}" → "spring"` });
  }
  ctx.docs.set(paths.season(season.id), {
    label: season.id,
    startYear: Number(season.id.slice(0, 4)),
    currentTerm: season.isCurrent && knownTerm ? term : "spring",
    championCollegeId: season.isCurrent ? str(current.winningCollegeId) : null,
    celebrationActive: season.isCurrent && current.celebrationActive === true,
    championshipUpdatedAt:
      season.isCurrent && isTimestamp(current.championshipUpdatedAt) ? current.championshipUpdatedAt : null,
  } satisfies V3.SeasonDoc);
}

// ── Sports lineup: seasons/{s}/sports/{sportId} ────────────────────────────

/** Each sport's term (was `seasonSports` in frontend/src/utils/helpers.ts). */
const TERM_OF_SPORT: Record<string, V3.Term> = {
  Broomball: "winter", CHoops: "winter", MHoops: "winter", WHoops: "winter", Dodgeball: "winter",
  "Indoor Soccer": "spring", Kanjam: "spring", Volleyball: "spring", Netball: "spring",
  Soccer: "fall", "Flag Football": "fall", Spikeball: "fall", Cornhole: "fall",
  Pickleball: "fall", "Table Tennis": "fall",
};

/**
 * Every old sport, with today's points for a win. Active: the current
 * season's lineup (every sport with a term), in past seasons the sports played.
 */
function mapSports(ctx: Context, season: Season): void {
  const played = new Set([...season.oldMatches.values()].map((m) => m.data.sport));
  for (const s of ctx.old.sports) {
    const term = TERM_OF_SPORT[s.data.name];
    if (!term) ctx.note({ kind: "sport-term-unknown", seasonId: season.id, ref: s.id, detail: `${s.data.name} → "spring"` });
    ctx.docs.set(paths.sport(season.id, s.id), {
      name: s.data.name,
      emoji: s.data.emoji ?? "",
      term: term ?? "spring",
      pointsForWin: s.data.points_for_win ?? 0,
      active: season.isCurrent ? !!term : played.has(s.data.name),
    } satisfies V3.SportDoc);
  }
}

// ── Colleges + standings: seasons/{s}/colleges/{collegeId} ─────────────────

/** Copied as stored (the current season is checked against its results at the end). */
function mapColleges(ctx: Context, season: Season): Map<string, V3.CollegeDoc> {
  const colleges = new Map<string, V3.CollegeDoc>();
  for (const s of ctx.old.standings.get(season.id) ?? []) {
    const d = s.data;
    const rankDate = toRankDate(d.today);
    if (rankDate === null) ctx.note({ kind: "standing-date-unparsed", seasonId: season.id, ref: s.path, detail: `today "${d.today}"` });
    const college: V3.CollegeDoc = {
      name: d.name,
      abbreviation: d.abbreviation ?? s.id,
      points: d.points ?? 0,
      games: d.games ?? 0,
      wins: d.wins ?? 0,
      losses: d.losses ?? 0,
      ties: d.ties ?? 0,
      forfeits: d.forfeits ?? 0,
      rank: d.rank ?? 0,
      prevRank: d.prevRank ?? 0,
      rankDate: rankDate ?? "",
    };
    colleges.set(s.id, college);
    ctx.docs.set(paths.college(season.id, s.id), college);
  }
  if (season.isCurrent && colleges.size === 0) throw new Error("The current season has no standings");
  return colleges;
}

/** The old rank day "d-m-yyyy" → "yyyy-mm-dd"; null if unparseable. */
function toRankDate(today: unknown): V3.EasternDate | null {
  const m = typeof today === "string" ? /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(today) : null;
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

// ── Brackets: seasons/{s}/brackets/{bracketId} ─────────────────────────────

const DEFAULT_PLACEMENT_POINTS: V3.PlacementPoints = { first: 20, second: 15, third: 10 };

interface Brackets {
  docs: Map<string, V3.BracketDoc>;
  /** Old match id → the bracket listing it (games only, not byes). */
  bracketOfMatch: Map<string, string>;
  /** Old bye "matches" that became bracket slots. */
  byes: Set<string>;
}

/**
 * Playoffs (one per sport; id = slug of "<Sport> Playoffs") and tournaments
 * (id kept). A bye slot keeps its college, not a match (D28).
 */
function mapBrackets(ctx: Context, season: Season): Brackets {
  const result: Brackets = { docs: new Map(), bracketOfMatch: new Map(), byes: new Set() };

  const slotsOf = (entries: Old.BracketEntry[] | undefined, ref: string): V3.BracketSlot[] =>
    [...(entries ?? [])]
      .sort((a, b) => a.bracket_placement - b.bracket_placement)
      .map((e) => {
        const matchId = String(e.match_id);
        const m = season.oldMatches.get(matchId);
        if (m?.data.type === "Bye") {
          result.byes.add(matchId);
          const byeCollegeId = [m.data.winner, m.data.home_college, m.data.away_college]
            .map(str)
            .find((c) => c !== null && ctx.collegeIds.has(c));
          if (!byeCollegeId) ctx.note({ kind: "bye-without-college", seasonId: season.id, ref: m.path });
          return { slot: e.bracket_placement, round: e.round, matchId: null, byeCollegeId: byeCollegeId ?? null };
        }
        if (!m) ctx.note({ kind: "bracket-slot-without-match", seasonId: season.id, ref, detail: `slot ${e.bracket_placement}, match ${matchId}` });
        return { slot: e.bracket_placement, round: e.round, matchId: m ? matchId : null, byeCollegeId: null };
      });

  // The day of a one-day event: all its games start on the same Eastern day.
  const oneDay = (slots: V3.BracketSlot[]): V3.EasternDate | null => {
    const days = new Set(
      slots
        .map((s) => (s.matchId ? season.oldMatches.get(s.matchId)?.data.timestamp : undefined))
        .filter(isTimestamp)
        .map((t) => easternDate(t.toDate()))
    );
    return days.size === 1 ? [...days][0] : null;
  };

  const add = (id: string, doc: V3.BracketDoc, oldPath: string) => {
    if (result.docs.has(id)) {
      ctx.note({ kind: "bracket-id-duplicate", seasonId: season.id, ref: oldPath, detail: `id ${id}` });
      return;
    }
    result.docs.set(id, doc);
    ctx.docs.set(paths.bracket(season.id, id), doc);
    for (const s of doc.slots) if (s.matchId) result.bracketOfMatch.set(s.matchId, id);
  };

  for (const b of ctx.old.brackets.get(season.id) ?? []) {
    const sportName = b.data.sport ?? b.id;
    const sport = ctx.sportByName.get(sportName);
    if (!sport) {
      ctx.note({ kind: "bracket-sport-unknown", seasonId: season.id, ref: b.path, detail: sportName });
      continue;
    }
    const name = `${sportName} Playoffs`;
    const slots = slotsOf(b.data.matches, b.path);
    add(slugify(name), {
      seasonId: season.id,
      sportId: sport.id,
      kind: "playoffs",
      name,
      date: oneDay(slots),
      slots,
      thirdPlaceSlot: null,
      placementPoints: null,
      placements: null,
      createdAt: isTimestamp(b.data.createdAt) ? b.data.createdAt : b.createTime,
    }, b.path);
  }

  for (const t of ctx.old.tournaments.get(season.id) ?? []) {
    const sport = ctx.sportByName.get(t.data.sport);
    if (!sport) {
      ctx.note({ kind: "bracket-sport-unknown", seasonId: season.id, ref: t.path, detail: t.data.sport });
      continue;
    }
    const slots = slotsOf(t.data.matches, t.path);
    const stored = t.data.placement_points ?? {};
    const points = (key: keyof V3.PlacementPoints) => {
      const v = stored[key];
      return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : DEFAULT_PLACEMENT_POINTS[key];
    };
    const placements = t.data.placements ?? {};
    add(t.id, {
      seasonId: season.id,
      sportId: sport.id,
      kind: "tournament",
      name: t.data.name,
      date: oneDay(slots),
      slots,
      thirdPlaceSlot: t.data.third_place_slot ?? 16,
      placementPoints: { first: points("first"), second: points("second"), third: points("third") },
      placements: {
        first: str(placements.first),
        second: str(placements.second),
        third: str(placements.third),
      },
      createdAt: isTimestamp(t.data.createdAt) ? t.data.createdAt : t.createTime,
    }, t.path);
  }
  return result;
}

// ── Matches: seasons/{s}/matches/{matchId} ─────────────────────────────────

const PLAYOFF_ROUNDS = new Set(["Playoff", "Quarterfinal", "Semifinal", "Final", "Third Place"]);

/** Every game of the season by id. Byes become bracket slots, not games (D28). */
function mapMatches(ctx: Context, season: Season, brackets: Brackets): Map<string, V3.MatchDoc> {
  const matches = new Map<string, V3.MatchDoc>();
  for (const [id, old] of season.oldMatches) {
    const match = mapMatch(ctx, season, id, old, brackets);
    if (!match) continue;
    matches.set(id, match);
    ctx.docs.set(paths.match(season.id, id), match);
  }
  for (const [id, m] of matches) {
    for (const next of [m.nextMatchId, m.nextLoserMatchId]) {
      if (next && !matches.has(next)) {
        ctx.note({ kind: "match-link-missing", seasonId: season.id, ref: paths.match(season.id, id), detail: `links to ${next}` });
      }
    }
  }
  ctx.count(`matches ${season.id}`, matches.size);
  return matches;
}

/** One old match doc → a v3 game, or null if it isn't one (or can't be mapped). */
function mapMatch(
  ctx: Context,
  season: Season,
  id: string,
  old: OldDoc<Old.MatchDoc>,
  brackets: Brackets
): V3.MatchDoc | null {
  const d = old.data;
  const skip = (kind: string, detail?: string): null => {
    ctx.note({ kind, seasonId: season.id, ref: old.path, detail });
    if (season.isCurrent) throw new Error(`Current season, match ${id}: ${kind} ${detail ?? ""}`);
    return null;
  };

  if (d.type === "Bye") {
    if (brackets.byes.has(id)) ctx.count(`byes → bracket slots ${season.id}`);
    else ctx.note({ kind: "bye-outside-bracket", seasonId: season.id, ref: old.path, detail: "no bracket lists it: skipped" });
    return null;
  }
  if (d.home_college === "Bye" || d.away_college === "Bye") {
    ctx.note({ kind: "game-against-bye", seasonId: season.id, ref: old.path, detail: "regular-season bye, not a game: skipped" });
    return null;
  }
  const sport = ctx.sportByName.get(d.sport);
  if (!sport) return skip("match-sport-unknown", d.sport);
  if (!isTimestamp(d.timestamp)) return skip("match-without-start");

  // A side is a college id, or null for a bracket slot still waiting ("TBD").
  const side = (c: unknown): string | null | undefined => {
    const v = str(c);
    if (v === null || v === "TBD") return null;
    return ctx.collegeIds.has(v) ? v : undefined;
  };
  const home = side(d.home_college);
  const away = side(d.away_college);
  if (home === undefined || away === undefined) return skip("match-college-unknown", `${d.home_college} vs ${d.away_college}`);

  const result = toResult(d, home, away);
  if (result === undefined) return skip("match-winner-unknown", `winner "${d.winner}"`);
  if (result && (result.homeScore === null || result.awayScore === null)) {
    ctx.note({ kind: "result-without-score", seasonId: season.id, ref: old.path });
  }

  const playoff = PLAYOFF_ROUNDS.has(d.type);
  if (!playoff && d.type !== "Regular") {
    ctx.note({ kind: "match-type-unknown", seasonId: season.id, ref: old.path, detail: `type "${d.type}" → regular` });
  }
  const division = (d.division ?? "").toLowerCase();
  if (division && !["blue", "green", "final", "none"].includes(division)) {
    ctx.note({ kind: "match-division-unknown", seasonId: season.id, ref: old.path, detail: d.division });
  }
  const bracketId = playoff ? (brackets.bracketOfMatch.get(id) ?? str(d.tournament_id)) : null;
  if (playoff && !bracketId) ctx.count(`playoff games without a bracket ${season.id}`);

  const seed = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);
  const link = (v: unknown) => (v === undefined || v === null || v === "" || v === 0 ? null : String(v));
  return {
    seasonId: season.id,
    sportId: sport.id,
    homeCollegeId: home,
    awayCollegeId: away,
    collegeIds: [...new Set([home, away].filter((c) => c !== null))],
    startsAt: d.timestamp,
    venue: str(d.location),
    venueDetail: str(d.location_extra),
    division: playoff && ["blue", "green", "final"].includes(division) ? (division as V3.Division) : null,
    stage: playoff ? "playoff" : "regular",
    bracketId,
    bracketSlot: playoff && typeof d.playoff_bracket_slot === "number" ? d.playoff_bracket_slot : null,
    round: playoff ? d.type : null,
    homeSeed: playoff ? seed(d.home_seed) : null,
    awaySeed: playoff ? seed(d.away_seed) : null,
    nextMatchId: playoff ? link(d.next_match_id) : null,
    nextLoserMatchId: playoff ? link(d.next_match_loser_id) : null,
    pointsForWin: sport.data.points_for_win ?? 0,
    status: result ? "final" : "scheduled",
    result,
    scoredBy: null,
    scoredAt: null,
    updatedAt: old.updateTime,
  };
}

/**
 * An old match's result: null if unscored, undefined if the winner is
 * neither side nor "Draw" / "Default" (both forfeited).
 */
function toResult(d: Old.MatchDoc, home: string | null, away: string | null): V3.MatchResult | null | undefined {
  const winner = str(d.winner);
  if (!winner) return null;
  let outcome: V3.Outcome;
  if (winner === "Draw") outcome = "draw";
  else if (winner === "Default") outcome = "double_forfeit";
  else if (home && winner === home) outcome = "home";
  else if (away && winner === away) outcome = "away";
  else return undefined;
  return {
    homeScore: typeof d.home_college_score === "number" ? d.home_college_score : null,
    awayScore: typeof d.away_college_score === "number" ? d.away_college_score : null,
    outcome,
    forfeit: outcome === "double_forfeit" || d.forfeit === true,
  };
}

// ── Rosters: seasons/{s}/matches/{m}/roster/{playerId} ─────────────────────

/** One sign-up, from the match roster, the user-season doc or both. */
interface Signup {
  matchId: string;
  email: string;
  collegeId: string;
  name: string | null;
  from: Set<"roster" | "user-season">;
}

/**
 * The union of the two old sign-up stores (match rosters and users' season
 * lists, which disagree). A roster entry keeps the side it was listed on; a
 * sign-up only on the user's list takes the user's college if it plays.
 */
function mapRosters(ctx: Context, season: Season, matches: Map<string, V3.MatchDoc>): Signup[] {
  const signups = new Map<string, Signup>();
  const note = (kind: string, ref: string, detail?: string) => ctx.note({ kind, seasonId: season.id, ref, detail });

  for (const [id, old] of season.oldMatches) {
    const match = matches.get(id);
    for (const side of ["home", "away"] as const) {
      const list = old.data[`${side}_college_participants`];
      if (!Array.isArray(list) || list.length === 0) continue;
      if (!match) {
        note("roster-of-skipped-match", old.path, `${list.length} entries`);
        continue;
      }
      const collegeId = side === "home" ? match.homeCollegeId : match.awayCollegeId;
      for (const p of list as (Old.MatchParticipant | null)[]) {
        const email = str(p?.email);
        const key = `${id}|${email}`;
        if (!email) note("roster-entry-without-email", old.path);
        else if (!collegeId) note("roster-entry-on-unknown-side", key);
        else if (signups.has(key)) {
          if (signups.get(key)!.collegeId !== collegeId) note("roster-entry-on-both-sides", key);
        } else {
          const name = str(p?.name) ?? ([p?.firstname, p?.lastname].filter(Boolean).join(" ").trim() || null);
          signups.set(key, { matchId: id, email, collegeId, name, from: new Set(["roster"]) });
          const userCollege = ctx.userCollegeId(email);
          if (userCollege && userCollege !== collegeId) note("roster-entry-for-other-college", key, "kept on the side it was listed");
        }
      }
    }
  }

  for (const us of ctx.old.userSeasons) {
    if (us.seasonId !== season.id) continue;
    const list: unknown = us.doc.data.matches;
    if (!Array.isArray(list)) {
      const empty = list === undefined || (typeof list === "object" && list !== null && Object.keys(list).length === 0);
      if (!empty) note("user-season-matches-not-a-list", us.doc.path);
      continue;
    }
    for (const s of list as (Old.UserSeasonMatch | null)[]) {
      const id = String(s?.id);
      const key = `${id}|${us.email}`;
      const existing = signups.get(key);
      const match = matches.get(id);
      const collegeId = ctx.userCollegeId(us.email);
      if (existing) existing.from.add("user-season");
      else if (!match) note("signup-for-missing-match", `${us.doc.path} ${id}`, "skipped");
      else if (!collegeId || (collegeId !== match.homeCollegeId && collegeId !== match.awayCollegeId)) {
        note("signup-side-unknown", key, "only on the user-season doc, user's college plays neither side: skipped");
      } else {
        signups.set(key, { matchId: id, email: us.email, collegeId, name: null, from: new Set(["user-season"]) });
      }
    }
  }

  for (const s of signups.values()) {
    const match = matches.get(s.matchId)!;
    ctx.docs.set(paths.rosterEntry(season.id, s.matchId, s.email), {
      seasonId: season.id,
      matchId: s.matchId,
      sportId: match.sportId,
      collegeId: s.collegeId,
      playerId: s.email,
      name: s.name ?? ctx.userName(s.email) ?? s.email,
      startsAt: match.startsAt,
      addedBy: "legacy",
      addedByUser: null,
      signedUpAt: null,
      captainStatus: null,
      captainBy: null,
      captainAt: null,
      present: null, // attendance unknown (D28)
      presentBy: null,
      presentAt: null,
    } satisfies V3.RosterEntryDoc);
    ctx.count(`roster entries ${season.id} (${[...s.from].sort().join(" + ")})`);
  }
  return [...signups.values()];
}

// ── Score reports: seasons/{s}/matches/{m}/scoreReports/{reportId} ─────────

/** Report ids kept; the copied match fields are dropped (the match has them). */
function mapScoreReports(ctx: Context, season: Season, matches: Map<string, V3.MatchDoc>): void {
  for (const r of ctx.old.scoreReports) {
    if (r.seasonId !== season.id) continue;
    const d = r.doc.data;
    if (!matches.has(r.matchId)) {
      ctx.note({ kind: "report-for-missing-match", seasonId: season.id, ref: r.doc.path, detail: "migrated anyway" });
    }
    const score = (v: unknown) => (typeof v === "number" ? v : null);
    ctx.docs.set(paths.scoreReport(season.id, r.matchId, r.doc.id), {
      seasonId: season.id,
      matchId: r.matchId,
      reason: d.reason ?? "",
      reportedBy: str(d.reportedByEmail) ?? "",
      reporterName: str(d.reportedBy) ?? "",
      reportedAt: isTimestamp(d.reportedAt) ? d.reportedAt : r.doc.createTime,
      scoreAtReport: { home: score(d.homeScore), away: score(d.awayScore) },
      status: d.resolved ? "resolved" : "open",
      resolvedBy: str(d.resolvedBy),
      resolvedAt: isTimestamp(d.resolvedAt) ? d.resolvedAt : null,
    } satisfies V3.ScoreReportDoc);
  }
}

// ── Players: seasons/{s}/players/{email} (D30) ─────────────────────────────

/**
 * Who belongs to the season. Every season: everyone with a sign-up. The
 * current season also: captains, college reps, admins/devs and accounts
 * created since the season started; everyone else joins on their next login.
 */
function mapPlayers(ctx: Context, season: Season, signups: Signup[]): Map<string, V3.PlayerDoc> {
  const players = new Map<string, V3.PlayerDoc>();
  const add = (email: string, reason: string, roles: V3.SeasonRole[] = []) => {
    const existing = players.get(email);
    if (existing) {
      existing.roles = [...new Set([...existing.roles, ...roles])].sort();
      return;
    }
    const user = ctx.userByEmail.get(email);
    const own = signups.filter((s) => s.email === email);
    const rosterCollege = mostCommon(own.map((s) => s.collegeId));
    // The current season trusts the user's college (from Yalies); past
    // seasons the side they played for.
    const collegeId = season.isCurrent
      ? (ctx.userCollegeId(email) ?? rosterCollege)
      : (rosterCollege ?? ctx.userCollegeId(email));
    if (!user) ctx.note({ kind: "player-without-user", seasonId: season.id, ref: email, detail: reason });
    if (!collegeId) ctx.note({ kind: "player-without-college", seasonId: season.id, ref: email, detail: reason });
    else if (own.some((s) => s.collegeId !== collegeId)) {
      ctx.note({ kind: "player-college-differs-from-roster", seasonId: season.id, ref: email });
    }
    const createdLater = season.isCurrent && user && user.createTime.toMillis() > season.start.toMillis();
    players.set(email, {
      seasonId: season.id,
      collegeId,
      name: ctx.userName(email) ?? own.find((s) => s.name)?.name ?? email,
      userId: email,
      roles: [...roles].sort(),
      joinedAt: createdLater ? user.createTime : season.start,
      joinedVia: "migration",
    });
    ctx.count(`players ${season.id} (first reason: ${reason})`);
  };

  for (const s of signups) add(s.email, "sign-up");
  if (season.isCurrent) {
    for (const u of ctx.old.users) {
      const { mRoles, captainOf } = oldRoles(u);
      if (mRoles.includes("college_rep")) add(u.id, "college rep", ["college_rep"]);
      if (mRoles.includes("captain") || captainOf.length > 0) add(u.id, "captain");
      if (mRoles.includes("admin") || mRoles.includes("dev")) add(u.id, "admin/dev");
      if (u.createTime.toMillis() >= season.start.toMillis()) add(u.id, "account created this season");
    }
  }
  for (const [email, p] of players) ctx.docs.set(paths.player(season.id, email), p);
  return players;
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  for (const [v, n] of counts) if (best === null || n > counts.get(best)!) best = v;
  return best;
}

// ── Teams: seasons/{s}/colleges/{c}/teams/{sportId} ────────────────────────

/**
 * A team per college and sport that played (its record, from the results)
 * or has a captain. Captains: this season's sportsCaptainOf (D28's S7).
 */
function mapTeams(
  ctx: Context,
  season: Season,
  matches: Map<string, V3.MatchDoc>,
  players: Map<string, V3.PlayerDoc>
): void {
  const teams = new Map<string, V3.TeamDoc>();
  const team = (collegeId: string, sportId: string): V3.TeamDoc => {
    const key = `${collegeId}|${sportId}`;
    if (!teams.has(key)) {
      teams.set(key, {
        seasonId: season.id, collegeId, sportId, captainIds: [],
        games: 0, wins: 0, losses: 0, ties: 0, forfeits: 0, pointsFor: 0, pointsAgainst: 0,
      });
    }
    return teams.get(key)!;
  };

  for (const m of matches.values()) {
    if (!m.result || !m.homeCollegeId || !m.awayCollegeId) continue;
    for (const [collegeId, delta] of Object.entries(teamDeltas(m.homeCollegeId, m.awayCollegeId, m.result))) {
      const t = team(collegeId, m.sportId);
      for (const [field, n] of Object.entries(delta) as [keyof TeamRecord, number][]) t[field] += n;
    }
  }

  if (season.isCurrent) {
    for (const u of ctx.old.users) {
      const { mRoles, captainOf } = oldRoles(u);
      if (mRoles.includes("captain") && captainOf.length === 0) {
        ctx.note({ kind: "captain-without-sport", seasonId: season.id, ref: u.id, detail: "captain role but no sport: no team" });
      }
      for (const sportName of captainOf) {
        const sport = ctx.sportByName.get(sportName);
        const collegeId = players.get(u.id)?.collegeId;
        if (!sport || !collegeId) {
          ctx.note({ kind: "captain-not-placed", seasonId: season.id, ref: u.id, detail: sport ? "no college" : `unknown sport ${sportName}` });
          continue;
        }
        const t = team(collegeId, sport.id);
        t.captainIds = [...new Set([...t.captainIds, u.id])].sort();
      }
    }
  }
  for (const t of teams.values()) ctx.docs.set(paths.team(season.id, t.collegeId, t.sportId), t);
}

// ── MVPs: seasons/{s}/colleges/{c}/mvps/{awardId} ──────────────────────────

/** mvps/{s}/{college name}/week_N { email: { fname, lname } } → one award per email. */
function mapMvps(ctx: Context, season: Season): void {
  for (const w of ctx.old.mvps) {
    if (w.seasonId !== season.id) continue;
    const collegeId = ctx.collegeIdOfName(w.collegeName);
    const week = /^week_(\d+)$/.exec(w.weekId)?.[1];
    if (!collegeId || !week) {
      ctx.note({ kind: "mvp-not-placed", seasonId: season.id, ref: w.doc.path, detail: collegeId ? "unknown week" : "unknown college" });
      continue;
    }
    for (const [email, n] of Object.entries(w.doc.data)) {
      ctx.mvps.push({
        seasonId: season.id,
        collegeId,
        data: {
          seasonId: season.id,
          collegeId,
          week: Number(week),
          playerId: email,
          name: [n?.fname, n?.lname].filter(Boolean).join(" ").trim() || email,
          awardedBy: null,
          awardedAt: null,
        },
      });
    }
  }
}

// ── Users and usernames (old docs; v3 fields are added) ────────────────────

const GLOBAL_ROLES: V3.GlobalRole[] = ["admin", "dev"];

/**
 * users/{email} without v3 fields: global roles from mRoles, claimed at the
 * doc's creation (every existing account was made by its owner's login). A
 * doc that already has `roles` (an earlier run, or the new code) is kept.
 */
function mapUserUpdates(ctx: Context): Plan["userUpdates"] {
  const updates: Plan["userUpdates"] = new Map();
  for (const u of ctx.old.users) {
    const roles = GLOBAL_ROLES.filter((r) => oldRoles(u).mRoles.includes(r));
    const stored = (u.data as { roles?: unknown }).roles;
    if (stored === undefined) {
      updates.set(u.path, { update: { roles, claimedAt: u.createTime, createdBy: null }, updateTime: u.updateTime });
    } else if (!Array.isArray(stored) || stored.join() !== roles.join()) {
      ctx.note({ kind: "user-roles-differ", ref: u.id, detail: "v3 roles differ from mRoles; kept" });
    }
  }
  return updates;
}

/** usernames/{name} holding only { email } get { userId } too. */
function mapUsernameUpdates(ctx: Context): Plan["usernameUpdates"] {
  const updates: Plan["usernameUpdates"] = new Map();
  for (const n of ctx.old.usernames) {
    if (n.data.userId !== undefined) continue;
    const email = str(n.data.email);
    if (email) updates.set(n.path, { update: { userId: email }, updateTime: n.updateTime });
    else ctx.note({ kind: "username-without-owner", ref: n.id });
  }
  return updates;
}

// ── The current season's standings check ──────────────────────────────────

/**
 * Differences between the copied standings and a recomputation from the
 * season's results plus tournament placement bonuses (empty when equal).
 */
function checkStandings(
  colleges: Map<string, V3.CollegeDoc>,
  matches: Map<string, V3.MatchDoc>,
  brackets: V3.BracketDoc[]
): string[] {
  const fields = ["points", "games", "wins", "losses", "ties", "forfeits"] as const;
  const totals = new Map<string, V3.StandingStats>();
  const add = (collegeId: string, field: (typeof fields)[number], n: number) => {
    if (!totals.has(collegeId)) totals.set(collegeId, { points: 0, games: 0, wins: 0, losses: 0, ties: 0, forfeits: 0 });
    totals.get(collegeId)![field] += n;
  };
  for (const m of matches.values()) {
    if (!m.result || !m.homeCollegeId || !m.awayCollegeId) continue;
    const deltas = standingDeltas(m.homeCollegeId, m.awayCollegeId, m.result, m.pointsForWin);
    for (const [collegeId, delta] of Object.entries(deltas)) {
      for (const f of fields) add(collegeId, f, delta[f] ?? 0);
    }
  }
  for (const b of brackets) {
    if (!b.placements || !b.placementPoints) continue;
    for (const place of ["first", "second", "third"] as const) {
      const collegeId = b.placements[place];
      if (collegeId) add(collegeId, "points", b.placementPoints[place]);
    }
  }

  const diffs: string[] = [];
  for (const id of [...new Set([...colleges.keys(), ...totals.keys()])].sort()) {
    const stored = colleges.get(id);
    const computed = totals.get(id);
    if (!stored) {
      diffs.push(`${id}: has results but no standing`);
      continue;
    }
    const off = fields
      .filter((f) => stored[f] !== (computed?.[f] ?? 0))
      .map((f) => `${f} stored ${stored[f]} ≠ computed ${computed?.[f] ?? 0}`);
    if (off.length > 0) diffs.push(`${id}: ${off.join(", ")}`);
  }
  return diffs;
}
