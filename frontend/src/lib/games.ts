// The games list's pure logic (GAMES-REDESIGN-PLAN §2.1), shared by the games
// page, the sign-up page and the Hub's and Profile's lists: a game's state in
// a row, the competition a game is listed under, the grouping by Eastern day
// and competition, the filters, and how loaded pages merge. No React and no
// fetching here (tests/unit/games.test.ts).
import type { Bracket } from "./api/brackets";
import type { Match } from "./api/matches";
import type { Sport } from "./api/seasons";
import { addDays, easternDate, easternMidnight } from "./dates";
import type { EasternDate, MatchStatus } from "@/types/firestore";

// ── One game ────────────────────────────────────────────────────────────────

/** A game counts as live for an hour after its start: the league keeps no live scores. */
export const LIVE_WINDOW_MS = 60 * 60 * 1000;

export type RowState = "upcoming" | "live" | "final" | "unscored" | "cancelled";

/** How a row shows the game at `now`: its time, LIVE, the final score, "not scored" (started, no result yet) or cancelled. */
export function rowState(match: Pick<Match, "startsAt" | "status" | "result">, now: Date): RowState {
  if (match.status === "cancelled") return "cancelled";
  if (match.result) return "final";
  const sinceStart = now.getTime() - new Date(match.startsAt).getTime();
  if (sinceStart < 0) return "upcoming";
  return sinceStart < LIVE_WINDOW_MS ? "live" : "unscored";
}

/** The game's page. */
export const gameHref = (match: Pick<Match, "seasonId" | "id">) => `/games/${match.seasonId}/${match.id}`;

const easternTime = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
/** The start as the league reads it, in Eastern time ("7:00 PM"). */
export const gameTime = (match: Pick<Match, "startsAt">) => easternTime.format(new Date(match.startsAt));

const easternDateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
});
/** The start with its day, in Eastern time ("Friday, November 13 at 7:00 PM"). */
export const gameDateTime = (match: Pick<Match, "startsAt">) => easternDateTime.format(new Date(match.startsAt));

// ── Competitions ────────────────────────────────────────────────────────────

export type CompetitionKind = "regular" | "playoffs" | "tournament";

/** What a game is listed under within a day: a sport's regular season, a sport's playoffs or a tournament (G2). */
export interface Competition {
  key: string;
  kind: CompetitionKind;
  emoji: string;
  name: string;
  /** The playoffs' bracket or the tournament's page; null for the regular season. */
  href: string | null;
}

/**
 * The game's competition, from its sport and, for a bracket game, its
 * bracket. Tournament games are playoff-stage games in a tournament's
 * bracket, so the bracket tells the two apart; a bracket not loaded yet
 * counts as the sport's playoffs.
 */
export function competitionOf(
  match: Pick<Match, "seasonId" | "sportId" | "stage" | "bracketId">,
  sport: Pick<Sport, "name" | "emoji"> | undefined,
  bracket: Pick<Bracket, "kind" | "name"> | undefined,
): Competition {
  const sportName = sport?.name ?? "Unknown sport";
  if (match.bracketId && bracket?.kind === "tournament") {
    return {
      key: `tournament:${match.bracketId}`,
      kind: "tournament",
      emoji: "🏆",
      name: bracket.name,
      href: `/tournaments?season=${match.seasonId}&id=${match.bracketId}`,
    };
  }
  if (match.stage === "playoff") {
    return {
      key: `playoffs:${match.sportId}`,
      kind: "playoffs",
      emoji: "🏅",
      name: bracket?.name ?? `${sportName} Playoffs`,
      href: `/brackets?season=${match.seasonId}&sport=${match.sportId}`,
    };
  }
  return { key: `sport:${match.sportId}`, kind: "regular", emoji: sport?.emoji ?? "🏅", name: sportName, href: null };
}

// ── Grouping ────────────────────────────────────────────────────────────────

export interface CompetitionGroup extends Competition {
  games: Match[];
}

export interface DayGroup {
  day: EasternDate;
  competitions: CompetitionGroup[];
}

/**
 * The games by Eastern day (D34) and, within a day, by competition in the
 * order of each competition's first game, that competition's games in list
 * order under it (G2: a header even over a single game). `games` must already
 * be in list order (by start, then id; either direction).
 */
