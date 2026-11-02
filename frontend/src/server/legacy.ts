// Today's API response shapes (types/api.ts, from the pre-v3 schema in
// types/legacy.ts), built from v3 docs, so the pages keep working unchanged
// (D35). Only the conversions several routes share live here; a route with
// its own shape builds it inline. The match conversion itself is pure and
// shared with the browser (lib/legacyMatch.ts). Goes away when the pages
// read v3 shapes.
import "server-only";
import { toLegacyMatch } from "@/lib/legacyMatch";
import type { MatchJson } from "@/types/api";
import type { MatchDoc, PlayerDoc, UserDoc, WithId } from "@/types/firestore";
import type { MatchDoc as LegacyMatch, UserDoc as LegacyUserDoc } from "@/types/legacy";
import { listBrackets } from "./data/brackets";
import { listRosters } from "./data/roster";
import { listSports } from "./data/sports";
import { mergedRoles } from "./services/roles";

/**
 * A season's games in the pre-v3 match shape, with their participants
 * (unless `participants: false`): loads the season's sport names,
 * tournaments and the games' rosters once.
 */
export async function legacyMatches(
  seasonId: string,
  games: WithId<MatchDoc>[],
  { participants = true } = {}
): Promise<LegacyMatch[]> {
  if (games.length === 0) return [];
  const [sports, tournaments, rosters] = await Promise.all([
    listSports(seasonId),
    listBrackets(seasonId, "tournament"),
    participants ? listRosters(seasonId, games.map((g) => g.id)) : null,
  ]);
  const sportName = new Map(sports.map((s) => [s.id, s.name]));
  const tournament = new Map(tournaments.map((t) => [t.id, { id: t.id, name: t.name }]));
  return games.map((g) =>
    toLegacyMatch(g.id, g, {
      sportName: sportName.get(g.sportId) ?? g.sportId,
      tournament: (g.bracketId && tournament.get(g.bracketId)) || null,
      roster: rosters?.get(g.id) ?? [],
    })
  );
}

/** As the match lists send a game: the pre-v3 match, its season and an ISO start. */
export async function matchListJson(games: WithId<MatchDoc>[]): Promise<MatchJson[]> {
  // Games of several seasons (past results): convert each season's together.
  const seasons = [...new Set(games.map((g) => g.seasonId))];
  const converted = new Map<WithId<MatchDoc>, LegacyMatch>();
  for (const seasonId of seasons) {
    const ofSeason = games.filter((g) => g.seasonId === seasonId);
    const legacy = await legacyMatches(seasonId, ofSeason);
    ofSeason.forEach((g, i) => converted.set(g, legacy[i]));
  }
  return games.map((g) => {
    const { id, timestamp, ...fields } = converted.get(g)!;
    return { id, seasonId: g.seasonId, ...fields, timestamp: timestamp.toDate().toISOString() };
  });
}

/**
 * A person as the pre-v3 user doc the rep and dev pages read: names, the
 * college's name, the merged roles and the sports they captain.
 */
export function legacyUser(
  email: string,
  user: UserDoc | undefined,
  player: PlayerDoc | undefined,
  collegeName: string | null,
  captainOf: string[]
): LegacyUserDoc {
  const [first = "", ...rest] = (player?.name ?? "").split(" ");
  return {
    email,
    firstname: user?.firstname ?? first,
    lastname: user?.lastname ?? rest.join(" "),
    college: collegeName,
    username: user?.username,
    mRoles: mergedRoles(user ?? null, player ?? null, captainOf.length > 0),
    sportsCaptainOf: captainOf,
  };
}

