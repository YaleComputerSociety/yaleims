// A game's scoresheet from what the app knows when it's printed: each side's
// players on the roster sheet (those taken off left out), its record in the
// sport this season (counted from the sport's scored games, as scoring
// counts them), and when and where. The roster sheet with both sides is a
// supervisor's (GET …/roster/sheet).
import { fetchSeasonMatches, type Match } from "@/lib/api/matches";
import { fetchRosterSheet, type RosterSheet } from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";
import { placeholderNetid } from "@/lib/netid";
import { teamDeltas } from "@/lib/results";
import type { Game, Player, Team, TeamRecord } from "./types";

/** Each college's wins, losses (forfeited games among them) and ties in `games`. */
function recordsOf(games: Match[]): Map<string, TeamRecord> {
  const records = new Map<string, TeamRecord>();
  for (const game of games) {
    if (!game.result || !game.homeCollegeId || !game.awayCollegeId) continue;
    for (const [collegeId, delta] of Object.entries(teamDeltas(game.homeCollegeId, game.awayCollegeId, game.result))) {
      const record = records.get(collegeId) ?? { wins: 0, losses: 0, ties: 0 };
      records.set(collegeId, {
        wins: record.wins + (delta.wins ?? 0),
        losses: record.losses + (delta.losses ?? 0) + (delta.forfeits ?? 0),
        ties: record.ties + (delta.ties ?? 0),
      });
    }
  }
  return records;
}

/** The side's players by name; the ID # is their NetID (or the one a placeholder account holds), blank when none is known. */
function playersOf(sheet: RosterSheet, collegeId: string): Player[] {
  return sheet.items
    .filter((entry) => entry.collegeId === collegeId && entry.captainStatus !== "removed")
    .map((entry) => ({ netId: entry.netid ?? placeholderNetid(entry.playerId) ?? "", name: entry.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function scoresheetOf(match: Match, sportName: string): Promise<Game> {
  const [sheet, scored] = await Promise.all([
    // A bracket game waiting for both its teams has no sides to read.
    match.collegeIds.length > 0 ? fetchRosterSheet(match.seasonId, match.id) : null,
    fetchSeasonMatches(match.seasonId, { sportId: match.sportId, status: "final" }),
  ]);
  const records = recordsOf(scored.items);
  const side = (collegeId: string | null): Team =>
    collegeId
      ? {
          name: collegeName(collegeId) ?? collegeId,
          record: records.get(collegeId) ?? { wins: 0, losses: 0, ties: 0 },
          players: sheet ? playersOf(sheet, collegeId) : [],
        }
      : { name: "TBD", players: [] };
  return {
    sport: sportName,
    startsAt: match.startsAt,
    location: [match.venue, match.venueDetail].filter(Boolean).join(" · ") || "TBD",
    home: side(match.homeCollegeId),
    away: side(match.awayCollegeId),
  };
}
