import { ApiError } from "@/lib/api/core";
import { rosterChangeSchema } from "@/lib/api/roster";
import { authorize, can, requireViewer, type Viewer } from "@/server/auth";
import { getMatch } from "@/server/data/matches";
import { getPlayer } from "@/server/data/players";
import { getRosterEntry } from "@/server/data/roster";
import { noContent, readBody, route } from "@/server/http";
import { addPlayer, changeEntry, type AddResult, type SheetEditor } from "@/server/services/roster";

type Params = { seasonId: string; matchId: string; playerId: string };

const NO_MATCH = new ApiError("not-found", "No such game this season.");
const STARTED = new ApiError("conflict", "The game has started: only a supervisor can change its roster now.");

/** The caller as an editor of `collegeId`'s side of `sportId`'s game: a supervisor, or that team's captain (403 otherwise). */
async function editorOf(viewer: Viewer, collegeId: string, sportId: string): Promise<SheetEditor> {
  await authorize(can.manageRoster, collegeId, sportId);
  return { supervisor: await can.takeAttendance(viewer), actor: await viewer.actor() };
}

/**
 * Changes one player's entry: the captain's call (confirmed, removed, or
 * null to take it back) until the start; attendance (supervisors, any time).
 */
export const PATCH = route<Params>(async (req, { params }) => {
  const { seasonId, matchId, playerId } = await params;
  const viewer = await requireViewer();
  const change = await readBody(req, rosterChangeSchema);
  const [match, entry] = await Promise.all([getMatch(seasonId, matchId), getRosterEntry(seasonId, matchId, playerId)]);
  if (!match) throw NO_MATCH;
  if (!entry) throw new ApiError("not-found", "They aren't on this game.");
  const editor = await editorOf(viewer, entry.collegeId, match.sportId);
  if (change.present !== undefined && !editor.supervisor) {
    throw new ApiError("forbidden", "Only a supervisor takes attendance.");
  }
  const result = await changeEntry(seasonId, matchId, playerId, change, editor);
  if (result === "no-match") throw NO_MATCH;
  if (result === "no-entry") throw new ApiError("not-found", "They aren't on this game.");
  if (result === "started") throw STARTED;
  return noContent();
});

const ADD_REFUSALS: Record<Exclude<AddResult, "ok">, ApiError> = {
  "no-match": NO_MATCH,
  "not-in-season": new ApiError("not-found", "They aren't a player this season."),
  "other-college": new ApiError("conflict", "Their college doesn't play in this game."),
  started: STARTED,
};

/**
 * Puts a season player on the game, on their college's side: a captain's
 * addition is confirmed (until the start), a supervisor's present.
 */
export const PUT = route<Params>(async (req, { params }) => {
  const { seasonId, matchId, playerId } = await params;
  const viewer = await requireViewer();
  const [match, player] = await Promise.all([getMatch(seasonId, matchId), getPlayer(seasonId, playerId)]);
  if (!match) throw NO_MATCH;
  if (!player) throw ADD_REFUSALS["not-in-season"];
  if (!player.collegeId || !match.collegeIds.includes(player.collegeId)) throw ADD_REFUSALS["other-college"];
  const editor = await editorOf(viewer, player.collegeId, match.sportId);
  const result = await addPlayer(seasonId, matchId, playerId, editor);
  if (result !== "ok") throw ADD_REFUSALS[result];
  return noContent();
});
