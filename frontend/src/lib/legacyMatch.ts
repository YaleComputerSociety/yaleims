// The pre-v3 match and bracket shapes (types/legacy.ts), built from v3 docs.
// The match routes answer in them and the bracket and tournament pages render
// them, so the pages work unchanged (D35). Pure: the server
// (server/legacy.ts) and the browser pages both use it. Goes away when the
// pages read v3 shapes.
import type { BracketDoc, BracketSlot, MatchDoc, RosterEntryDoc, StoredTimestamp } from "../types/firestore";
import type { BracketEntry, MatchDoc as LegacyMatch, MatchParticipant } from "../types/legacy";

/** What converting a game needs besides its doc. */
export interface LegacyMatchContext {
  sportName: string;
  /** The tournament the game belongs to, if it is a tournament game. */
  tournament: { id: string; name: string } | null;
  /** The game's roster entries (omit when the caller doesn't need participants). */
  roster?: RosterEntryDoc[];
}

/** A migrated game keeps its number as its id; newer games have string auto ids. */
export function legacyMatchId(matchId: string): number | string {
  return /^\d+$/.test(matchId) ? Number(matchId) : matchId;
}

/** The pre-v3 key of a bracket's bye slot (byes have no game). */
export const byeKey = (slot: number) => `bye-${slot}`;

/** A v3 game in the pre-v3 match shape. */
export function toLegacyMatch(matchId: string, m: MatchDoc, ctx: LegacyMatchContext): LegacyMatch {
  const home = m.homeCollegeId ?? "TBD";
  const away = m.awayCollegeId ?? "TBD";
  const participants = (collegeId: string | null): MatchParticipant[] =>
    (ctx.roster ?? [])
      .filter((e) => collegeId !== null && e.collegeId === collegeId && e.captainStatus !== "removed")
      .map((e) => ({ email: e.playerId, name: e.name }));
  const winners = { home, away, draw: "Draw", double_forfeit: "Default" } as const;

  const match: LegacyMatch = {
    id: legacyMatchId(matchId),
    sport: ctx.sportName,
    type: m.stage === "regular" ? "Regular" : (m.round ?? "Playoff"),
    home_college: home,
    away_college: away,
    home_college_score: m.result?.homeScore ?? null,
    away_college_score: m.result?.awayScore ?? null,
    home_college_participants: participants(m.homeCollegeId),
    away_college_participants: participants(m.awayCollegeId),
    winner: m.result ? winners[m.result.outcome] : null,
    forfeit: m.result ? m.result.forfeit : null,
    timestamp: m.startsAt,
    location: m.venue ?? "",
    location_extra: m.venueDetail ?? "",
  };
  if (m.stage === "playoff") {
    match.division = m.division ?? "none";
    match.home_seed = m.homeSeed;
    match.away_seed = m.awaySeed;
    match.next_match_id = m.nextMatchId ? legacyMatchId(m.nextMatchId) : "";
    if (m.bracketSlot !== null) match.playoff_bracket_slot = m.bracketSlot;
  }
  if (ctx.tournament) {
    match.next_match_loser_id = m.nextLoserMatchId ? legacyMatchId(m.nextLoserMatchId) : "";
    match.tournament_id = ctx.tournament.id;
    match.tournament_name = ctx.tournament.name;
  }
  return match;
}

/** A bracket's bye slot as the pre-v3 "Bye" match (the college on both sides, and the winner). */
export function toLegacyBye(
  slot: BracketSlot,
  bracket: BracketDoc,
  ctx: { sportName: string; tournamentId: string | null; time: StoredTimestamp }
): LegacyMatch {
  const college = slot.byeCollegeId ?? "TBD";
  return {
    id: byeKey(slot.slot),
    sport: ctx.sportName,
    type: "Bye",
    home_college: college,
    away_college: college,
    home_college_score: null,
    away_college_score: null,
    home_college_participants: [],
    away_college_participants: [],
    winner: slot.byeCollegeId,
    forfeit: false,
    timestamp: ctx.time,
    location: "",
    location_extra: "Bye",
    playoff_bracket_slot: slot.slot,
    ...(ctx.tournamentId ? { tournament_id: ctx.tournamentId, tournament_name: bracket.name } : {}),
  };
}

/**
 * A bracket's slots in the pre-v3 shape, by slot: each game's id and start;
 * a bye's key and the bracket's first start (a bye has no time of its own).
 */
export function toLegacySlots(
  bracket: BracketDoc,
  startsAt: (matchId: string) => StoredTimestamp | undefined
): BracketEntry[] {
  const first = firstStart(bracket, startsAt);
  return [...bracket.slots]
    .sort((a, b) => a.slot - b.slot)
    .map((s) => ({
      bracket_placement: s.slot,
      round: s.round,
      match_id: s.matchId ? legacyMatchId(s.matchId) : byeKey(s.slot),
      timestamp: (s.matchId && startsAt(s.matchId)) || first!,
    }));
}

/** The earliest start of a bracket's games (the time shown on its byes). */
export function firstStart(
  bracket: BracketDoc,
  startsAt: (matchId: string) => StoredTimestamp | undefined
): StoredTimestamp | undefined {
  const starts = bracket.slots
    .map((s) => (s.matchId ? startsAt(s.matchId) : undefined))
    .filter((t): t is StoredTimestamp => !!t);
  return starts.sort((a, b) => a.toMillis() - b.toMillis())[0];
}
