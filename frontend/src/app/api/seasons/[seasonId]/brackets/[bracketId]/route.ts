import { deleteBracketQuerySchema, type BracketDetail } from "@/lib/api/brackets";
import { ApiError, toJson } from "@/lib/api/core";
import { toMatch } from "@/lib/api/matches";
import { authorize, can, requireCurrentSeason } from "@/server/auth";
import { getBracket } from "@/server/data/brackets";
import { getMatches } from "@/server/data/matches";
import { noContent, ok, readQuery, route } from "@/server/http";
import { deleteBracket } from "@/server/services/brackets";

type Params = { seasonId: string; bracketId: string };

/** The bracket and its games in slot order (public). */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, bracketId } = await params;
  const bracket = await getBracket(seasonId, bracketId);
  if (!bracket) throw new ApiError("not-found", "No such bracket this season.");
  const matchIds = [...bracket.slots].sort((a, b) => a.slot - b.slot).flatMap((s) => (s.matchId ? [s.matchId] : []));
  const games = await getMatches(seasonId, matchIds);
  const matches = matchIds.flatMap((id) => {
    const game = games.get(id);
    return game ? [toMatch({ id, ...game })] : [];
  });
  return ok({ ...toJson(bracket), matches } satisfies BracketDetail);
});

/**
 * Deletes the bracket and its games, taking back their points (admin or
 * dev, current season; audit-logged). While games are scored: 409 with
 * their ids, unless ?force=true.
 */
export const DELETE = route<Params>(async (req, { params }) => {
  const { seasonId, bracketId } = await params;
  const viewer = await authorize(can.editSchedule);
  await requireCurrentSeason(seasonId);
  const { force } = readQuery(req, deleteBracketQuerySchema);
  const result = await deleteBracket(seasonId, bracketId, null, force, await viewer.actor());
  if (result.status === "not-found") throw new ApiError("not-found", "No such bracket this season.");
  if (result.status === "has-scored-matches") {
    throw new ApiError(
      "conflict",
      `The bracket has ${result.scoredMatchIds.length} scored game(s); deleting it takes back the points they earned.`,
      { scoredMatchIds: result.scoredMatchIds }
    );
  }
  return noContent();
});