export function groupGames(games: Match[], competition: (game: Match) => Competition): DayGroup[] {
  const days: DayGroup[] = [];
  for (const game of games) {
    const day = easternDate(new Date(game.startsAt));
    let dayGroup = days.at(-1);
    if (dayGroup?.day !== day) {
      dayGroup = { day, competitions: [] };
      days.push(dayGroup);
    }
    const found = competition(game);
    let group = dayGroup.competitions.find((g) => g.key === found.key);
    if (!group) {
      group = { ...found, games: [] };
      dayGroup.competitions.push(group);
    }
    group.games.push(game);
  }
  return days;
}

const weekdayDate = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" });

/** "Today · Wednesday, Nov 12", "Tomorrow · …", "Yesterday · …", else "Friday, Nov 14". */
export function dayLabel(day: EasternDate, today: EasternDate): string {
  const [y, m, d] = day.split("-").map(Number);
  const text = weekdayDate.format(new Date(Date.UTC(y, m - 1, d, 12)));
  const relative = day === today ? "Today" : day === addDays(today, 1) ? "Tomorrow" : day === addDays(today, -1) ? "Yesterday" : null;
  return relative ? `${relative} · ${text}` : text;
}

// ── Pages ───────────────────────────────────────────────────────────────────

export type ListOrder = "asc" | "desc";

/** Both lists' games, each once (the newer copy wins), in list order: by start, then id, as the API orders. */
export function mergeGames(current: Match[], incoming: Match[], order: ListOrder): Match[] {
  const byId = new Map(current.map((game) => [game.id, game]));
  for (const game of incoming) byId.set(game.id, game);
  const sign = order === "asc" ? 1 : -1;
  const byIdThen = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return [...byId.values()].sort((a, b) => sign * (a.startsAt.localeCompare(b.startsAt) || byIdThen(a.id, b.id)));
}

// ── Filters ─────────────────────────────────────────────────────────────────

/** The Filters panel's status choices. The API knows scheduled / final / cancelled; "now" splits scheduled games into upcoming and not yet scored. */
export type StatusChoice = "upcoming" | "scored" | "unscored" | "cancelled";

/** The list's filters: what the API filters on (lib/api/matches.ts) plus the competition kind, which is applied to the loaded games. */
export interface ListFilter {
  sportId?: string;
  collegeId?: string;
  /** Favorites: the games of any of these colleges or of any of these sports. */
  collegeIds?: string[];
  sportIds?: string[];
  status?: StatusChoice;
  kind?: CompetitionKind;
}

export interface ListBounds {
  order: ListOrder;
  /** The list's start (oldest first); earlier games can be asked for. */
  from?: Date;
  /** The list's start (newest first). */
  to?: Date;
  status?: MatchStatus;
}

const endOfDay = (day: EasternDate) => new Date(easternMidnight(addDays(day, 1)).getTime() - 1);

/**
 * Where the list starts and which way it runs: from the anchor day on,
 * oldest first, with earlier games on request. Lists of finished games
 * (scored, not yet scored) run newest first from the end of the anchor day,
 * or from now, since nothing newer can exist.
 */
export function listBounds(filter: ListFilter, anchor: EasternDate, now: Date): ListBounds {
  switch (filter.status) {
    case "scored":
      return { order: "desc", to: endOfDay(anchor), status: "final" };
    case "unscored":
      return { order: "desc", to: new Date(Math.min(now.getTime(), endOfDay(anchor).getTime())), status: "scheduled" };
    case "upcoming":
      return { order: "asc", from: new Date(Math.max(now.getTime(), easternMidnight(anchor).getTime())), status: "scheduled" };
    case "cancelled":
      return { order: "asc", from: easternMidnight(anchor), status: "cancelled" };
    default:
      return { order: "asc", from: easternMidnight(anchor) };
  }
}

/** Whether a loaded game passes the filter (the Day view filters a whole season this way; the list only by kind). */
export function matchesFilter(game: Match, filter: ListFilter, competition: Competition, now: Date): boolean {
  if (filter.sportId && game.sportId !== filter.sportId) return false;
  if (filter.collegeId && !game.collegeIds.includes(filter.collegeId)) return false;
  if (filter.kind && competition.kind !== filter.kind) return false;
  if (filter.collegeIds || filter.sportIds) {
    const college = filter.collegeIds?.some((id) => game.collegeIds.includes(id)) ?? false;
    const sport = filter.sportIds?.includes(game.sportId) ?? false;
    if (!college && !sport) return false;
  }
  switch (filter.status) {
    case "scored":
      return game.status === "final";
    case "cancelled":
      return game.status === "cancelled";
    case "upcoming":
      return game.status === "scheduled" && new Date(game.startsAt) > now;
    case "unscored":
      return game.status === "scheduled" && new Date(game.startsAt) <= now;
    default:
      return true;
  }
}
