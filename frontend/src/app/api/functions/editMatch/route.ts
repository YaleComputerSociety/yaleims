import { getYearFromTimestamp } from "@/utils/helpers";
import { actorOf } from "@/server/data/auditLog";
import type { MatchEdit } from "@/lib/api/matches";
import { findSportByName } from "@/server/data/sports";
import { editMatch, type EditResult } from "@/server/services/schedule";
import { getSession, hasAnyRole } from "@/server/session";

const json = (status: number, body: object) => new Response(JSON.stringify(body), { status });

const REFUSALS: Record<Exclude<EditResult, "ok">, [number, string]> = {
  "not-found": [404, "Match not found in that season"],
  scored: [409, "A scored match's colleges and sport can't change; undo the score first"],
  "unknown-sport": [400, "Unknown sport"],
  "unknown-college": [400, "Unknown college"],
  "bad-time": [400, "Invalid timestamp"],
};

/**
 * { id, seasonId, home_college, away_college, location, location_extra,
 * timestamp (ISO), sport }: edits a game (admin/dev; audit-logged). Other
 * fields are ignored.
 */
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !hasAnyRole(session, ["admin", "dev"])) {
      return json(403, { error: "unauthorized" });
    }

    const { id, seasonId, home_college, away_college, location, location_extra, timestamp, sport } =
      await req.json();
    const matchId = String(id);
    if (!matchId || matchId === "undefined" || matchId === "null") {
      return json(400, { error: "Missing matchId" });
    }

    // The season the game lives in. Falling back to the timestamp would look
    // in another season whenever a game is moved across the season boundary,
    // so an explicit seasonId wins.
    const year =
      typeof seasonId === "string" && /^\d{4}-\d{4}$/.test(seasonId)
        ? seasonId
        : getYearFromTimestamp(timestamp);
    if (!year) {
      return json(400, { error: "Error calculating year" });
    }

    // The old form names the sport and the fields the pre-v3 way.
    const sportId = sport ? (await findSportByName(year, String(sport)))?.id : undefined;
    const edit = {
      homeCollegeId: home_college,
      awayCollegeId: away_college,
      venue: location,
      venueDetail: location_extra,
      startsAt: timestamp,
      sportId,
    } as MatchEdit;
    const result =
      sport && !sportId ? "unknown-sport" : await editMatch(year, matchId, edit, actorOf(session));
    if (result !== "ok") {
      const [status, error] = REFUSALS[result];
      return json(status, { error });
    }
    return json(200, { success: true });
  } catch (err: any) {
    return json(500, { error: err.message });
  }
}
